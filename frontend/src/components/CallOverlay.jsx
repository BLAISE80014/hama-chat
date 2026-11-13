import { useEffect, useRef, useState } from 'react'
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
} from 'lucide-react'
import { useCallStore } from '../store/useCallStore'
import { useAuthStore } from '../store/useAuthStore'

const formatDuration = (milliseconds) => {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

const CallOverlay = () => {
  const call = useCallStore((state) => state.call)
  const localStream = useCallStore((state) => state.localStream)
  const remoteStream = useCallStore((state) => state.remoteStream)
  const isMuted = useCallStore((state) => state.isMuted)
  const isCameraOff = useCallStore((state) => state.isCameraOff)
  const startCallSignaling = useCallStore((state) => state.startCallSignaling)
  const acceptCall = useCallStore((state) => state.acceptCall)
  const rejectCall = useCallStore((state) => state.rejectCall)
  const endCall = useCallStore((state) => state.endCall)
  const toggleMute = useCallStore((state) => state.toggleMute)
  const toggleCamera = useCallStore((state) => state.toggleCamera)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const [now, setNow] = useState(0)
  const [playbackBlocked, setPlaybackBlocked] = useState(false)
  const authSocket = useAuthStore((state) => state.socket)

  useEffect(() => {
    if (!authSocket) return undefined
    return startCallSignaling(authSocket)
  }, [authSocket, startCallSignaling])

  useEffect(() => {
    if (!call?.connectedAt) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [call?.connectedAt])

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream
    }
    const mediaElement = call?.callType === 'video' ? remoteVideoRef.current : remoteAudioRef.current
    if (remoteStream && mediaElement) {
      mediaElement.play()
        .then(() => setPlaybackBlocked(false))
        .catch(() => setPlaybackBlocked(true))
    }
  }, [call?.callType, remoteStream])

  if (!call) return null

  const isIncoming = call.direction === 'incoming'
  const isVideo = call.callType === 'video'
  const hasRemoteVideo = Boolean(remoteStream?.getVideoTracks().some((track) => track.readyState === 'live'))
  const duration = call.connectedAt ? formatDuration(Math.max(0, now - call.connectedAt)) : null
  const statusText = call.phase === 'requesting'
    ? 'Waiting for media permission...'
    : call.phase === 'connected'
      ? duration
      : isIncoming && call.phase === 'ringing'
        ? `Incoming ${isVideo ? 'video' : 'voice'} call`
        : call.phase === 'calling' || (!isIncoming && call.phase === 'ringing')
          ? 'Calling...'
          : 'Connecting...'

  return (
    <div className={`hama-call-overlay ${isVideo ? 'hama-call-overlay--video' : ''}`} role="dialog" aria-modal="true" aria-label={`${isVideo ? 'Video' : 'Voice'} call with ${call.peer?.fullName || 'contact'}`}>
      <section className="hama-call-card">
        {isVideo && (
          <div className="hama-call-stage">
            {hasRemoteVideo ? (
              <video ref={remoteVideoRef} className="hama-call-remote-video" autoPlay playsInline />
            ) : (
              <div className="hama-call-video-placeholder">
                <img src={call.peer?.profilepic || '/avatar.jpg'} alt="" />
                <span>{call.peer?.fullName}</span>
              </div>
            )}
            {localStream && (
              <div className="hama-call-local-preview">
                <video ref={localVideoRef} autoPlay muted playsInline />
                {isCameraOff && <span>Camera off</span>}
              </div>
            )}
          </div>
        )}

        <div className="hama-call-person">
          {!isVideo && (
            <img src={call.peer?.profilepic || '/avatar.jpg'} alt="" />
          )}
          <div>
            <h2>{call.peer?.fullName || 'Hama Chat contact'}</h2>
            <p>{statusText}</p>
          </div>
        </div>

        {remoteStream && !isVideo && (
          <audio ref={remoteAudioRef} autoPlay />
        )}
        {playbackBlocked && remoteStream && (
          <button
            type="button"
            className="hama-call-enable-audio"
            onClick={() => {
              const mediaElement = isVideo ? remoteVideoRef.current : remoteAudioRef.current
              mediaElement?.play()
                .then(() => setPlaybackBlocked(false))
                .catch((error) => console.error('Remote audio playback failed:', error))
            }}
          >
            Tap to enable call audio
          </button>
        )}

        <div className="hama-call-controls">
          {isIncoming && call.phase === 'ringing' ? (
            <>
              <button
                type="button"
                className="hama-call-control hama-call-control--accept"
                onClick={acceptCall}
                aria-label="Accept call"
                title="Accept call"
              >
                <Phone size={21} />
              </button>
              <button
                type="button"
                className="hama-call-control hama-call-control--end"
                onClick={rejectCall}
                aria-label="Reject call"
                title="Reject call"
              >
                <PhoneOff size={21} />
              </button>
            </>
          ) : (
            <>
              {localStream && (
                <button
                  type="button"
                  className={`hama-call-control ${isMuted ? 'is-off' : ''}`}
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              )}
              {isVideo && localStream && (
                <button
                  type="button"
                  className={`hama-call-control ${isCameraOff ? 'is-off' : ''}`}
                  onClick={toggleCamera}
                  aria-label={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
                  title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
                >
                  {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
                </button>
              )}
              <button
                type="button"
                className="hama-call-control hama-call-control--end"
                onClick={endCall}
                aria-label="End call"
                title="End call"
              >
                <PhoneOff size={21} />
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

export default CallOverlay
