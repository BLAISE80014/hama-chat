import { create } from 'zustand'
import { axiosInstance } from '../lib/axios'
import { toast } from "react-hot-toast"
import { io } from "socket.io-client";

// const BASE_URL = import.meta.env.MODE === 'development' ? 'http://localhost:5000' : '/'
const BASE_URL = 'https://hama-chats-1.onrender.com'

// const BASE_URL = 'http://localhost:5000'

export const useAuthStore = create((set, get) => ({
    authUser: null,
    isCheckingAuth: true,
    isSigningUp: false,
    isLogin: false,
    isUpdatingProfile: false, // Added for UI loading states
    isResettingPassword: false,


    socket: null,
    onlineUsers: [],
    blockedUsers: [],


    checkAuth: async () => {
        try {
            const res = await axiosInstance.get('/auth/check');
            set({ authUser: res.data })
            get().connectSocket()
        } catch (error) {
            console.error("Error checking auth:", error);
            set({ authUser: null })
        }
        finally {
            set({ isCheckingAuth: false })
        }
    },

    signup: async (data) => {
        set({ isSigningUp: true });
        try {
            const res = await axiosInstance.post("/auth/signup", data);
            set({ authUser: res.data })
            toast.success("Account Created Successfully");
            get().connectSocket()
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong")
        }
        finally {
            set({ isSigningUp: false })
        }
    },

    login: async (data) => {
        set({ isLogin: true })
        try {
            const res = await axiosInstance.post("/auth/login", data);
            set({ authUser: res.data })
            toast.success("Logged In successfully");
            get().connectSocket()
        } catch (error) {
            toast.error(error.response?.data?.message || "Login Error");
        }
        finally {
            set({ isLogin: false })
        }
    },

    logout: async () => {
        try {
            const res = await axiosInstance.post('/auth/logout');
            set({ authUser: null })
            toast.success("Logged Out Successfully")
            get().disconnectSocket();
        } catch (error) {
            toast.error(error.response?.data?.message)
        }
    },

    updateProfilePicture: async (data) => {
        try {
            const res = await axiosInstance.put('/auth/update-profile', data);
            set({ authUser: res.data });
            toast.success("Profile Picture Updated Successfully");
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong");
            console.error("Error updating profile picture:", error);
        }
    },

    // ─── NEW ACTIONS FOR SECURITY & PASSWORD ───

    // Add this inside your useAuthStore create block
    updateUserDetails: async (data) => {
        set({ isUpdatingProfile: true });
        try {
            const res = await axiosInstance.put('/auth/update-details', data);
            // We use res.data.user because that is what the controller sends back
            set({ authUser: res.data.user });
            toast.success("Profile updated successfully");
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update profile");
            return false;
        } finally {
            set({ isUpdatingProfile: false });
        }
    },
    getSecurityQuestion: async (email) => {
        try {
            const res = await axiosInstance.post("/auth/get-security-question", { email });
            return res.data.securityQuestion;
        } catch (error) {
            toast.error(error.response?.data?.message || "User not found");
            return null;
        }
    },

    verifySecurityAnswer: async (data) => {
        try {
            const res = await axiosInstance.post("/auth/verify-security-answer", data);
            toast.success("Answer Verified");
            return res.data.userId; // Return userId for the next step (reset)
        } catch (error) {
            toast.error(error.response?.data?.message || "Verification Failed");
            return null;
        }
    },

    resetPassword: async (data) => {
        set({ isResettingPassword: true });
        try {
            await axiosInstance.post("/auth/reset-password", data);
            toast.success("Password reset successfully! You can now login.");
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to reset password");
            return false;
        } finally {
            set({ isResettingPassword: false });
        }
    },

    // useAuthStore.js
    changePassword: async (passwordData) => {
        set({ isUpdatingProfile: true }); // ADD THIS
        try {
            const res = await axiosInstance.put("/auth/change-password", passwordData);
            toast.success("Password changed successfully!");
            return true;
        } catch (error) {
            const message = error.response?.data?.message || "Failed to change password";
            toast.error(message);
            console.error("Change Password Error:", error);
            return false;
        } finally {
            set({ isUpdatingProfile: false }); // ADD THIS
        }
    },

    connectSocket: () => {
        const { authUser } = get();
        if (!authUser || get().socket?.connected) return;

        const socket = io(BASE_URL, {
            withCredentials: true, //this ensure cookies are senet with the connection
        });

        socket.connect();

        set({ socket });

        //listening for connection errors 

        socket.on("getOnlineUsers", (userIds) => {
            set({ onlineUsers: userIds });
        });

        socket.on("blockedByUser", ({ blockerId }) => {
            // Jis user ne block kiya, wo hamesha offline dikhe
            set((state) => ({
                onlineUsers: state.onlineUsers.filter((id) => id !== blockerId),
            }));
        });

    },

    fetchBlockedUsers: async () => {
        try {
            const res = await axiosInstance.get("/auth/blocked-users");
            set({ blockedUsers: res.data.blockedUsers });
        } catch (error) {
            console.error("Error fetching blocked users", error);
        }
    },

    toggleBlockUser: async (targetId) => {
        try {
            const res = await axiosInstance.put(`/auth/block/${targetId}`);
            const isNowBlocked = res.data.blocked;

            set((state) => ({
                blockedUsers: isNowBlocked
                    ? [...state.blockedUsers, targetId]
                    : state.blockedUsers.filter((id) => id !== targetId),
                // Block kiya to online list se hata do
                onlineUsers: isNowBlocked
                    ? state.onlineUsers.filter((id) => id !== targetId)
                    : state.onlineUsers,
            }));

            toast.success(res.data.message);
            return isNowBlocked;
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong");
        }
    },

    disconnectSocket: () => {
        if (get().socket?.connected) get().socket.disconnect();
    },


}))