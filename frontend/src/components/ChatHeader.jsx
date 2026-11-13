import React, { useEffect, useState } from 'react'
import { XCircleIcon, ArrowLeftIcon, Pencil, Trash2, X, Phone, Video } from 'lucide-react'
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { useCallStore } from '../store/useCallStore';
import useWindowSize from '../hooks/useWindowSize';
import StatusAvatar from './StatusAvatar';

const ChatHeader = () => {
    const { selectedUser, setSelectedUser, setShowReceiverProfile, selectedMessage, setSelectedMessage, } = useChatStore();
    const { onlineUsers } = useAuthStore();
    const startCall = useCallStore((state) => state.startCall);
    const isSelectedUserOnline = onlineUsers.some(
    (id) => String(id) === String(selectedUser?._id)
);
    const { isMobile } = useWindowSize();
    const [editableMessageId, setEditableMessageId] = useState(null);

    useEffect(() => {
        const handleEscapekey = (event) => {
            if (event.key === "Escape") setSelectedUser(null);
        }
        window.addEventListener('keydown', handleEscapekey);
        return () => {
            window.removeEventListener('keydown', handleEscapekey);
        };
    }, [selectedUser, setSelectedUser])

    // Action bar logic
    const tenMin = 10 * 60 * 1000;
    useEffect(() => {
        let expiryTimer;
        const evaluateEditWindow = () => {
            const remaining = selectedMessage?.createdAt
                ? tenMin - (Date.now() - new Date(selectedMessage.createdAt).getTime())
                : 0;
            setEditableMessageId(remaining > 0 ? selectedMessage._id : null);
            if (remaining > 0) {
                expiryTimer = setTimeout(() => setEditableMessageId(null), remaining);
            }
        };
        const evaluationTimer = setTimeout(evaluateEditWindow, 0);

        return () => {
            clearTimeout(evaluationTimer);
            clearTimeout(expiryTimer);
        };
    }, [selectedMessage?._id, selectedMessage?.createdAt, tenMin]);

    const canEdit = selectedMessage &&
        !selectedMessage.isDeleted &&
        String(editableMessageId) === String(selectedMessage._id);

    return (

        selectedMessage ? (
            <div className='hama-chat-header hama-selected-toolbar'>
                {/* Left - selected info */}
                < div className='flex items-center gap-3' >
                    <button className="hama-header-close" onClick={() => setSelectedMessage(null)} aria-label="Clear selected message">
                        <X size={20} />
                    </button>
                    <span className='text-sm'>Message selected</span>
                </div >

                {/* Right - action buttons */}
                < div className='flex items-center gap-3' >
                    {/* Edit - sirf 10 min tak dikhao */}
                    {
                        canEdit && (
                            <button
                                onClick={() => {
                                    // ChatContainer ka editingMessage set karna hai
                                    // isliye ek custom event fire karte hain
                                    window.dispatchEvent(new CustomEvent("triggerEditMessage", {
                                        detail: selectedMessage
                                    }));
                                    setSelectedMessage(null);
                                }}
                                className='hama-message-action hama-message-action--edit'
                            >
                                <Pencil size={15} /> Edit
                            </button>
                        )
                    }

                    {/* Delete */}
                    <button
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent("triggerDeleteMessage", {
                                detail: selectedMessage
                            }));
                            setSelectedMessage(null);
                        }}
                        className='hama-message-action hama-message-action--delete'
                    >
                        <Trash2 size={15} /> Delete
                    </button>
                </div >
            </div >
        ) : (


            <header className='hama-chat-header'>
                {/* LeftSide */}

                <div className='hama-chat-person'>
                    <StatusAvatar
                        user={selectedUser}
                        online={isSelectedUserOnline}
                        className="hama-chat-person-avatar"
                        onNoStatusClick={() => setShowReceiverProfile(true)}
                    />
                    <button
                        type="button"
                        className='hama-chat-person-copy'
                        onClick={() => setShowReceiverProfile(true)}
                    >
                        <strong>{selectedUser?.fullName}</strong>
                        <span>
                            <i className={isSelectedUserOnline ? '' : 'is-offline'} />
                            {isSelectedUserOnline ? 'Online' : 'Offline'}
                        </span>
                    </button>
                </div>

                <div className="hama-header-actions">
                    <button
                        type="button"
                        onClick={() => startCall(selectedUser, 'audio')}
                        aria-label={`Start voice call with ${selectedUser?.fullName || 'contact'}`}
                        title="Voice call"
                        className="hama-call-header-button"
                    >
                        <Phone size={20} aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        onClick={() => startCall(selectedUser, 'video')}
                        aria-label={`Start video call with ${selectedUser?.fullName || 'contact'}`}
                        title="Video call"
                        className="hama-call-header-button"
                    >
                        <Video size={21} aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedUser(null)}
                        aria-label="Close conversation"
                        className='hama-header-close'
                    >
                        {isMobile
                            ? <ArrowLeftIcon size={26} aria-hidden="true" />
                            : <XCircleIcon size={30} aria-hidden="true" />
                        }
                    </button>
                </div>
            </header>
        )
    )
}

export default ChatHeader