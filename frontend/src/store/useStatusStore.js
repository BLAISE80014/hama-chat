import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

let statusSocket = null;
let statusHandlers = null;

const groupStatuses = (statuses) => {
    const groups = new Map();
    statuses.forEach((status) => {
        const ownerId = String(status.userId?._id || "");
        if (!ownerId) return;
        if (!groups.has(ownerId)) {
            groups.set(ownerId, {
                user: status.userId,
                statuses: [],
            });
        }
        groups.get(ownerId).statuses.push(status);
    });

    return [...groups.values()]
        .map((group) => ({
            ...group,
            statuses: group.statuses.sort(
                (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
            ),
        }))
        .sort((a, b) =>
            new Date(b.statuses.at(-1)?.createdAt || 0) -
            new Date(a.statuses.at(-1)?.createdAt || 0)
        );
};

const removeStatusFromGroups = (groups, statusId) =>
    groups
        .map((group) => ({
            ...group,
            statuses: group.statuses.filter((status) => String(status._id) !== String(statusId)),
        }))
        .filter((group) => group.statuses.length);

export const useStatusStore = create((set, get) => ({
    statusGroups: [],
    isLoadingStatuses: false,
    activeViewerUserId: null,

    loadStatuses: async () => {
        set({ isLoadingStatuses: true });
        try {
            const response = await axiosInstance.get("/statuses");
            set({ statusGroups: groupStatuses(response.data.statuses || []) });
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not load statuses");
        } finally {
            set({ isLoadingStatuses: false });
        }
    },

    createStatus: async (statusData) => {
        try {
            const response = await axiosInstance.post("/statuses", statusData);
            const status = response.data.status;
            set((state) => ({
                statusGroups: groupStatuses([
                    ...state.statusGroups.flatMap((group) => group.statuses),
                    status,
                ]),
            }));
            return status;
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not post status");
            return null;
        }
    },

    deleteStatus: async (statusId) => {
        try {
            await axiosInstance.delete(`/statuses/${statusId}`);
            set((state) => ({
                statusGroups: removeStatusFromGroups(state.statusGroups, statusId),
            }));
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not delete status");
            return false;
        }
    },

    recordView: async (statusId) => {
        try {
            const response = await axiosInstance.post(`/statuses/${statusId}/view`);
            set((state) => ({
                statusGroups: state.statusGroups.map((group) => ({
                    ...group,
                    statuses: group.statuses.map((status) =>
                        String(status._id) === String(statusId)
                            ? { ...status, viewedByMe: true }
                            : status
                    ),
                })),
            }));
            return response.data.viewed;
        } catch (error) {
            if (error.response?.status !== 404) {
                toast.error(error.response?.data?.message || "Could not record status view");
            }
            return false;
        }
    },

    getViewers: async (statusId) => {
        try {
            const response = await axiosInstance.get(`/statuses/${statusId}/viewers`);
            return response.data.viewers || [];
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not load status viewers");
            return null;
        }
    },

    openViewer: (userId) => set({ activeViewerUserId: String(userId) }),
    closeViewer: () => set({ activeViewerUserId: null }),

    subscribeToStatusEvents: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return () => {};
        if (statusSocket && statusHandlers) {
            Object.entries(statusHandlers).forEach(([eventName, handler]) => {
                statusSocket.off(eventName, handler);
            });
        }

        const handleCreated = () => {
            void get().loadStatuses();
        };
        const handleRemoved = ({ statusId } = {}) => {
            if (!statusId) return;
            set((state) => ({
                statusGroups: removeStatusFromGroups(state.statusGroups, statusId),
            }));
        };
        const handleViewed = ({ statusId } = {}) => {
            if (!statusId) return;
            set((state) => ({
                statusGroups: state.statusGroups.map((group) => ({
                    ...group,
                    statuses: group.statuses.map((status) =>
                        String(status._id) === String(statusId)
                            ? { ...status, viewerCount: (status.viewerCount || 0) + 1 }
                            : status
                    ),
                })),
            }));
        };

        statusHandlers = {
            statusCreated: handleCreated,
            statusDeleted: handleRemoved,
            statusExpired: handleRemoved,
            statusViewed: handleViewed,
        };
        statusSocket = socket;
        Object.entries(statusHandlers).forEach(([eventName, handler]) => {
            socket.on(eventName, handler);
        });

        return () => {
            if (statusSocket !== socket || !statusHandlers) return;
            Object.entries(statusHandlers).forEach(([eventName, handler]) => {
                socket.off(eventName, handler);
            });
            statusSocket = null;
            statusHandlers = null;
        };
    },
}));
