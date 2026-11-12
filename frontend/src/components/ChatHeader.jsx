import React, { useEffect } from 'react'
import { XCircleIcon, ArrowLeftIcon, Pencil, Trash2, X } from 'lucide-react'
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import useWindowSize from '../hooks/useWindowSize';

const ChatHeader = () => {
    const { selectedUser, setSelectedUser, setShowReceiverProfile, selectedMessage, setSelectedMessage, } = useChatStore();
    const { onlineUsers, authUser } = useAuthStore();
    const { isMobile } = useWindowSize();

    useEffect(() => {
        const handleEscapekey = (event) => {
            if (event.key === "Escape") setSelectedUser(null);
        }
        window.addEventListener('keydown', handleEscapekey);
        return () => {
            window.removeEventListener('keydown', handleEscapekey);
        };
    }, [selectedUser])

    // Action bar logic
    const tenMin = 10 * 60 * 1000;
    const canEdit = selectedMessage &&
        !selectedMessage.isDeleted &&
        Date.now() - new Date(selectedMessage.createdAt).getTime() < tenMin;

    return (

        selectedMessage ? (
            <div className='w-full h-16 border-b border-gray-300/20 flex items-center justify-between px-4 bg-cyan-900/30' >
                {/* Left - selected info */}
                < div className='flex items-center gap-3' >
                    <button onClick={() => setSelectedMessage(null)}>
                        <X size={22} className='text-gray-300 hover:text-white' />
                    </button>
                    <span className='text-sm text-gray-300'>Message selected</span>
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
                                className='flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 bg-cyan-900/40 px-3 py-1.5 rounded-lg'
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
                        className='flex items-center gap-1 text-sm text-red-400 hover:text-red-300 bg-red-900/30 px-3 py-1.5 rounded-lg'
                    >
                        <Trash2 size={15} /> Delete
                    </button>
                </div >
            </div >
        ) : (


            <div className='w-full h-16 border-b border-gray-300/20 flex items-center justify-between px-4'>
                {/* LeftSide */}

                <div className='left flex items-center gap-4 cursor-pointer'
                    onClick={() => setShowReceiverProfile(true)} >

                    <div className={`avatar ${onlineUsers.includes(selectedUser?._id) ? 'online' : ''} w-10 h-10 rounded-full`}>
                        <img
                            src={selectedUser?.profilepic || "/avatar.jpg"}
                            alt={selectedUser?.fullName}
                            className=' w-10 h-10 rounded-full' />
                    </div>

                    <div className='flex flex-col'>
                        <span className='font-semibold'>{selectedUser?.fullName}</span>
                        <span className={`text-sm ${onlineUsers.includes(selectedUser?._id) ? 'text-green-500' : 'text-gray-300/30'}`}>
                            {onlineUsers.includes(selectedUser?._id) ? 'Online' : 'Offline'}
                        </span>
                    </div>
                </div>

                {/* RightSide — back arrow on mobile, X on desktop/tablet */}
                <button
                    type="button"
                    onClick={() => { setSelectedUser(null) }}
                    aria-label="Close conversation"
                    className='right cursor-pointer ml-10'
                >
                    {isMobile
                        ? <ArrowLeftIcon size={26} aria-hidden="true" />
                        : <XCircleIcon size={30} aria-hidden="true" />
                    }
                </button>
            </div>
        )
    )
}

export default ChatHeader