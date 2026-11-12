import React, { useEffect, useRef, useState } from 'react'
import ChatHeader from './ChatHeader'
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import NoChatHistoryPlaceHolder from './NoChatHistoryPlaceHolder';
import MessagesLoadingSkeleton from './MessagesLoadingSkeleton';
import MessageInput from './MessageInput';
import { CheckCheck, Check } from 'lucide-react';

// ✅ FEATURE 1: Seen Ticks Component (Instagram/WhatsApp style)
const SeenTicks = ({ message, isMyMessage }) => {
  // Sirf apne bheje messages pe ticks dikhao
  if (!isMyMessage) return null;

  // Optimistic message = sirf ek tick (sending...)
  if (message.isOptimistic) {
    return (
      <span className="inline-flex items-center ml-1">
        <Check size={12} className="text-gray-400" />
      </span>
    );
  }

  // Seen = Double blue tick (✓✓)
  if (message.seen) {
    return (
      <span className="inline-flex items-center ml-1" title="Seen">
        <CheckCheck size={13} className="text-cyan-400" />
      </span>
    );
  }

  // Delivered but not seen = Double gray tick (✓✓)
  return (
    <span className="inline-flex items-center ml-1" title="Delivered">
      <CheckCheck size={13} className="text-gray-400" />
    </span>
  );
};

