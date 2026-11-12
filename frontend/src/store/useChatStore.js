import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";


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
        if (!userId) {
            set({ messages: [], isMessagesLoading: false });
            return;
        }
        set({ isMessagesLoading: true, messages: [] })
        try {
            const res = await axiosInstance.get(`/messages/${userId}`);
            set({ messages: res.data })
        } catch (error) {
            set({ messages: [] })
            toast.error(error.response?.data?.message ?? "Failed to load messages")
        } finally {
            set({ isMessagesLoading: false })
        }
    },

    sendMessage: async (messageData) => {
        const { selectedUser } = get();
        const { authUser } = useAuthStore.getState();

        const tempId = `temp-${Date.now()}`;

        const optimisticMessage = {
            _id: tempId,
            senderId: authUser._id,   //
            receiverId: selectedUser._id,
            text: messageData.text,
            image: messageData.image,
            createdAt: new Date().toISOString(),
            isOptimistic: true,
        };

        set((state) => ({ messages: [...state.messages, optimisticMessage] }));

        try {
            const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
            // Use functional update to get fresh state, replace optimistic msg
            set((state) => ({
                messages: state.messages
                    .filter((m) => m._id !== tempId)
                    .concat(res.data)
            }));
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
        if (!socket || !senderId) return;

        // Socket se server ko batao - server DB update karega + sender ko notify karega
        socket.emit("markAsSeen", { senderId });

        // Local state bhi update karo - jo messages aye hain unhe seen dikhao
        set((state) => ({
            messages: state.messages.map((msg) =>
                msg.Sender === senderId && !msg.seen
                    ? { ...msg, seen: true, seenAt: new Date().toISOString() }
                    : msg
            )
        }));
    },

    deleteMessage: (messageId, reason) => {
        const socket = useAuthStore.getState().socket;
        if (socket) {
            socket.emit("deleteMessage", { messageId, reason });
        }
        // Local state mein turant soft delete karo
        set((state) => ({
            messages: state.messages.map((msg) =>
                msg._id === messageId
                    ? { ...msg, isDeleted: true, text: null, image: null, deleteReason: reason || null }
                    : msg
            )
        }));
    },

    editMessage: async (messageId, newText) => {
        const socket = useAuthStore.getState().socket;
        // Socket se send karo (fast)
        if (socket) {
            socket.emit("editMessage", { messageId, text: newText });
        }
        // Local state update karo turant
        set((state) => ({
            messages: state.messages.map((msg) =>
                msg._id === messageId
                    ? { ...msg, text: newText, isEdited: true, editedAt: new Date().toISOString() }
                    : msg
            )
        }));
    },

    subscribeToMessages: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        socket.off("newMessage");
        socket.off("messagesSeen"); // ✅ Pehle clean karo
        socket.off("messageEdited");
        socket.off("userBlocked");
        socket.off("messageDeleted");

        socket.on("newMessage", (newMessage) => {
            const { selectedUser } = get();
            const isMessageSentFromSelectedUser = newMessage.Sender === selectedUser?._id;

            if (!isMessageSentFromSelectedUser) {
                set((state) => ({
                    unreadMessages: { ...state.unreadMessages, [newMessage.Sender]: true },
                    chats: [
                        { ...state.chats.find(c => c._id === newMessage.Sender) },
                        ...state.chats.filter(c => c._id !== newMessage.Sender)
                    ]
                }));
                return;
            }

            set((state) => ({ messages: [...state.messages, newMessage] }));

            // ✅ FEATURE 1: Jab message aaye aur chat open ho - turant seen mark karo
            const { selectedUser: currentSelectedUser } = get();
            if (currentSelectedUser?._id === newMessage.Sender) {
                get().markAsSeen(newMessage.Sender);
            }
        });

        // ✅ FEATURE 1: Sender side - jab receiver dekhe to apne messages update karo
        socket.on("messagesSeen", ({ by, seenAt }) => {
            const { selectedUser } = get();

            // Agar jo message dekha wo same selected user ne dekha
            if (selectedUser?._id === by) {
                set((state) => ({
                    messages: state.messages.map((msg) => {
                        const { authUser } = useAuthStore.getState();
                        // Sirf apne bheje hue messages update karo
                        if (msg.Sender === authUser._id && !msg.seen) {
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
                    msg._id === updatedMessage._id ? updatedMessage : msg
                )
            }));
        });
        socket.on("messageDeleted", ({ messageId, reason }) => {
            set((state) => ({
                messages: state.messages.map((msg) =>
                    msg._id === messageId
                        ? { ...msg, isDeleted: true, text: null, image: null, deleteReason: reason }
                        : msg
                )
            }));

            // ✅ Idea 1 — 5 seconds baad placeholder bhi hatao (receiver side)
            setTimeout(() => {
                set((state) => ({
                    messages: state.messages.filter((msg) => msg._id !== messageId)
                }));
            }, 5000);
        });
        socket.on("userBlocked", ({ blockedBy }) => {
            const { selectedUser } = get();
            // Agar jis user se chat chal rahi hai usne block kiya
            if (selectedUser?._id === blockedBy) {
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
        socket.off("userBlocked");
        socket.off("messageDeleted");
    },

}))