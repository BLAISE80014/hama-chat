import React, { useEffect, useState } from 'react'
import { XCircleIcon, ArrowLeftIcon, Pencil, Trash2, X } from 'lucide-react'
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import useWindowSize from '../hooks/useWindowSize';

const ChatHeader = () => {
    const { selectedUser, setSelectedUser, setShowReceiverProfile, selectedMessage, setSelectedMessage, } = useChatStore();
    const { onlineUsers } = useAuthStore();
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

                <div className='hama-chat-person'
                    onClick={() => setShowReceiverProfile(true)} >

                    <div className='hama-chat-person-avatar'>
                        <img
                            src={selectedUser?.profilepic || "/avatar.jpg"}
                            alt={selectedUser?.fullName}
                        />
                        {isSelectedUserOnline && <i className="hama-online-dot" />}
                    </div>

                    <div className='hama-chat-person-copy'>
                        <strong>{selectedUser?.fullName}</strong>
                        <span>
                            <i className={isSelectedUserOnline ? '' : 'is-offline'} />
                            {isSelectedUserOnline ? 'Online' : 'Offline'}
                        </span>
                    </div>
                </div>

                {/* RightSide — back arrow on mobile, X on desktop/tablet */}
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
            </header>
        )
    )
}

export default ChatHeader