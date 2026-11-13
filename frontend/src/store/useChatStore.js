import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

let messagesRequestId = 0;

export const useChatStore = create((set, get) => ({
    allcontacts: [],
    messages: [],
    chats: [],
    ActiveTab: "chats",
    selectedUser: null,
    isUsersLoading: false,
    isMessagesLoading: false,

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
            set({ chats: res.data })
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

    clearUnread: (userId) => {
        set((state) => {
            const updated = { ...state.unreadMessages };
            delete updated[userId];
            return { unreadMessages: updated };
        });
    },
    // ✅ FEATURE 1: Mark messages as seen via Socket
    // Jab user kisi ka chat open kare - ye call karo
    markAsSeen: (senderId) => {
        const socket = useAuthStore.getState().socket;
        if (!socket?.connected || !senderId) return;

        // Socket se server ko batao - server DB update karega + sender ko notify karega
        socket.emit("markAsSeen", { senderId });

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

        socket.off("newMessage");
        socket.off("messagesSeen"); // ✅ Pehle clean karo
        socket.off("messageEdited");
        socket.off("blockedByUser");
        socket.off("messageDeleted");

        socket.on("newMessage", (newMessage) => {
            const { selectedUser } = get();
            const { authUser } = useAuthStore.getState();
            const isIncoming = String(newMessage.Reciever) === String(authUser?._id);
            const peerId = isIncoming ? newMessage.Sender : newMessage.Reciever;
            const hasChat = get().chats.some(
                (chat) => String(chat._id) === String(peerId)
            );
            const isMessageInSelectedConversation =
                String(peerId) === String(selectedUser?._id);

            if (!isMessageInSelectedConversation) {
                set((state) => ({
                    unreadMessages: isIncoming
                        ? { ...state.unreadMessages, [peerId]: true }
                        : state.unreadMessages,
                    chats: hasChat
                        ? [
                            state.chats.find((chat) => String(chat._id) === String(peerId)),
                            ...state.chats.filter((chat) => String(chat._id) !== String(peerId)),
                        ]
                        : state.chats,
                }));
                if (isIncoming && !hasChat) {
                    get().getMyChatPartners();
                }
                return;
            }

            set((state) => ({
                messages: state.messages.some((message) => String(message._id) === String(newMessage._id))
                    ? state.messages
                    : [...state.messages, newMessage],
            }));
            if (!hasChat) {
                get().getMyChatPartners();
            }

            // ✅ FEATURE 1: Jab message aaye aur chat open ho - turant seen mark karo
            const { selectedUser: currentSelectedUser } = get();
            if (
                isIncoming &&
                String(currentSelectedUser?._id) === String(newMessage.Sender)
            ) {
                get().markAsSeen(newMessage.Sender);
            }
        });

        // ✅ FEATURE 1: Sender side - jab receiver dekhe to apne messages update karo
        socket.on("messagesSeen", ({ by, seenAt }) => {
            const { selectedUser } = get();

            // Agar jo message dekha wo same selected user ne dekha
            if (String(selectedUser?._id) === String(by)) {
                set((state) => ({
                    messages: state.messages.map((msg) => {
                        const { authUser } = useAuthStore.getState();
                        // Sirf apne bheje hue messages update karo
                        if (String(msg.Sender) === String(authUser?._id) && !msg.seen) {
                            return { ...msg, seen: true, seenAt };
                        }
                        return msg;
                    })
                }));
            }
        });

        socket.on("messageEdited", (updatedMessage) => {
            set((state) => ({
                messages: state.messages.map((msg) =>
                    String(msg._id) === String(updatedMessage._id) ? updatedMessage : msg
                )
            }));
        });
        socket.on("messageDeleted", ({ messageId, reason }) => {
            set((state) => ({
                messages: state.messages.map((msg) =>
                    String(msg._id) === String(messageId)
                        ? { ...msg, isDeleted: true, text: null, image: null, deleteReason: reason }
                        : msg
                )
            }));

            // ✅ Idea 1 — 5 seconds baad placeholder bhi hatao (receiver side)
            setTimeout(() => {
                set((state) => ({
                    messages: state.messages.filter(
                        (msg) => String(msg._id) !== String(messageId)
                    )
                }));
            }, 5000);
        });
        socket.on("blockedByUser", ({ blockerId }) => {
            const { selectedUser } = get();
            // Agar jis user se chat chal rahi hai usne block kiya
            if (String(selectedUser?._id) === String(blockerId)) {
                toast.error("You have been blocked by this user");
            }
        });

    },

    unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;
        socket.off("newMessage");
        socket.off("messagesSeen"); // ✅ Clean up
        socket.off("messageEdited");
        socket.off("blockedByUser");
        socket.off("messageDeleted");
    },

}))