import { Server } from 'socket.io';
import http from 'http';
import express from 'express';
import { ENV } from './env.js';
import { socketAuthMiddleware } from '../middleware/socket.middleware.js';
import Message from '../models/Message.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["https://hama-chats.vercel.app", "http://localhost:5173"],
        credentials: true,
    },
});

// Apply authentication middleware for all socket connections
io.use(socketAuthMiddleware)

// Check if user is online
export function getReceiverSocketId(userId) {
    return userSocketMap[userId]
}

// Store online users
const userSocketMap = {}; // {userId : socketId}

io.on("connection", (socket) => {
    console.log("A user connected", socket.user.fullName);

    const userId = socket.userId;

    userSocketMap[userId] = socket.id

    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // ✅ FEATURE 1: Socket se seen mark karna
    // Jab receiver chat open kare to sender ko real-time notify karo
    socket.on("markAsSeen", async ({ senderId }) => {
        try {
            const receiverId = userId; // jo socket se connected hai wo receiver hai

            // DB mein seen update karo
            const result = await Message.updateMany(
                {
                    Sender: senderId,
                    Reciever: receiverId,
                    seen: false,
                },
                {
                    $set: {
                        seen: true,
                        seenAt: new Date(),
                    }
                }
            );

            // Sender ko real-time notify karo - uske messages seen ho gaye
            const senderSocketId = getReceiverSocketId(senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit("messagesSeen", {
                    by: receiverId,     // kisne dekha
                    seenAt: new Date(), // kab dekha
                });
            }
        } catch (error) {
            console.error("Error in markAsSeen socket event:", error);
        }
    });

    socket.on("blockUser", ({ targetId }) => {
        const targetSocketId = getReceiverSocketId(targetId);
        if (targetSocketId) {
            // Blocked user ko batao ki tum offline dikho us user ke liye
            io.to(targetSocketId).emit("blockedByUser", { blockerId: userId });
        }
    });
    socket.on("deleteMessage", async ({ messageId, reason }) => {
        try {
            const message = await Message.findById(messageId);
            if (!message) return;
            if (message.Sender.toString() !== userId) return;

            message.isDeleted = true;
            message.deletedAt = new Date();
            message.deleteReason = reason || null;
            message.text = null;
            message.image = null;
            await message.save();

            // Sender ko confirm karo
            io.to(socket.id).emit("messageDeleted", {
                messageId: message._id,
                reason: message.deleteReason,
            });

            // Receiver ko notify karo
            const receiverSocketId = getReceiverSocketId(message.Reciever.toString());
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("messageDeleted", {
                    messageId: message._id,
                    reason: message.deleteReason,
                });
            }
        } catch (error) {
            console.error("Error in deleteMessage socket:", error);
        }
    });

    socket.on("editMessage", async ({ messageId, text }) => {
        try {
            const message = await Message.findById(messageId);
            if (!message) return;

            if (message.Sender.toString() !== userId) return;

            const tenMinutes = 10 * 60 * 1000;
            if (Date.now() - new Date(message.createdAt).getTime() > tenMinutes) return;

            message.text = text;
            message.isEdited = true;
            message.editedAt = new Date();
            await message.save();

            // Sender ko confirm karo
            io.to(socket.id).emit("messageEdited", message);

            // Receiver ko bhi notify karo
            const receiverSocketId = getReceiverSocketId(message.Reciever.toString());
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("messageEdited", message);
            }
        } catch (error) {
            console.error("Error in editMessage socket:", error);
        }
    });

    socket.on("disconnect", () => {
        console.log("A User is Disconnected", socket.user.fullName);
        delete userSocketMap[userId];
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    })
})

export { io, app, server }