import { FileText, Mic, Paperclip, Send, Shield, Smile, StopCircle, Trash2, XIcon } from 'lucide-react'
import React, { Suspense, lazy, useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { useChatStore } from '../store/useChatStore';
import toast from 'react-hot-toast';
import useWindowSize from '../hooks/useWindowSize';
import { useAuthStore } from '../store/useAuthStore';
import { insertAtSelection } from '../lib/insertAtSelection';

const EmojiPicker = lazy(() => import('emoji-picker-react'))
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024
const SUPPORTED_MEDIA_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/aac',
    'application/pdf', 'application/msword', 'application/rtf', 'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip', 'application/x-zip-compressed',
])
const SUPPORTED_DOCUMENT_TYPES = new Set([
    'application/pdf', 'application/msword', 'application/rtf', 'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`
}

const readBlobAsDataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
        if (typeof reader.result !== 'string') {
            reject(new Error('Could not read the voice recording'))
            return
        }
        const separatorIndex = reader.result.indexOf(',')
        if (separatorIndex < 0) {
            reject(new Error('Could not read the voice recording'))
            return
        }
        const base64 = reader.result.slice(separatorIndex + 1)
        const mimeType = blob.type.split(';')[0] || 'audio/webm'
        resolve(`data:${mimeType};base64,${base64}`)
    }
    reader.onerror = () => reject(new Error('Could not read the voice recording'))
    reader.readAsDataURL(blob)
})

const MessageInput = () => {

    const { sendMessage } = useChatStore();
    const { blockedUsers, socket } = useAuthStore();
    const { selectedUser } = useChatStore();
    const isBlocked = blockedUsers.includes(selectedUser?._id);
    const { isMobile } = useWindowSize();

    const [text, setText] = useState("");
    const [attachment, setAttachment] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [recordingState, setRecordingState] = useState('idle');
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [voicePreview, setVoicePreview] = useState(null);
    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);
    const inputRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const caretRef = useRef({ start: 0, end: 0 });
    const pendingCaretRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordingStreamRef = useRef(null);
    const recordingChunksRef = useRef([]);
    const recordingStartRef = useRef(0);
    const recordingTimerRef = useRef(null);
    const discardRecordingRef = useRef(false);
    const recordingRequestRef = useRef(0);

const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
    }

    if (isTypingRef.current && socket?.connected && selectedUser?._id) {
        socket.emit("stopTyping", {
            receiverId: String(selectedUser._id),
        });
    }

    isTypingRef.current = false;
}, [socket, selectedUser]);

const updateTyping = (value) => {
    if (value.trim() && socket?.connected && selectedUser?._id) {
        if (!isTypingRef.current) {
            socket.emit("typing", {
                receiverId: String(selectedUser._id),
            });
            isTypingRef.current = true;
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            stopTyping();
        }, 1500);
    } else if (!value.trim()) {
        stopTyping();
    }
};

const handleTextChange = (e) => {
    const value = e.currentTarget.value;
    caretRef.current = {
        start: e.currentTarget.selectionStart ?? value.length,
        end: e.currentTarget.selectionEnd ?? value.length,
    };
    setText(value);
    updateTyping(value);
};

const handleEmojiClick = ({ emoji }) => {
    const { text: nextText, caret: nextCaret } = insertAtSelection(text, emoji, caretRef.current);

    caretRef.current = { start: nextCaret, end: nextCaret };
    pendingCaretRef.current = nextCaret;
    setText(nextText);
    updateTyping(nextText);
    setShowEmojiPicker(false);
};

useLayoutEffect(() => {
    if (pendingCaretRef.current === null) return;
    const caret = pendingCaretRef.current;
    pendingCaretRef.current = null;
    inputRef.current?.focus();
    inputRef.current?.setSelectionRange(caret, caret);
}, [text]);

useEffect(() => {
    if (!showEmojiPicker) return undefined;

    const handleOutsidePointerDown = (event) => {
        if (!emojiPickerRef.current?.contains(event.target)) {
            setShowEmojiPicker(false);
        }
    };
    const handleEscape = (event) => {
        if (event.key === 'Escape') setShowEmojiPicker(false);
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
        document.removeEventListener('pointerdown', handleOutsidePointerDown);
        document.removeEventListener('keydown', handleEscape);
    };
}, [showEmojiPicker]);