const ChatContainer = () => {
  const {
    selectedMessage,
    setSelectedMessage,
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    subscribeToMessages,
    clearUnread,
    unsubscribeFromMessages,
    markAsSeen, // ✅ FEATURE 1
    editMessage,
    deleteMessage
  } = useChatStore();

  const { authUser } = useAuthStore();
  const [previewImage, setPreviewImage] = useState(null);
  const messagesEndRef = useRef(null);
  const [editingMessage, setEditingMessage] = useState(null); // {_id, text}
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingMessage, setDeletingMessage] = useState(null);
  const [selectedReason, setSelectedReason] = useState("");
  const [editText, setEditText] = useState("");
  const selectedMessageId = selectedMessage?._id;

  useEffect(() => {
    const handleEdit = (e) => {
      setEditingMessage(e.detail);
      setEditText(e.detail.text || "");
    };
    const handleDelete = (e) => {
      setDeletingMessage(e.detail);
      setShowDeleteModal(true);
      setSelectedReason("");
    };

    window.addEventListener("triggerEditMessage", handleEdit);
    window.addEventListener("triggerDeleteMessage", handleDelete);

    return () => {
      window.removeEventListener("triggerEditMessage", handleEdit);
      window.removeEventListener("triggerDeleteMessage", handleDelete);
    };
  }, []);

  useEffect(() => {
    getMessagesByUserId(selectedUser?._id);
    subscribeToMessages();
    if (selectedUser?._id) {
      clearUnread(selectedUser._id);
      // ✅ FEATURE 1: Chat open hote hi unseen messages mark karo
      markAsSeen(selectedUser._id);
    }

    return () => unsubscribeFromMessages();
  }, [selectedUser, getMessagesByUserId]);

  useEffect(() => {
    if (messages.length > 0 && selectedUser?._id) {
      const hasUnseenMessages = messages.some(
        (msg) => msg.Sender === selectedUser._id && !msg.seen
      );
      if (hasUnseenMessages) {
        markAsSeen(selectedUser._id);
      }
    }
  }, [messages, selectedUser]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className='w-full h-full flex flex-col'>

      {/* ChatHeader */}
      <ChatHeader />

      {/* MessageBox */}
      <div className='flex-1 overflow-y-auto p-4 flex flex-col gap-2'>
        {messages.length > 0 && !isMessagesLoading ? (
          <div
            ref={messagesEndRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}
          >
            {messages.map((message) => {
              const isMyMessage = message.Sender === authUser._id;

              return (
                <div
                  key={message._id}
                  className={`message-item chat ${isMyMessage ? "chat-end" : "chat-start"}`}
                  onClick={() => {
                    if (!isMyMessage || message.isOptimistic || message.isDeleted) return;
                    setSelectedMessage(selectedMessageId === message._id ? null : message);
                  }}
                >
                  <div
                    className={`chat-bubble cursor-pointer transition-all
                          ${isMyMessage ? "bg-cyan-900 text-white" : "bg-gray-600 text-white"}
                          ${selectedMessageId === message._id ? "ring-2 ring-cyan-400 brightness-125" : ""}
                     `}
                  >
                    {/* Image */}
                    {message.image && (
                      <div className="relative group w-48">
                        <img
                          src={message.image}
                          alt="message attachment"
                          className='w-48 h-48 object-cover mb-2 rounded-lg cursor-pointer hover:opacity-90 transition-opacity'
                          onClick={() => setPreviewImage(message.image)}
                        />
                        <a
                          href={message.image}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </a>
                      </div>
                    )}

                    {/* Text */}
                    {message.text && <p>{message.text}</p>}

                    {/* Deleted message placeholder - Idea 1 */}
                    {message.isDeleted && (
                      <div className="italic text-gray-400 text-sm px-1">
                        🚫 Message removed
                        {message.deleteReason && (
                          <span className="text-xs text-gray-500 ml-1">
                            · {message.deleteReason}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Edited badge */}
                    {message.isEdited && (
                      <span className="text-xs text-gray-400 italic"> (edited)</span>
                    )}


                    {/* ✅ FEATURE 1: Timestamp + Seen Ticks */}
                    <div className="flex items-center justify-end gap-0.5 mt-0.5">
                      <p className='text-xs text-gray-400'>
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {/* Seen ticks - sirf apne messages pe */}
                      <SeenTicks message={message} isMyMessage={isMyMessage} />
                    </div>
                  </div>

                  {/* Image Preview Modal */}
                  {previewImage && (
                    <div
                      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                      onClick={() => setPreviewImage(null)}
                    >
                      <div className="relative flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <div className="w-full flex justify-end">
                          <button
                            onClick={() => setPreviewImage(null)}
                            className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-all"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                        <img src={previewImage} alt="preview" className="max-w-[80vw] max-h-[75vh] rounded-lg object-contain" />
                        <a
                          href={previewImage}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Download Image
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : isMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : (
          <NoChatHistoryPlaceHolder name={selectedUser?.fullName} />
        )}
      </div>

      {editingMessage && (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-t border-gray-600">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="flex-1 bg-gray-700 text-white rounded-lg p-2 outline-none text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && editText.trim()) {
                editMessage(editingMessage._id, editText.trim());
                setEditingMessage(null);
                setEditText("");
              }
              if (e.key === "Escape") {
                setEditingMessage(null);
                setEditText("");
              }
            }}
          />
          <button
            onClick={() => {
              if (editText.trim()) {
                editMessage(editingMessage._id, editText.trim());
                setEditingMessage(null);
                setEditText("");
              }
            }}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"
          >
            Save
          </button>
          <button
            onClick={() => { setEditingMessage(null); setEditText(""); }}
            className="text-gray-400 hover:text-white px-2 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      )}
      {/* Delete Modal - Idea 2: Reason selection */}
      {showDeleteModal && deletingMessage && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-5 w-80 flex flex-col gap-3 shadow-xl">
            <h3 className="text-white font-semibold text-base">Delete Message</h3>
            <p className="text-gray-400 text-sm">Select a reason (optional):</p>

            {/* Reason options */}
            {["Sent by mistake", "Wrong person", "Private"].map((reason) => (
              <button
                key={reason}
                onClick={() => setSelectedReason(reason)}
                className={`text-left px-4 py-2 rounded-lg text-sm transition-all
                        ${selectedReason === reason
                    ? "bg-red-600/40 text-red-300 border border-red-500"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
              >
                {reason === "Sent by mistake" && "😬 Sent by mistake"}
                {reason === "Wrong person" && "✏️ Wrong person"}
                {reason === "Private" && "🔒 Private"}
              </button>
            ))}

            {/* Action buttons */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  deleteMessage(deletingMessage._id, selectedReason);
                  setShowDeleteModal(false);
                  setDeletingMessage(null);
                  setSelectedReason("");
                }}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-sm font-semibold"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingMessage(null);
                  setSelectedReason("");
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MessageInput */}
      <MessageInput />
    </div>
  )
}

export default ChatContainer