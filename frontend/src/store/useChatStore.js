import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

let messagesRequestId = 0;
let callEventsRequestId = 0;
let subscribedMessageSocket = null;
let messageSocketHandlers = null;

const sortCallEvents = (callEvents) =>
    [...callEvents].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));

const upsertCallEvent = (callEvents, callEvent) => {
    const updated = callEvents.filter((item) => item.callId !== callEvent.callId);
    updated.push(callEvent);
    return sortCallEvents(updated);
};

export const useChatStore = create((set, get) => ({
    allcontacts: [],
    messages: [],
    callEvents: [],
    callEventsConversationId: null,
    chats: [],
    ActiveTab: "chats",
    selectedUser: null,
    isUsersLoading: false,
    isMessagesLoading: false,
    isCallEventsLoading: false,

    unreadMessages: {},
    showReceiverProfile: false,

    selectedMessage: null,
    setShowReceiverProfile: async (val) => set({ showReceiverProfile: val }),
    setSelectedMessage: (msg) => set({ selectedMessage: msg }),
    setActiveTab: (tab) => { set({ ActiveTab: tab }) },
    setSelectedUser: (user) => { set({ selectedUser: user }) },

    getAllContacts: async (data) => {
        set({ isUsersLoading: true });
        try {
            const res = await axiosInstance.get('/messages/contacts', data);
            set({ allcontacts: res.data })
        } catch (error) {
            toast.error(error.response?.data?.message)
        } finally {
            set({ isUsersLoading: false })
        }
    },

    getMyChatPartners: async (data) => {
        set({ isUsersLoading: true })
        try {
            const res = await axiosInstance.get('/messages/chats', data);
            set({
                chats: res.data,
                unreadMessages: Object.fromEntries(
                    res.data
                        .filter((chat) => chat.unreadCount > 0)
                        .map((chat) => [String(chat._id), chat.unreadCount])
                ),
            })
        } catch (error) {
            toast.error(error.response?.data?.message)
        } finally {
            set({ isUsersLoading: false })
        }
    },

    getMessagesByUserId: async (userId) => {
        const requestId = ++messagesRequestId;
        if (!userId) {
            set({ messages: [], isMessagesLoading: false });
            return;
        }
        set({ isMessagesLoading: true, messages: [] })
        try {
            const res = await axiosInstance.get(`/messages/${userId}`);
            if (requestId === messagesRequestId) {
                set((state) => {
                    const conversationMessages = state.messages.filter((message) =>
                        [message.Sender, message.Reciever].some(
                            (participantId) => String(participantId) === String(userId)
                        )
                    );
                    const messagesById = new Map(
                        [...res.data, ...conversationMessages].map((message) => [
                            String(message._id),
                            message,
                        ])
                    );
                    return {
                        messages: [...messagesById.values()].sort(
                            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
                        ),
                    };
                });
            }
        } catch (error) {
            if (requestId === messagesRequestId) {
                set({ messages: [] });
                toast.error(error.response?.data?.message ?? "Failed to load messages");
            }
        } finally {
            if (requestId === messagesRequestId) {
                set({ isMessagesLoading: false });
            }
        }
    },

    getCallEventsByUserId: async (userId) => {
        const requestId = ++callEventsRequestId;
        if (!userId) {
            set({
                callEvents: [],
                callEventsConversationId: null,
                isCallEventsLoading: false,
            });
            return;
        }

        const conversationId = String(userId);
        set({
            callEvents: [],
            callEventsConversationId: conversationId,
            isCallEventsLoading: true,
        });
        try {
            const response = await axiosInstance.get(`/messages/call-events/${conversationId}`);
            if (!Array.isArray(response.data?.callEvents)) {
                throw new Error("Invalid call history response");
            }
            if (requestId === callEventsRequestId) {
                set((state) => {
                    const recentEvents = state.callEventsConversationId === conversationId
                        ? state.callEvents
                        : [];
                    const eventsByCallId = new Map(
                        [...response.data.callEvents, ...recentEvents].map((event) => [
                            event.callId,
                            event,
                        ])
                    );
                    return {
                        callEventsConversationId: conversationId,
                        callEvents: sortCallEvents([...eventsByCallId.values()]),
                    };
                });
            }
        } catch (error) {
            if (requestId === callEventsRequestId) {
                set((state) => ({
                    callEventsConversationId: conversationId,
                    callEvents: state.callEventsConversationId === conversationId
                        ? state.callEvents
                        : [],
                }));
                toast.error(error.response?.data?.message || "Could not load call history");
            }
        } finally {
            if (requestId === callEventsRequestId) {
                set({ isCallEventsLoading: false });
            }
        }
    },

    sendMessage: async (messageData) => {
        const { selectedUser } = get();
        const { authUser } = useAuthStore.getState();

        if (!selectedUser?._id || !authUser?._id) return;

        const receiverId = String(selectedUser._id);
        const tempId = `temp-${Date.now()}-${Math.random()}`;

        const optimisticMessage = {
            _id: tempId,
            Sender: String(authUser._id),
            Reciever: receiverId,
            text: messageData.text,
            image: messageData.image,
            mediaData: messageData.mediaData,
            mediaType: messageData.mediaType,
            mediaName: messageData.mediaName,
            mediaMimeType: messageData.mediaMimeType,
            mediaSize: messageData.mediaSize,
            mediaDuration: messageData.mediaDuration,
            createdAt: new Date().toISOString(),
            isOptimistic: true,
        };

        set((state) => ({ messages: [...state.messages, optimisticMessage] }));

        try {
            const res = await axiosInstance.post(`/messages/send/${receiverId}`, messageData);
            // Use functional update to get fresh state, replace optimistic msg
            if (String(get().selectedUser?._id) === receiverId) {
                set((state) => ({
                    messages: [
                        ...state.messages.filter((m) => m._id !== tempId && m._id !== res.data._id),
                        res.data,
                    ],
                }));
            }
        } catch (error) {
            // Remove only the failed optimistic message, keep rest intact
            set((state) => ({
                messages: state.messages.filter((m) => m._id !== tempId)
            }));
            toast.error(error.response?.data?.message || "Failed to send message");
        }
    },

    markAsSeen: (senderId) => {
        const socket = useAuthStore.getState().socket;
        if (!socket?.connected || !senderId) return;
        const { authUser } = useAuthStore.getState();
        const messageIdsToMark = new Set(
            get().messages
                .filter((message) =>
                    String(message.Sender) === String(senderId) &&
                    String(message.Reciever) === String(authUser?._id) &&
                    !message.seen &&
                    !message.isDeleted
                )
                .map((message) => String(message._id))
        );

        socket.emit("markAsSeen", { senderId: String(senderId) }, (response) => {
            if (!response?.success) {
                toast.error(response?.message || "Could not mark messages as read");
                return;
            }
            set((state) => {
                const unreadMessages = { ...state.unreadMessages };
                if (response.unreadCount > 0) {
                    unreadMessages[String(senderId)] = response.unreadCount;
                } else {
                    delete unreadMessages[String(senderId)];
                }
                const seenAt = response.seenAt || new Date().toISOString();
                return {
                    unreadMessages,
                    messages: state.messages.map((message) =>
                        messageIdsToMark.has(String(message._id)) && !message.seen
                            ? { ...message, seen: true, seenAt }
                            : message
                    ),
                };
            });
        });
    },

    deleteMessage: (messageId, reason) => {
        const socket = useAuthStore.getState().socket;
        if (!socket?.connected) {
            toast.error("Connection lost. Please reconnect and try again.");
            return;
        }
        socket.emit("deleteMessage", { messageId, reason }, (response) => {
            if (!response?.success) {
                toast.error(response?.message || "Could not delete message");
            }
        });
    },

    editMessage: (messageId, newText) => {
        const socket = useAuthStore.getState().socket;
        if (!socket?.connected) {
            toast.error("Connection lost. Please reconnect and try again.");
            return;
        }
        socket.emit("editMessage", { messageId, text: newText }, (response) => {
            if (!response?.success) {
                toast.error(response?.message || "Could not edit message");
            }
        });
    },

    subscribeToMessages: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;
        get().unsubscribeFromMessages();

        const handleNewMessage = (newMessage) => {
            const { authUser } = useAuthStore.getState();
            if (!newMessage?._id || !authUser?._id) return;
            const currentUserId = String(authUser._id);
            const isIncoming = String(newMessage.Reciever) === currentUserId;
            const isOutgoing = String(newMessage.Sender) === currentUserId;
            if (!isIncoming && !isOutgoing) return;

            const peerId = String(isIncoming ? newMessage.Sender : newMessage.Reciever);
            const selectedUserId = String(get().selectedUser?._id);
            const isSelectedConversation = peerId === selectedUserId;
            const hasChat = get().chats.some((chat) => String(chat._id) === peerId);

            set((state) => {
                const chats = state.chats.filter((chat) => String(chat._id) !== peerId);
                const existingChat = state.chats.find((chat) => String(chat._id) === peerId);
                const updatedChat = existingChat
                    ? { ...existingChat, lastMessage: newMessage }
                    : null;
                const messages = isSelectedConversation &&
                    !state.messages.some((message) => String(message._id) === String(newMessage._id))
                    ? [...state.messages, newMessage]
                    : state.messages;
                return {
                    chats: updatedChat ? [updatedChat, ...chats] : state.chats,
                    messages,
                };
            });

            if (!hasChat) get().getMyChatPartners();
        };

        const handleUnreadCount = ({ conversationId, count } = {}) => {
            if (!conversationId || !Number.isInteger(count) || count < 0) return;
            set((state) => {
                const unreadMessages = { ...state.unreadMessages };
                if (count > 0) unreadMessages[String(conversationId)] = count;
                else delete unreadMessages[String(conversationId)];
                return {
                    unreadMessages,
                    chats: state.chats.map((chat) =>
                        String(chat._id) === String(conversationId)
                            ? { ...chat, unreadCount: count }
                            : chat
                    ),
                };
            });
        };

        const handleMessagesSeen = ({ by, seenAt } = {}) => {
            const { authUser } = useAuthStore.getState();
            if (String(get().selectedUser?._id) !== String(by)) return;
            set((state) => ({
                messages: state.messages.map((message) =>
                    String(message.Sender) === String(authUser?._id) &&
                    String(message.Reciever) === String(by) &&
                    !message.seen &&
                    new Date(message.createdAt).getTime() <= new Date(seenAt).getTime()
                        ? { ...message, seen: true, seenAt }
                        : message
                ),
            }));
        };

        const handleMessageEdited = (updatedMessage) => {
            set((state) => ({
                messages: state.messages.map((message) =>
                    String(message._id) === String(updatedMessage._id) ? updatedMessage : message
                ),
            }));
        };

        const handleMessageDeleted = ({ messageId, reason } = {}) => {
            set((state) => ({
                messages: state.messages.map((message) =>
                    String(message._id) === String(messageId)
                        ? {
                            ...message,
                            isDeleted: true,
                            text: null,
                            image: null,
                            mediaUrl: null,
                            mediaType: null,
                            mediaName: null,
                            deleteReason: reason,
                        }
                        : message
                ),
                chats: state.chats.map((chat) =>
                    String(chat.lastMessage?._id) === String(messageId)
                        ? { ...chat, lastMessage: { ...chat.lastMessage, isDeleted: true, text: null, image: null, mediaType: null } }
                        : chat
                ),
            }));
        };

        const handleBlockedByUser = ({ blockerId } = {}) => {
            if (String(get().selectedUser?._id) === String(blockerId)) {
                toast.error("You have been blocked by this user");
            }
        };

        const handleCallEventUpdated = (callEvent) => {
            const { authUser } = useAuthStore.getState();
            if (
                !callEvent?.callId ||
                !callEvent.callerId ||
                !callEvent.receiverId ||
                !authUser?._id
            ) {
                return;
            }

            const currentUserId = String(authUser._id);
            const callerId = String(callEvent.callerId);
            const receiverId = String(callEvent.receiverId);
            if (callerId !== currentUserId && receiverId !== currentUserId) return;

            const conversationId = callerId === currentUserId ? receiverId : callerId;
            if (String(get().selectedUser?._id) !== conversationId) return;

            set((state) => ({
                callEventsConversationId: conversationId,
                callEvents: upsertCallEvent(
                    state.callEventsConversationId === conversationId ? state.callEvents : [],
                    callEvent
                ),
            }));
        };

        messageSocketHandlers = {
            newMessage: handleNewMessage,
            unreadCountUpdated: handleUnreadCount,
            messagesSeen: handleMessagesSeen,
            messageEdited: handleMessageEdited,
            messageDeleted: handleMessageDeleted,
            blockedByUser: handleBlockedByUser,
            callEventUpdated: handleCallEventUpdated,
        };
        subscribedMessageSocket = socket;
        Object.entries(messageSocketHandlers).forEach(([eventName, handler]) => {
            socket.on(eventName, handler);
        });

    },

    unsubscribeFromMessages: () => {
        if (!subscribedMessageSocket || !messageSocketHandlers) return;
        Object.entries(messageSocketHandlers).forEach(([eventName, handler]) => {
            subscribedMessageSocket.off(eventName, handler);
        });
        subscribedMessageSocket = null;
        messageSocketHandlers = null;
    },

}))