useEffect(() => {
    return () => {
        stopTyping();
        clearInterval(recordingTimerRef.current);
        discardRecordingRef.current = true;
        recordingRequestRef.current += 1;
        const recorder = mediaRecorderRef.current;
        if (recorder?.state === 'recording') recorder.stop();
        recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
}, [stopTyping]);

    const FileInputRef = useRef(null);
    const componentMountedRef = useRef(true);
    const [isSendingVoice, setIsSendingVoice] = useState(false);

useEffect(() => {
    componentMountedRef.current = true;
    return () => {
        componentMountedRef.current = false;
    };
}, []);

useEffect(() => {
    return () => {
        if (voicePreview?.url) URL.revokeObjectURL(voicePreview.url);
    };
}, [voicePreview?.url]);

const releaseRecordingStream = () => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    mediaRecorderRef.current = null;
    clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
};

const stopRecording = (discard = false) => {
    discardRecordingRef.current = discard;
    if (recordingState === 'requesting') {
        recordingRequestRef.current += 1;
        setRecordingState('idle');
        return;
    }
    clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === 'recording') {
        setRecordingState('processing');
        recorder.stop();
    } else {
        releaseRecordingStream();
        setRecordingState('idle');
        if (discard) setRecordingDuration(0);
    }
};

const startRecording = async () => {
    if (recordingState !== 'idle' || attachment || typeof MediaRecorder === 'undefined') {
        if (typeof MediaRecorder === 'undefined') toast.error('Voice recording is not supported in this browser');
        return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
        toast.error('Microphone access requires a secure connection');
        return;
    }

    setRecordingState('requesting');
    const requestId = ++recordingRequestRef.current;
    discardRecordingRef.current = false;
    setRecordingDuration(0);
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!componentMountedRef.current || requestId !== recordingRequestRef.current) {
            stream.getTracks().forEach((track) => track.stop());
            return;
        }
        recordingStreamRef.current = stream;
        recordingChunksRef.current = [];
        const supportedMimeType = [
            'audio/webm;codecs=opus',
            'audio/ogg;codecs=opus',
            'audio/mp4',
            'audio/webm',
            'audio/ogg',
        ].find((mimeType) => MediaRecorder.isTypeSupported?.(mimeType));
        const recorder = supportedMimeType
            ? new MediaRecorder(stream, { mimeType: supportedMimeType, audioBitsPerSecond: 64_000 })
            : new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
            if (event.data.size) recordingChunksRef.current.push(event.data);
        };
        recorder.onstop = () => {
            const duration = Math.min(60, Math.max(1, Math.round((Date.now() - recordingStartRef.current) / 1000)));
            const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || supportedMimeType || 'audio/webm' });
            releaseRecordingStream();
            if (discardRecordingRef.current) {
                recordingChunksRef.current = [];
                setRecordingDuration(0);
                setRecordingState('idle');
                return;
            }
            if (blob.size > MAX_UPLOAD_BYTES) {
                toast.error('Voice recordings must be 3 MB or smaller');
                recordingChunksRef.current = [];
                setRecordingDuration(0);
                setRecordingState('idle');
                return;
            }
            setVoicePreview({
                blob,
                url: URL.createObjectURL(blob),
                mimeType: blob.type,
                duration,
            });
            setRecordingDuration(duration);
            setRecordingState('preview');
        };
        recorder.onerror = () => {
            discardRecordingRef.current = true;
            toast.error('Voice recording failed');
            stopRecording(true);
        };
        recordingStartRef.current = Date.now();
        recorder.start(250);
        setRecordingState('recording');
        recordingTimerRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordingStartRef.current) / 1000);
            setRecordingDuration(Math.min(elapsed, 60));
            if (elapsed >= 60) stopRecording();
        }, 250);
    } catch (error) {
        if (requestId !== recordingRequestRef.current) return;
        releaseRecordingStream();
        setRecordingState('idle');
        toast.error(error?.name === 'NotAllowedError'
            ? 'Allow microphone access to record a voice message'
            : error?.message || 'Could not start voice recording');
    }
};

