
import { Server } from "socket.io";
import http from "http";
import express from "express";
import { socketAuthMiddleware } from "../middleware/socket.middleware.js";
import Message from "../models/Message.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: [
            "https://hama-chat-rw.vercel.app",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
        ],
        credentials: true,
        methods: ["GET", "POST"],
    },
});

io.use(socketAuthMiddleware);

// Store multiple active connections for each user.
const userSocketMap = new Map();

export function getReceiverSocketId(userId) {
    const sockets = userSocketMap.get(String(userId));
    return sockets?.values().next().value;
}

export function getReceiverSocketIds(userId) {
    return [...(userSocketMap.get(String(userId)) || [])];
}

export function getOnlineUserIds() {
    return [...userSocketMap.keys()];
}

function emitOnlineUsers() {
    io.emit("getOnlineUsers", getOnlineUserIds());
}

io.on("connection", (socket) => {
    const userId = String(socket.userId);

    console.log("SOCKET CONNECTED:", {
        name: socket.user?.fullName,
        userId,
        socketId: socket.id,
    });

    // Register this user's socket.
    if (!userSocketMap.has(userId)) {
        userSocketMap.set(userId, new Set());
    }

    userSocketMap.get(userId).add(socket.id);

    emitOnlineUsers();

    // TYPING INDICATOR
    socket.on("typing", ({ receiverId } = {}, callback) => {
        try {
            if (!receiverId || String(receiverId) === userId) {
                callback?.({
                    success: false,
                    message: "Receiver ID is required",
                });
                return;
            }

            const receiverSocketIds = getReceiverSocketIds(receiverId);

            console.log("TYPING EVENT RECEIVED:", {
                senderId: userId,
                receiverId: String(receiverId),
                receiverSockets: receiverSocketIds.length,
            });

            receiverSocketIds.forEach((socketId) => {
                io.to(socketId).emit("userTyping", {
                    senderId: userId,
                });
            });
            console.log("TYPING EVENT SENT TO RECEIVER:", {
                receiverId: String(receiverId),
                deliveredTo: receiverSocketIds.length,
            });

            callback?.({
                success: true,
                deliveredTo: receiverSocketIds.length,
            });
        } catch (error) {
            console.error("Typing event error:", error);

            callback?.({
                success: false,
                message: "Could not send typing event",
            });
        }
    });

    // STOP TYPING
    socket.on("stopTyping", ({ receiverId } = {}) => {
        if (!receiverId || String(receiverId) === userId) return;

        const receiverSocketIds = getReceiverSocketIds(receiverId);

        console.log("STOP TYPING EVENT RECEIVED:", {
            senderId: userId,
            receiverId: String(receiverId),
        });

        receiverSocketIds.forEach((socketId) => {
            io.to(socketId).emit("userStoppedTyping", {
                senderId: userId,
            });
        });
        console.log("STOP TYPING EVENT SENT TO RECEIVER:", {
            receiverId: String(receiverId),
            deliveredTo: receiverSocketIds.length,
        });
    });

    // MARK MESSAGES AS SEEN
    socket.on("markAsSeen", async ({ senderId } = {}) => {
        try {
            if (!senderId || String(senderId) === userId) return;

            const receiverId = userId;
            const seenAt = new Date();

            const result = await Message.updateMany(
                {
                    Sender: senderId,
                    Reciever: receiverId,
                    seen: false,
                },
                {
                    $set: {
                        seen: true,
                        seenAt,
                    },
                }
            );

            if (result.modifiedCount === 0) return;

            const senderSocketIds = getReceiverSocketIds(senderId);

            senderSocketIds.forEach((id) => {
                io.to(id).emit("messagesSeen", {
                    by: receiverId,
                    seenAt,
                });
            });
        } catch (error) {
            console.error("Error in markAsSeen:", error);
        }
    });

    // BLOCK USER
    socket.on("blockUser", ({ targetId } = {}) => {
        if (!targetId) return;

        const targetSocketIds = getReceiverSocketIds(targetId);

        targetSocketIds.forEach((id) => {
            io.to(id).emit("blockedByUser", {
                blockerId: userId,
            });
        });
    });

    // DELETE MESSAGE
    socket.on("deleteMessage", async ({ messageId, reason } = {}, callback) => {
        try {
            const message = await Message.findById(messageId);

            if (!message) {
                callback?.({ success: false, message: "Message not found" });
                return;
            }
            if (String(message.Sender) !== userId) {
                callback?.({ success: false, message: "You can only delete your own messages" });
                return;
            }
            if (message.isDeleted) {
                callback?.({ success: true });
                return;
            }

            const validReasons = ["Sent by mistake", "Wrong person", "Private"];
            if (reason && !validReasons.includes(reason)) {
                callback?.({ success: false, message: "Invalid delete reason" });
                return;
            }

            message.isDeleted = true;
            message.deletedAt = new Date();
            message.deleteReason = reason || null;
            message.text = null;
            message.image = null;

            await message.save();

            const payload = {
                messageId: message._id,
                reason: message.deleteReason,
            };

            const participantSocketIds = new Set([
                ...getReceiverSocketIds(message.Sender),
                ...getReceiverSocketIds(message.Reciever),
            ]);
            participantSocketIds.forEach((id) => {
                io.to(id).emit("messageDeleted", payload);
            });
            callback?.({ success: true });
        } catch (error) {
            console.error("Error in deleteMessage:", error);
            callback?.({ success: false, message: "Could not delete message" });
        }
    });

    // EDIT MESSAGE
    socket.on("editMessage", async ({ messageId, text } = {}, callback) => {
        try {
            const message = await Message.findById(messageId);

            if (!message) {
                callback?.({ success: false, message: "Message not found" });
                return;
            }
            if (String(message.Sender) !== userId) {
                callback?.({ success: false, message: "You can only edit your own messages" });
                return;
            }
            if (message.isDeleted || typeof text !== "string" || !text.trim() || text.length > 2000) {
                callback?.({ success: false, message: "Invalid message text" });
                return;
            }

            const tenMinutes = 10 * 60 * 1000;

            if (
                Date.now() - new Date(message.createdAt).getTime() >
                tenMinutes
            ) {
                callback?.({ success: false, message: "You can only edit messages within 10 minutes" });
                return;
            }

            message.text = text.trim();
            message.isEdited = true;
            message.editedAt = new Date();

            await message.save();

            const participantSocketIds = new Set([
                ...getReceiverSocketIds(message.Sender),
                ...getReceiverSocketIds(message.Reciever),
            ]);
            participantSocketIds.forEach((id) => {
                io.to(id).emit("messageEdited", message);
            });
            callback?.({ success: true });
        } catch (error) {
            console.error("Error in editMessage:", error);
            callback?.({ success: false, message: "Could not edit message" });
        }
    });

    // DISCONNECT
    socket.on("disconnect", (reason) => {
        console.log("SOCKET DISCONNECTED:", {
            userId,
            socketId: socket.id,
            reason,
        });

        const userSockets = userSocketMap.get(userId);

        if (userSockets) {
            userSockets.delete(socket.id);

            if (userSockets.size === 0) {
                userSocketMap.delete(userId);
            }
        }

        emitOnlineUsers();
    });
});

export { io, app, server };
