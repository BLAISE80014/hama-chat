
import React, { useEffect, useRef, useState } from "react";
import ChatHeader from "./ChatHeader";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import NoChatHistoryPlaceHolder from "./NoChatHistoryPlaceHolder";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import MessageInput from "./MessageInput";
import { CheckCheck, Check, X, Download } from "lucide-react";

// Seen ticks component
const SeenTicks = ({ message, isMyMessage }) => {
  if (!isMyMessage) return null;

  if (message.isOptimistic) {
    return (
      <span className="inline-flex items-center ml-1">
        <Check size={12} className="text-gray-400" />
      </span>
    );
  }

  if (message.seen) {
    return (
      <span className="inline-flex items-center ml-1" title="Seen">
        <CheckCheck size={13} className="text-cyan-400" />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center ml-1" title="Sent">
      <Check size={12} className="text-gray-400" />
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
    clearUnread,
    markAsSeen,
    editMessage,
    deleteMessage,
  } = useChatStore();

  const { authUser, socket } = useAuthStore();

  const [previewImage, setPreviewImage] = useState(null);
  const [typingState, setTypingState] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingMessage, setDeletingMessage] = useState(null);
  const [selectedReason, setSelectedReason] = useState("");
  const [editText, setEditText] = useState("");

  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  const selectedUserId = selectedUser?._id;
  const selectedMessageId = selectedMessage?._id;
  const isTyping =
    typingState !== null &&
    String(typingState.senderId) === String(selectedUserId) &&
    String(typingState.conversationId) === String(selectedUserId) &&
    String(typingState.senderId) !== String(authUser?._id);

  // Listen for edit and delete actions
  useEffect(() => {
    const handleEdit = (e) => {
      setEditingMessage(e.detail);
      setEditText(e.detail?.text || "");
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

  // Load messages and subscribe to new messages
  useEffect(() => {
    if (!selectedUserId) return;

    getMessagesByUserId(selectedUserId);

    clearUnread(selectedUserId);
    markAsSeen(selectedUserId);
  }, [
    selectedUserId,
    getMessagesByUserId,
    clearUnread,
    markAsSeen,
  ]);

  // Mark received messages as seen
  useEffect(() => {
    if (!selectedUserId || !Array.isArray(messages)) return;

    const hasUnseenMessages = messages.some(
      (msg) =>
        String(msg.Sender) === String(selectedUserId) && !msg.seen
    );

    if (hasUnseenMessages) {
      markAsSeen(selectedUserId);
    }
  }, [messages, selectedUserId, markAsSeen]);

  // Scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop =
        messagesEndRef.current.scrollHeight;
    }
  }, [messages]);

  // Typing indicator listener
  useEffect(() => {
    if (!socket || !selectedUserId) {
      return;
    }

    const handleUserTyping = (data = {}) => {
      if (String(data.senderId) !== String(selectedUserId)) return;

      setTypingState({
        senderId: data.senderId,
        conversationId: selectedUserId,
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setTypingState(null);
        typingTimeoutRef.current = null;
      }, 3000);
    };

    const handleUserStoppedTyping = (data = {}) => {
      if (String(data.senderId) !== String(selectedUserId)) return;

      setTypingState(null);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };

    socket.on("userTyping", handleUserTyping);
    socket.on("userStoppedTyping", handleUserStoppedTyping);

    return () => {
      socket.off("userTyping", handleUserTyping);
      socket.off("userStoppedTyping", handleUserStoppedTyping);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      setTypingState(null);
    };
  }, [socket, selectedUserId]);

  const handleSaveEdit = () => {
    if (!editingMessage || !editText.trim()) return;

    editMessage(editingMessage._id, editText.trim());
    setEditingMessage(null);
    setEditText("");
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditText("");
  };

  const handleDeleteMessage = () => {
    if (!deletingMessage) return;

    deleteMessage(deletingMessage._id, selectedReason);
    setShowDeleteModal(false);
    setDeletingMessage(null);
    setSelectedReason("");
  };

  return (
    <div className="w-full h-full flex flex-col">
      <ChatHeader />

      {/* Message Box */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {isMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : messages.length > 0 ? (
          <div
            ref={messagesEndRef}
            className="flex-1 overflow-y-auto flex flex-col gap-2"
          >
            {messages.map((message) => {
              const isMyMessage =
                String(message.Sender) === String(authUser?._id);

              return (
                <div
                  key={message._id}
                  className={`message-item chat ${
                    isMyMessage ? "chat-end" : "chat-start"
                  }`}
                  onClick={() => {
                    if (
                      !isMyMessage ||
                      message.isOptimistic ||
                      message.isDeleted
                    ) {
                      return;
                    }

                    setSelectedMessage(
                      selectedMessageId === message._id ? null : message
                    );
                  }}
                >
                  <div
                    className={`chat-bubble cursor-pointer transition-all ${
                      isMyMessage
                        ? "bg-cyan-900 text-white"
                        : "bg-gray-600 text-white"
                    } ${
                      selectedMessageId === message._id
                        ? "ring-2 ring-cyan-400 brightness-125"
                        : ""
                    }`}
                  >
                    {/* Message Image */}
                    {message.image && (
                      <div className="relative group w-48">
                        <img
                          src={message.image}
                          alt="message attachment"
                          className="w-48 h-48 object-cover mb-2 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage(message.image);
                          }}
                        />

                        <a
                          href={message.image}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    )}

                    {/* Message Text */}
                    {message.text && <p>{message.text}</p>}

                    {/* Deleted Message */}
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

                    {/* Edited Badge */}
                    {message.isEdited && (
                      <span className="text-xs text-gray-400 italic">
                        {" "}(edited)
                      </span>
                    )}

                    {/* Timestamp and Seen Ticks */}
                    <div className="flex items-center justify-end gap-0.5 mt-0.5">
                      <p className="text-xs text-gray-400">
                        {message.createdAt
                          ? new Date(message.createdAt).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          : ""}
                      </p>

                      <SeenTicks
                        message={message}
                        isMyMessage={isMyMessage}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <NoChatHistoryPlaceHolder name={selectedUser?.fullName} />
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-end">
              <button
                onClick={() => setPreviewImage(null)}
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <img
              src={previewImage}
              alt="preview"
              className="max-w-[80vw] max-h-[75vh] rounded-lg object-contain"
            />

            <a
              href={previewImage}
              download
              target="_blank"
              rel="noreferrer"
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
            >
              <Download size={14} />
              Download Image
            </a>
          </div>
        </div>
      )}

      {/* Edit Message */}
      {editingMessage && (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-t border-gray-600">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="flex-1 bg-gray-700 text-white rounded-lg p-2 outline-none text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveEdit();
              if (e.key === "Escape") handleCancelEdit();
            }}
          />

          <button
            onClick={handleSaveEdit}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"
          >
            Save
          </button>

          <button
            onClick={handleCancelEdit}
            className="text-gray-400 hover:text-white px-2 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Delete Message Modal */}
      {showDeleteModal && deletingMessage && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-5 w-80 flex flex-col gap-3 shadow-xl">
            <h3 className="text-white font-semibold text-base">
              Delete Message
            </h3>

            <p className="text-gray-400 text-sm">
              Select a reason (optional):
            </p>

            {["Sent by mistake", "Wrong person", "Private"].map((reason) => (
              <button
                key={reason}
                onClick={() => setSelectedReason(reason)}
                className={`text-left px-4 py-2 rounded-lg text-sm transition-all ${
                  selectedReason === reason
                    ? "bg-red-600/40 text-red-300 border border-red-500"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {reason === "Sent by mistake" && "😬 "}
                {reason === "Wrong person" && "✏️ "}
                {reason === "Private" && "🔒 "}
                {reason}
              </button>
            ))}

            <div className="flex gap-2 mt-2">
              <button
                onClick={handleDeleteMessage}
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

      {/* Typing Indicator */}
      {isTyping && (
        <div className="px-5 py-2 flex items-center gap-2 text-sm text-gray-400">
          <span className="italic">
            {selectedUser?.fullName} is typing
          </span>

          <span className="flex items-center gap-1">
            <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" />
            <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:300ms]" />
          </span>
        </div>
      )}

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