const handleSendVoiceMessage = async () => {
    if (!voicePreview || isSendingVoice) return;
    setIsSendingVoice(true);
    try {
        const mediaData = await readBlobAsDataUrl(voicePreview.blob);
        stopTyping();
        sendMessage({
            text: text.trim(),
            mediaData,
            mediaType: 'voice',
            mediaName: 'Voice message',
            mediaMimeType: voicePreview.mimeType.split(';')[0],
            mediaSize: voicePreview.blob.size,
            mediaDuration: voicePreview.duration,
        });
        setVoicePreview(null);
        setRecordingDuration(0);
        setRecordingState('idle');
        setText('');
        setShowEmojiPicker(false);
    } catch (error) {
        toast.error(error.message || 'Could not prepare the voice message');
    } finally {
        setIsSendingVoice(false);
    }
};

const handleSendMessage = (e) => {
    e.preventDefault();

    if (!text.trim() && !attachment) return;

    stopTyping();

    const message = { text: text.trim() };
    if (attachment?.type === 'image') {
        message.image = attachment.data;
        message.mediaName = attachment.name;
        message.mediaMimeType = attachment.mimeType;
    } else if (attachment) {
        message.mediaData = attachment.data;
        message.mediaType = attachment.type;
        message.mediaName = attachment.name;
        message.mediaMimeType = attachment.mimeType;
        message.mediaSize = attachment.size;
    }
    sendMessage(message);

    setText("");
    setAttachment(null);
    caretRef.current = { start: 0, end: 0 };
    setShowEmojiPicker(false);

    if (FileInputRef.current) {
        FileInputRef.current.value = "";
    }
}

    const handleFileChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return;
        if (voicePreview || recordingState !== 'idle') {
            toast.error('Finish or remove the current voice recording first');
            e.target.value = '';
            return;
        }
        if (!SUPPORTED_MEDIA_TYPES.has(file.type)) {
            toast.error("This file type is not supported");
            e.target.value = "";
            return;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
            toast.error("Files must be 3 MB or smaller");
            e.target.value = "";
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            if (!reader.result) {
                toast.error("Could not read the selected file");
                return;
            }
            const type = file.type.startsWith('image/')
                ? 'image'
                : file.type.startsWith('video/')
                    ? 'video'
                    : file.type.startsWith('audio/')
                        ? 'audio'
                        : SUPPORTED_DOCUMENT_TYPES.has(file.type)
                            ? 'document'
                            : 'other';
            setAttachment({
                data: reader.result,
                type,
                name: file.name,
                size: file.size,
                mimeType: file.type,
            });
        }
        reader.onerror = () => toast.error("Could not read the selected file");
        reader.readAsDataURL(file);
    }

    const removeAttachment = () => {
        setAttachment(null);
        if (FileInputRef.current) FileInputRef.current.value = "";
    }

    if (isBlocked) {
        return (
            <div className="hama-composer w-full flex items-center justify-center">
                <p className="text-red-400 text-sm flex items-center gap-2">
                    <Shield size={16} />
                    You have blocked this user. Unblock to send messages.
                </p>
            </div>
        );
    }
    
    return (
        <div className={`hama-composer w-full flex flex-col gap-2 ${isMobile ? 'p-2' : 'p-4'}`}>

            {attachment && (
                <div className="hama-attachment-preview">
                    {attachment.type === 'image' ? (
                        <img src={attachment.data} alt="Attachment preview" />
                    ) : attachment.type === 'video' ? (
                        <video src={attachment.data} controls playsInline aria-label="Video attachment preview" />
                    ) : attachment.type === 'audio' ? (
                        <audio src={attachment.data} controls aria-label="Audio attachment preview" />
                    ) : (
                        <span><FileText size={20} />{attachment.name}</span>
                    )}
                    <button type="button" onClick={removeAttachment} aria-label="Remove attachment">
                        <XIcon size={16} />
                    </button>
                </div>
            )}

            {recordingState !== 'idle' && recordingState !== 'preview' && (
                <div className={`hama-recording-status ${recordingState === 'recording' ? 'is-recording' : ''}`}>
                    {recordingState === 'recording' && <i aria-hidden="true" />}
                    <span>
                        {recordingState === 'requesting'
                            ? 'Waiting for microphone permission...'
                            : recordingState === 'processing'
                                ? 'Preparing recording...'
                                : `Recording ${formatDuration(recordingDuration)}`}
                    </span>
                    {recordingState === 'recording' && (
                        <button type="button" onClick={() => stopRecording()} aria-label="Stop recording">
                            <StopCircle size={19} /> Stop
                        </button>
                    )}
                    {(recordingState === 'recording' || recordingState === 'requesting') && (
                        <button type="button" onClick={() => stopRecording(true)} aria-label="Cancel recording">
                            <XIcon size={17} /> Cancel
                        </button>
                    )}
                </div>
            )}

            {voicePreview && (
                <div className="hama-voice-preview">
                    <audio src={voicePreview.url} controls aria-label="Preview voice message" />
                    <span>{formatDuration(voicePreview.duration)}</span>
                    <button
                        type="button"
                        onClick={() => {
                            setVoicePreview(null);
                            setRecordingDuration(0);
                            setRecordingState('idle');
                        }}
                        aria-label="Delete voice recording"
                    >
                        <Trash2 size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={handleSendVoiceMessage}
                        disabled={isSendingVoice}
                        aria-label="Send voice message"
                    >
                        <Send size={18} />
                    </button>
                </div>
            )}

            {/* Input Row */}
            <form
                className='hama-message-form w-full'
                onSubmit={handleSendMessage}
            >
                <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,audio/webm,audio/ogg,audio/mp4,audio/mpeg,audio/wav,audio/aac,application/pdf,application/msword,application/rtf,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    ref={FileInputRef}
                    className='hidden'
                    onChange={handleFileChange}
                />

                <button
                    type='button'
                    onClick={() => FileInputRef.current?.click()}
                    disabled={recordingState !== 'idle' || Boolean(voicePreview)}
                    className='hama-attach-button'
                    aria-label="Attach a file">
                    <Paperclip size={isMobile ? 19 : 23} />
                </button>

                <input
                    type="text"
                    ref={inputRef}
                    value={text}
                    onChange={handleTextChange}
                    onBlur={stopTyping}
                    placeholder="Type a message..."
                    aria-label="Type a message"
                    onSelect={(event) => {
                        caretRef.current = {
                            start: event.currentTarget.selectionStart ?? text.length,
                            end: event.currentTarget.selectionEnd ?? text.length,
                        };
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Escape') setShowEmojiPicker(false);
                    }}
                    className={`hama-message-field ${isMobile ? 'text-sm' : ''}`}
                />

                <div className="hama-emoji-container" ref={emojiPickerRef}>
                    <button
                        type="button"
                        className="hama-emoji-button"
                        aria-label={showEmojiPicker ? 'Close emoji picker' : 'Open emoji picker'}
                        aria-expanded={showEmojiPicker}
                        onClick={() => {
                            if (inputRef.current) {
                                caretRef.current = {
                                    start: inputRef.current.selectionStart ?? text.length,
                                    end: inputRef.current.selectionEnd ?? text.length,
                                };
                            }
                            setShowEmojiPicker((isOpen) => !isOpen);
                        }}
                    >
                        <Smile size={isMobile ? 19 : 22} />
                    </button>
                    {showEmojiPicker && (
                        <div className="hama-emoji-popover">
                            <Suspense fallback={<div className="hama-emoji-loading">Loading emoji...</div>}>
                                <EmojiPicker
                                    className="hama-emoji-picker"
                                    colorScheme="light"
                                    width={320}
                                    height={360}
                                    previewConfig={{ showPreview: false }}
                                    onEmojiClick={handleEmojiClick}
                                />
                            </Suspense>
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    className={`hama-voice-record-button ${recordingState === 'recording' ? 'is-recording' : ''}`}
                    onClick={() => {
                        if (recordingState === 'recording') stopRecording();
                        else if (recordingState === 'requesting') stopRecording(true);
                        else startRecording();
                    }}
                    disabled={Boolean(voicePreview) || recordingState === 'processing'}
                    aria-label={recordingState === 'recording' ? 'Stop recording' : 'Record voice message'}
                    title={recordingState === 'recording' ? 'Stop recording' : 'Record voice message'}
                >
                    {recordingState === 'recording' ? <StopCircle size={isMobile ? 19 : 21} /> : <Mic size={isMobile ? 19 : 21} />}
                </button>

                <button
                    type='submit'
                    disabled={!text.trim() && !attachment}
                    className='hama-send-button'
                    aria-label="Send message">
                    <Send size={isMobile ? 18 : 24} />
                </button>
            </form>

        </div>
    )
}

export default MessageInput;