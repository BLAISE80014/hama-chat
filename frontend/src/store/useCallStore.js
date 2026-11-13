import { create } from 'zustand'
import { toast } from 'react-hot-toast'
import { useAuthStore } from './useAuthStore'

const peerConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

let peerConnection = null
let localMedia = null
let remoteMedia = null
let signalingSocket = null
let signalingHandlers = null
let pendingLocalCandidates = []
let pendingRemoteCandidates = []
let pendingAcceptedCall = null
let disconnectedTimer = null
let callEpoch = 0

const requestMedia = (callType) => {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Calls require a secure connection and a browser with media support')
  }

  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: callType === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
  })
}

const mediaErrorMessage = (error, callType) => {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
    return `Allow ${callType === 'video' ? 'camera and microphone' : 'microphone'} access to place the call`
  }
  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
    return `No ${callType === 'video' ? 'camera or microphone' : 'microphone'} was found`
  }
  if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
    return `Your ${callType === 'video' ? 'camera or microphone' : 'microphone'} is already in use`
  }
  return error?.message || 'Could not access your microphone or camera'
}

const requestAcknowledgement = (socket, eventName, payload, timeoutMs = 12_000) =>
  new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error('Connection lost. Please reconnect and try again.'))
      return
    }

    const timer = setTimeout(() => reject(new Error('The call server did not respond')), timeoutMs)
    socket.emit(eventName, payload, (response) => {
      clearTimeout(timer)
      resolve(response)
    })
  })

const sendCandidate = (socket, callId, candidate) => {
  if (callId) {
    socket.emit('iceCandidate', { callId, candidate })
  } else {
    pendingLocalCandidates.push(candidate)
  }
}

const flushLocalCandidates = (socket, callId) => {
  const candidates = pendingLocalCandidates
  pendingLocalCandidates = []
  candidates.forEach((candidate) => {
    socket.emit('iceCandidate', { callId, candidate })
  })
}

const flushRemoteCandidates = async (callId) => {
  if (!peerConnection?.remoteDescription) return

  const candidates = pendingRemoteCandidates.filter((item) => item.callId === callId)
  pendingRemoteCandidates = pendingRemoteCandidates.filter((item) => item.callId !== callId)
  for (const { candidate } of candidates) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (error) {
      console.error('Could not apply a remote ICE candidate:', error)
    }
  }
}

const closeMedia = () => {
  clearTimeout(disconnectedTimer)
  disconnectedTimer = null

  if (peerConnection) {
    peerConnection.onicecandidate = null
    peerConnection.ontrack = null
    peerConnection.onconnectionstatechange = null
    peerConnection.close()
    peerConnection = null
  }

  localMedia?.getTracks().forEach((track) => track.stop())
  localMedia = null
  remoteMedia = null
  pendingLocalCandidates = []
  pendingRemoteCandidates = []
  pendingAcceptedCall = null
}

const clearCall = (set) => {
  callEpoch += 1
  closeMedia()
  set({
    call: null,
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isCameraOff: false,
  })
}

const createPeerConnection = (socket, get, set, callId) => {
  const connection = new RTCPeerConnection(peerConfiguration)
  peerConnection = connection

  localMedia.getTracks().forEach((track) => connection.addTrack(track, localMedia))

  connection.ontrack = (event) => {
    if (peerConnection !== connection) return
    if (!remoteMedia) remoteMedia = new MediaStream()
    const incomingTracks = event.streams[0]?.getTracks() || [event.track]
    incomingTracks.forEach((track) => {
      if (!remoteMedia.getTracks().some((existingTrack) => existingTrack.id === track.id)) {
        remoteMedia.addTrack(track)
      }
    })
    set({ remoteStream: new MediaStream(remoteMedia.getTracks()) })
  }

  connection.onicecandidate = (event) => {
    if (event.candidate && peerConnection === connection) {
      const currentCallId = get().call?.callId || callId
      sendCandidate(socket, currentCallId, event.candidate.toJSON())
    }
  }

  connection.onconnectionstatechange = () => {
    if (peerConnection !== connection) return

    if (connection.connectionState === 'connected') {
      clearTimeout(disconnectedTimer)
      disconnectedTimer = null
      set((state) => ({
        call: state.call
          ? {
              ...state.call,
              phase: 'connected',
              connectedAt: state.call.connectedAt || Date.now(),
            }
          : null,
      }))
    } else if (connection.connectionState === 'disconnected') {
      clearTimeout(disconnectedTimer)
      disconnectedTimer = setTimeout(() => {
        if (peerConnection === connection && connection.connectionState === 'disconnected') {
          toast.error('The call connection was lost')
          get().endCall()
        }
      }, 10_000)
    } else if (connection.connectionState === 'failed') {
      toast.error('Could not connect the call. Check your network and try again.')
      get().endCall()
    }
  }

  return connection
}

