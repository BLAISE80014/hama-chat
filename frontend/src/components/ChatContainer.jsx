
import React, { useEffect, useRef, useState } from "react";
import ChatHeader from "./ChatHeader";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import NoChatHistoryPlaceHolder from "./NoChatHistoryPlaceHolder";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import MessageInput from "./MessageInput";
import CallEventCard from "./CallEventCard";
import { CheckCheck, Check, X, Download } from "lucide-react";

// Seen ticks component
const SeenTicks = ({ message, isMyMessage }) => {
  if (!isMyMessage) return null;

  if (message.isOptimistic) {
    return (
      <span className="hama-seen-tick inline-flex items-center ml-1">
        <Check size={12} />
      </span>
    );
  }

  if (message.seen) {
    return (
      <span className="hama-seen-tick inline-flex items-center ml-1" title="Seen">
        <CheckCheck size={13} />
      </span>
    );
  }

  return (
    <span className="hama-seen-tick inline-flex items-center ml-1" title="Sent">
      <Check size={12} />
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
    callEvents,
    callEventsConversationId,
    isCallEventsLoading,
    getCallEventsByUserId,
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
  const selectedCallEvents = String(callEventsConversationId) === String(selectedUserId)
    ? callEvents
    : [];
  const conversationItems = [
    ...messages.map((message) => ({
      type: "message",
      id: `message-${message._id}`,
      item: message,
      timestamp: new Date(message.createdAt || 0).getTime(),
    })),
    ...selectedCallEvents.map((callEvent) => ({
      type: "call",
      id: `call-${callEvent.callId}`,
      item: callEvent,
      timestamp: new Date(callEvent.startedAt || callEvent.createdAt || 0).getTime(),
    })),
  ].sort((a, b) => a.timestamp - b.timestamp);
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
    if (selectedUserId) getMessagesByUserId(selectedUserId);
    getCallEventsByUserId(selectedUserId);
  }, [
    selectedUserId,
    getMessagesByUserId,
    getCallEventsByUserId,
  ]);

  // Mark received messages as seen
  useEffect(() => {
    if (!selectedUserId || isMessagesLoading || !Array.isArray(messages)) return;

    const hasUnseenMessages = messages.some(
      (msg) =>
        String(msg.Sender) === String(selectedUserId) && !msg.seen
    );

    if (hasUnseenMessages) {
      markAsSeen(selectedUserId);
    }
  }, [messages, selectedUserId, isMessagesLoading, markAsSeen]);

  // Scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop =
        messagesEndRef.current.scrollHeight;
    }
  }, [messages, callEvents]);

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
    <div className="hama-chat-area">
      <ChatHeader />

      {/* Message Box */}
      <div className="hama-message-scroll">
        {isMessagesLoading || isCallEventsLoading ? (
          <MessagesLoadingSkeleton />
        ) : conversationItems.length > 0 ? (
          <div
            ref={messagesEndRef}
            className="hama-message-list"
          >
            {conversationItems.map((entry) => {
              if (entry.type === "call") {
                return (
                  <div className="hama-call-event-row" key={entry.id}>
                    <CallEventCard
                      callEvent={entry.item}
                      peer={selectedUser}
                      currentUserId={authUser?._id}
                    />
                  </div>
                );
              }

              const message = entry.item;
              const isMyMessage =
                String(message.Sender) === String(authUser?._id);

              return (
                <div
                  key={entry.id}
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
                    className={`hama-bubble cursor-pointer transition-all ${
                      isMyMessage ? "hama-bubble--sent" : "hama-bubble--received"
                    } ${
                      selectedMessageId === message._id
                        ? "ring-2 ring-violet-400"
                        : ""
                    }`}
                  >
                    {/* Message Image */}
                    {(message.image || (message.mediaType === "image" && (message.mediaUrl || message.mediaData))) && (
                      <div className="relative group w-48">
                        <img
                          src={message.image || message.mediaUrl || message.mediaData}
                          alt="message attachment"
                          className="hama-message-image w-48 h-48 mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage(message.image);
                          }}
                        />

                        <a
                          href={message.image || message.mediaUrl || message.mediaData}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="absolute top-2 right-2 bg-violet-950/75 hover:bg-violet-900 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    )}

                    {message.mediaType === "video" && (message.mediaUrl || message.mediaData) && (
                      <video
                        src={message.mediaUrl || message.mediaData}
                        controls
                        playsInline
                        preload="metadata"
                        className="hama-message-video"
                        aria-label="Video attachment"
                      />
                    )}

                    {(message.mediaType === "audio" || message.mediaType === "voice") &&
                      (message.mediaUrl || message.mediaData) && (
                        <div className="hama-audio-message">
                          <audio
                            src={message.mediaUrl || message.mediaData}
                            controls
                            preload="metadata"
                            aria-label={message.mediaType === "voice" ? "Voice message" : "Audio attachment"}
                          />
                          {message.mediaType === "voice" && (
                            <span>{message.mediaName || "Voice message"}</span>
                          )}
                        </div>
                      )}

                    {(message.mediaType === "document" || message.mediaType === "other") &&
                      (message.mediaUrl || message.mediaData) && (
                        <a
                          href={message.mediaUrl || message.mediaData}
                          download={message.mediaName || "shared-file"}
                          target="_blank"
                          rel="noreferrer"
                          className="hama-message-file"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <span>{message.mediaName || "Shared file"}</span>
                          <Download size={15} aria-hidden="true" />
                        </a>
                      )}

                    {/* Message Text */}
                    {message.text && <p>{message.text}</p>}

                    {/* Deleted Message */}
                    {message.isDeleted && (
                      <div className="hama-message-deleted italic text-sm px-1">
                        🚫 Message removed
                        {message.deleteReason && (
                        <span className="text-xs ml-1">
                            · {message.deleteReason}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Edited Badge */}
                    {message.isEdited && (
                      <span className="hama-message-edited text-xs italic">
                        {" "}(edited)
                      </span>
                    )}

                    {/* Timestamp and Seen Ticks */}
                    <div className="flex items-center justify-end gap-0.5 mt-0.5">
                      <p className="hama-message-time">
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
          className="fixed inset-0 z-50 bg-purple-950/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-end">
              <button
                onClick={() => setPreviewImage(null)}
                className="bg-white/90 hover:bg-white text-violet-800 p-2 rounded-full transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <img
              src={previewImage}
              alt="preview"
              className="max-w-[80vw] max-h-[75vh] rounded-2xl object-contain shadow-2xl"
            />

            <a
              href={previewImage}
              download
              target="_blank"
              rel="noreferrer"
              className="bg-violet-700 hover:bg-violet-600 text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
            >
              <Download size={14} />
              Download Image
            </a>
          </div>
        </div>
      )}

      {/* Edit Message */}
      {editingMessage && (
        <div className="hama-edit-bar flex items-center gap-2 px-4 py-2">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="flex-1 bg-white text-violet-950 border border-violet-200 rounded-lg p-2 outline-none text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveEdit();
              if (e.key === "Escape") handleCancelEdit();
            }}
          />

          <button
            onClick={handleSaveEdit}
            className="bg-violet-700 text-white px-3 py-2 rounded-lg text-sm"
          >
            Save
          </button>

          <button
            onClick={handleCancelEdit}
            className="text-violet-500 hover:text-violet-800 px-2 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Delete Message Modal */}
      {showDeleteModal && deletingMessage && (
        <div className="hama-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="hama-delete-modal rounded-xl p-5 w-80 flex flex-col gap-3 shadow-xl">
            <h3 className="font-semibold text-base">
              Delete Message
            </h3>

            <p className="text-sm">
              Select a reason (optional):
            </p>

            {["Sent by mistake", "Wrong person", "Private"].map((reason) => (
              <button
                key={reason}
                onClick={() => setSelectedReason(reason)}
                className={`text-left px-4 py-2 rounded-lg text-sm transition-all ${
                  selectedReason === reason
                    ? "bg-violet-100 text-violet-800 border border-violet-300"
                    : "bg-violet-50 text-violet-700 hover:bg-violet-100"
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
                className="flex-1 bg-violet-700 hover:bg-violet-600 text-white py-2 rounded-lg text-sm font-semibold"
              >
                Delete
              </button>

              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingMessage(null);
                  setSelectedReason("");
                }}
                className="flex-1 bg-violet-100 hover:bg-violet-200 text-violet-800 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Typing Indicator */}
      {isTyping && (
        <div className="hama-typing-row">
          <span className="hama-typing-bubble">
            <span className="hama-typing-dots" aria-hidden="true">
              <i /><i /><i />
            </span>
            <span>{selectedUser?.fullName} is typing...</span>
          </span>
        </div>
      )}

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
