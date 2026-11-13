
import { Server } from "socket.io";
import http from "http";
import express from "express";
import { randomUUID } from "node:crypto";
import { socketAuthMiddleware } from "../middleware/socket.middleware.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

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
const callSessions = new Map();
const userActiveCallMap = new Map();
const callTimers = new Map();
const CALL_RING_TIMEOUT_MS = 45_000;

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

const isValidUserId = (id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);

function finishCall(callId, reason, { rejected = false } = {}) {
    const call = callSessions.get(callId);
    if (!call) return false;

    clearTimeout(callTimers.get(callId));
    callTimers.delete(callId);
    callSessions.delete(callId);

    if (userActiveCallMap.get(call.callerId) === callId) {
        userActiveCallMap.delete(call.callerId);
    }
    if (userActiveCallMap.get(call.receiverId) === callId) {
        userActiveCallMap.delete(call.receiverId);
    }

    if (rejected) {
        io.to(call.callerSocketId).emit("callRejected", { callId, reason });
    } else {
        io.to(call.callerSocketId).emit("callEnded", { callId, reason });
        io.to(call.receiverSocketId).emit("callEnded", { callId, reason });
    }

    return true;
}

function failCallRequest(callback, message) {
    callback?.({ success: false, message });
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

    // CALL SIGNALING: the authenticated socket identity is always authoritative.
    socket.on("callUser", async ({ receiverId, callType, offer } = {}, callback) => {
        const targetId = typeof receiverId === "string" ? receiverId : "";
        if (
            !isValidUserId(targetId) ||
            targetId === userId ||
            !["audio", "video"].includes(callType) ||
            offer?.type !== "offer" ||
            typeof offer.sdp !== "string" ||
            offer.sdp.length > 128_000
        ) {
            failCallRequest(callback, "Invalid call request");
            return;
        }

        if (userActiveCallMap.has(userId) || userActiveCallMap.has(targetId)) {
            failCallRequest(callback, "One of the users is already on a call");
            return;
        }

        const receiverSocketId = getReceiverSocketIds(targetId)[0];
        if (!receiverSocketId) {
            failCallRequest(callback, "This user is unavailable");
            return;
        }

        const callId = randomUUID();
        userActiveCallMap.set(userId, callId);
        userActiveCallMap.set(targetId, callId);

        try {
            const [caller, receiver] = await Promise.all([
                User.findById(userId).select("blockedUsers").maxTimeMS(5000).lean(),
                User.findById(targetId).select("fullName profilepic blockedUsers").maxTimeMS(5000).lean(),
            ]);

            if (!caller || !receiver || !socket.connected || !getReceiverSocketIds(targetId).includes(receiverSocketId)) {
                if (userActiveCallMap.get(userId) === callId) userActiveCallMap.delete(userId);
                if (userActiveCallMap.get(targetId) === callId) userActiveCallMap.delete(targetId);
                failCallRequest(callback, "This user is unavailable");
                return;
            }

            const callerBlockedReceiver = (caller.blockedUsers || []).some(
                (blockedId) => String(blockedId) === targetId
            );
            const receiverBlockedCaller = (receiver.blockedUsers || []).some(
                (blockedId) => String(blockedId) === userId
            );
            if (callerBlockedReceiver || receiverBlockedCaller) {
                userActiveCallMap.delete(userId);
                userActiveCallMap.delete(targetId);
                failCallRequest(callback, "Unable to call this user");
                return;
            }

            const call = {
                callId,
                callerId: userId,
                receiverId: targetId,
                callerSocketId: socket.id,
                receiverSocketId,
                callType,
                status: "ringing",
            };
            callSessions.set(callId, call);
            callTimers.set(callId, setTimeout(() => {
                finishCall(callId, "timeout");
            }, CALL_RING_TIMEOUT_MS));

            io.to(receiverSocketId).emit("incomingCall", {
                callId,
                caller: {
                    _id: userId,
                    fullName: socket.user.fullName,
                    profilepic: socket.user.profilepic,
                },
                callType,
                offer,
            });
            callback?.({ success: true, callId });
        } catch (error) {
            if (userActiveCallMap.get(userId) === callId) userActiveCallMap.delete(userId);
            if (userActiveCallMap.get(targetId) === callId) userActiveCallMap.delete(targetId);
            console.error("Call setup error:", error);
            failCallRequest(callback, "Could not start the call");
        }
    });

    socket.on("acceptCall", ({ callId, answer } = {}, callback) => {
        const call = callSessions.get(callId);
        if (
            !call ||
            call.receiverId !== userId ||
            call.receiverSocketId !== socket.id ||
            call.status !== "ringing" ||
            answer?.type !== "answer" ||
            typeof answer.sdp !== "string" ||
            answer.sdp.length > 128_000
        ) {
            failCallRequest(callback, "This call can no longer be accepted");
            return;
        }

        call.status = "active";
        clearTimeout(callTimers.get(callId));
        callTimers.delete(callId);
        io.to(call.callerSocketId).emit("callAccepted", { callId, answer });
        callback?.({ success: true });
    });

    socket.on("rejectCall", ({ callId } = {}, callback) => {
        const call = callSessions.get(callId);
        if (
            !call ||
            call.receiverId !== userId ||
            call.receiverSocketId !== socket.id ||
            call.status !== "ringing"
        ) {
            failCallRequest(callback, "This call can no longer be rejected");
            return;
        }

        finishCall(callId, "rejected", { rejected: true });
        callback?.({ success: true });
    });

    socket.on("iceCandidate", ({ callId, candidate } = {}) => {
        const call = callSessions.get(callId);
        if (
            !call ||
            !candidate ||
            typeof candidate.candidate !== "string" ||
            candidate.candidate.length > 4096
        ) {
            return;
        }

        const senderIsCaller = call.callerId === userId && call.callerSocketId === socket.id;
        const senderIsReceiver = call.receiverId === userId && call.receiverSocketId === socket.id;
        if (!senderIsCaller && !senderIsReceiver) return;

        const recipientSocketId = senderIsCaller ? call.receiverSocketId : call.callerSocketId;
        io.to(recipientSocketId).emit("iceCandidate", { callId, candidate });
    });

    socket.on("endCall", ({ callId } = {}, callback) => {
        const call = callSessions.get(callId);
        if (
            !call ||
            !(
                (call.callerId === userId && call.callerSocketId === socket.id) ||
                (call.receiverId === userId && call.receiverSocketId === socket.id)
            )
        ) {
            failCallRequest(callback, "This call is no longer active");
            return;
        }

        finishCall(callId, "ended");
        callback?.({ success: true });
    });

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

        const activeCallId = userActiveCallMap.get(userId);
        const activeCall = callSessions.get(activeCallId);
        if (
            activeCall &&
            (activeCall.callerSocketId === socket.id || activeCall.receiverSocketId === socket.id)
        ) {
            finishCall(activeCallId, "disconnected");
        }

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