const applyAcceptedCall = async (callId, answer, get, set) => {
  const call = get().call
  if (!call || call.direction !== 'outgoing' || !peerConnection) return
  if (call.callId && call.callId !== callId) return

  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
    if (get().call?.callId !== callId || !peerConnection) return
    await flushRemoteCandidates(callId)
    set((state) => ({
      call: state.call?.callId === callId
        ? state.call.phase === 'connected' ? state.call : { ...state.call, phase: 'connecting' }
        : state.call,
    }))
  } catch (error) {
    console.error('Could not apply the call answer:', error)
    toast.error('Could not connect the call')
    get().endCall()
  }
}

const applyRemoteCandidate = async ({ callId, candidate }, get) => {
  const call = get().call
  if (!call || (call.callId && call.callId !== callId)) return

  if (!call.callId || !peerConnection?.remoteDescription) {
    pendingRemoteCandidates.push({ callId, candidate })
    return
  }

  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
  } catch (error) {
    console.error('Could not apply a remote ICE candidate:', error)
  }
}

export const useCallStore = create((set, get) => ({
  call: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isCameraOff: false,

  startCallSignaling: (socket) => {
    if (!socket) return () => {}

    if (signalingSocket && signalingSocket !== socket && signalingHandlers) {
      Object.entries(signalingHandlers).forEach(([eventName, handler]) => {
        signalingSocket.off(eventName, handler)
      })
    }

    if (signalingSocket !== socket || !signalingHandlers) {
      signalingSocket = socket

      signalingHandlers = {
        incomingCall: (data) => {
          if (!data?.callId || !data?.caller?._id || !data?.offer?.sdp) return
          if (get().call) {
            socket.emit('rejectCall', { callId: data.callId })
            return
          }

          set({
            call: {
              callId: data.callId,
              peer: data.caller,
              callType: data.callType,
              direction: 'incoming',
              phase: 'ringing',
              offer: data.offer,
            },
          })
        },
        callAccepted: ({ callId, answer } = {}) => {
          if (!callId || !answer) return
          const call = get().call
          if (call?.direction !== 'outgoing') return
          if (!call.callId) {
            pendingAcceptedCall = { callId, answer }
            return
          }
          if (call.callId === callId) void applyAcceptedCall(callId, answer, get, set)
        },
        callRejected: ({ callId, reason } = {}) => {
          const call = get().call
          if (!call || (call.callId && call.callId !== callId)) return
          toast(reason === 'rejected' ? 'Call declined' : 'The user is unavailable')
          clearCall(set)
        },
        iceCandidate: (data) => {
          void applyRemoteCandidate(data, get)
        },
        callEnded: ({ callId, reason } = {}) => {
          const call = get().call
          if (!call || (call.callId && call.callId !== callId)) return
          if (reason === 'timeout') toast(call.direction === 'incoming' ? 'Missed call' : 'No answer')
          else if (reason === 'disconnected') toast('The other user disconnected')
          clearCall(set)
        },
        disconnect: () => {
          if (!get().call) return
          toast.error('The call ended because the signaling connection was lost')
          clearCall(set)
        },
      }

      Object.entries(signalingHandlers).forEach(([eventName, handler]) => {
        socket.on(eventName, handler)
      })
    }

    return () => {
      if (signalingSocket !== socket) return
      if (signalingHandlers) {
        Object.entries(signalingHandlers).forEach(([eventName, handler]) => {
          socket.off(eventName, handler)
        })
      }
      signalingSocket = null
      signalingHandlers = null
      if (get().call) get().endCall()
    }
  },

  startCall: async (peer, callType) => {
    const { authUser, socket } = useAuthStore.getState()
    if (!authUser?._id) {
      toast.error('Sign in before starting a call')
      return
    }
    if (!socket?.connected) {
      toast.error('Connect to Hama Chat before starting a call')
      return
    }
    if (!peer?._id || !['audio', 'video'].includes(callType)) {
      toast.error('Select a contact to call')
      return
    }
    if (get().call) {
      toast.error('Finish the current call before starting another')
      return
    }

    const epoch = ++callEpoch
    set({
      call: { callId: null, peer, callType, direction: 'outgoing', phase: 'requesting' },
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isCameraOff: false,
    })

    try {
      localMedia = await requestMedia(callType)
      if (epoch !== callEpoch) {
        localMedia.getTracks().forEach((track) => track.stop())
        localMedia = null
        return
      }
      set({ localStream: localMedia })

      const connection = createPeerConnection(socket, get, set, null)
      const offer = await connection.createOffer()
      await connection.setLocalDescription(offer)
      set((state) => state.call ? { call: { ...state.call, phase: 'calling' } } : state)

      const response = await requestAcknowledgement(socket, 'callUser', {
        receiverId: String(peer._id),
        callType,
        offer: connection.localDescription.toJSON(),
      })
      if (epoch !== callEpoch) {
        if (response?.success && response.callId && socket.connected) {
          socket.emit('endCall', { callId: response.callId })
        }
        return
      }
      if (!response?.success || !response.callId) {
        throw new Error(response?.message || 'Could not start the call')
      }

      set((state) => state.call
        ? { call: { ...state.call, callId: response.callId, phase: 'ringing' } }
        : state)
      flushLocalCandidates(socket, response.callId)

      if (pendingAcceptedCall?.callId === response.callId) {
        const answer = pendingAcceptedCall.answer
        pendingAcceptedCall = null
        await applyAcceptedCall(response.callId, answer, get, set)
      }
      await flushRemoteCandidates(response.callId)
    } catch (error) {
      if (epoch !== callEpoch) return
      console.error('Could not start the call:', error)
      clearCall(set)
      toast.error(mediaErrorMessage(error, callType))
    }
  },

  acceptCall: async () => {
    const { call } = get()
    const { socket } = useAuthStore.getState()
    if (!call || call.direction !== 'incoming' || !call.offer) return
    if (!socket?.connected) {
      toast.error('Connection lost. Please reconnect and try again.')
      clearCall(set)
      return
    }

    const epoch = ++callEpoch
    set((state) => state.call ? { call: { ...state.call, phase: 'requesting' } } : state)

    try {
      localMedia = await requestMedia(call.callType)
      if (epoch !== callEpoch) {
        localMedia.getTracks().forEach((track) => track.stop())
        localMedia = null
        return
      }
      set({ localStream: localMedia })

      const connection = createPeerConnection(socket, get, set, call.callId)
      await connection.setRemoteDescription(new RTCSessionDescription(call.offer))
      await flushRemoteCandidates(call.callId)
      const answer = await connection.createAnswer()
      await connection.setLocalDescription(answer)

      const response = await requestAcknowledgement(socket, 'acceptCall', {
        callId: call.callId,
        answer: connection.localDescription.toJSON(),
      })
      if (epoch !== callEpoch) return
      if (!response?.success) {
        throw new Error(response?.message || 'Could not accept the call')
      }

      set((state) => state.call
        ? {
            call: state.call.phase === 'connected'
              ? state.call
              : { ...state.call, phase: 'connecting' },
          }
        : state)
      flushLocalCandidates(socket, call.callId)
    } catch (error) {
      if (epoch !== callEpoch) return
      console.error('Could not accept the call:', error)
      if (socket.connected) {
        socket.emit('rejectCall', { callId: call.callId })
      }
      clearCall(set)
      toast.error(mediaErrorMessage(error, call.callType))
    }
  },

  rejectCall: () => {
    const { call } = get()
    const { socket } = useAuthStore.getState()
    if (call?.callId && socket?.connected) {
      socket.emit('rejectCall', { callId: call.callId })
    }
    clearCall(set)
  },

  endCall: () => {
    const { call } = get()
    const { socket } = useAuthStore.getState()
    if (call?.callId && socket?.connected) {
      socket.emit('endCall', { callId: call.callId })
    }
    clearCall(set)
  },

  toggleMute: () => {
    const nextMuted = !get().isMuted
    localMedia?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted
    })
    set({ isMuted: nextMuted })
  },

  toggleCamera: () => {
    const nextCameraOff = !get().isCameraOff
    localMedia?.getVideoTracks().forEach((track) => {
      track.enabled = !nextCameraOff
    })
    set({ isCameraOff: nextCameraOff })
  },
}))
