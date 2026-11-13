import mongoose from "mongoose";
import Message from "../models/Message.js"
import User from '../models/User.js'

import { getReceiverSocketIds, io } from "../lib/socket.js";
import { uploadMessageMedia } from "../lib/mediaUpload.js";

const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id || ""));

const sendUnreadCount = async (userId, conversationId) => {
    const count = await Message.countDocuments({
        Reciever: userId,
        Sender: conversationId,
        seen: false,
        isDeleted: { $ne: true },
    });

    getReceiverSocketIds(userId).forEach((socketId) => {
        io.to(socketId).emit("unreadCountUpdated", {
            conversationId: String(conversationId),
            count,
        });
    });
    return count;
};

export const getAllContact = async (req, res) => {
    try {
        const loggedUser = req.user._id;

        const FilterUser = await User.find({ _id: { $ne: loggedUser } }).select("-password")

        res.status(200).json(FilterUser)
    } catch (error) {
        console.error("Error in getAllContact ", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export const getMessagesByUserId = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: usertochat } = req.params;
        if (!isValidObjectId(usertochat)) {
            return res.status(400).json({ message: "Invalid conversation user" });
        }

        const allmessages = await Message.find({
            $or: [
                { Sender: myId, Reciever: usertochat },
                { Sender: usertochat, Reciever: myId }
            ]
        }).sort({ createdAt: 1 })

        res.status(200).json(allmessages)
    } catch (error) {
        console.error("Error in getMessagesByUserId", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export const sendMessage = async (req, res) => {
    try {
        const {
            text,
            image,
            mediaData,
            mediaType,
            mediaName,
            mediaMimeType,
            mediaDuration,
        } = req.body;
        const { id: Reciever } = req.params;
        const Sender = req.user._id;
        if (!isValidObjectId(Reciever) || String(Reciever) === String(Sender)) {
            return res.status(400).json({ message: "Invalid message recipient" });
        }
        if (
            (typeof text === "string" && text.length > 2000) ||
            (text != null && typeof text !== "string") ||
            (image && mediaData) ||
            (!String(text || "").trim() && !image && !mediaData)
        ) {
            return res.status(400).json({ message: "Invalid message content" });
        }

        const receiver = await User.findById(Reciever).select("blockedUsers");
        if (!receiver) return res.status(404).json({ message: "Recipient not found" });
        if (receiver?.blockedUsers?.some((blockedUserId) => String(blockedUserId) === String(Sender))) {
            return res.status(403).json({ message: "You cannot send message to this user" });
        }

        let imageUrl;
        let mediaFields = {};
        if (image) {
            const uploaded = await uploadMessageMedia(image, {
                mediaType: "image",
                mediaName: mediaName || "Photo",
                mediaMimeType,
            });
            imageUrl = uploaded.mediaUrl;
        } else if (mediaData) {
            if (
                mediaType === "voice" &&
                (!Number.isFinite(mediaDuration) || mediaDuration < 0 || mediaDuration > 60)
            ) {
                return res.status(400).json({ message: "Voice messages must be no longer than 60 seconds" });
            }

            mediaFields = await uploadMessageMedia(mediaData, {
                mediaType,
                mediaName,
                mediaMimeType,
            });
            if (mediaType === "voice") mediaFields.mediaDuration = mediaDuration;
        }

        const newMessage = new Message({
            Sender,
            Reciever,
            text: typeof text === "string" ? text.trim() : undefined,
            image: imageUrl,
            ...mediaFields,
        })

        await newMessage.save();
        new Set([
            ...getReceiverSocketIds(Reciever),
            ...getReceiverSocketIds(Sender),
        ]).forEach((socketId) => {
            io.to(socketId).emit("newMessage", newMessage);
        });
        await sendUnreadCount(Reciever, Sender);

        res.status(201).json(newMessage)
    } catch (error) {
        console.error("Error in sendMessage", error);
        res.status(error.status || 500).json({
            message: error.status ? error.message : "Internal Server Error",
        });
    }
}

export const getChatsPartners = async (req, res) => {
    try {
        const loggedUserId = req.user._id;
        const activity = await Message.aggregate([
            {
                $match: {
                    $or: [{ Sender: loggedUserId }, { Reciever: loggedUserId }],
                },
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ["$Sender", loggedUserId] },
                            "$Reciever",
                            "$Sender",
                        ],
                    },
                    lastMessage: { $first: "$$ROOT" },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$Reciever", loggedUserId] },
                                        { $eq: ["$seen", false] },
                                        { $ne: ["$isDeleted", true] },
                                    ],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                },
            },
            { $sort: { "lastMessage.createdAt": -1 } },
        ]);
        const chatPartnerIds = activity.map(({ _id }) => _id);
        const chatPartners = await User.find({ _id: { $in: chatPartnerIds } })
            .select("-password")
            .lean();
        const activityById = new Map(activity.map((item) => [String(item._id), item]));
        const partnersById = new Map(chatPartners.map((user) => [String(user._id), user]));
        const orderedPartners = chatPartnerIds
            .map((id) => {
                const user = partnersById.get(String(id));
                const item = activityById.get(String(id));
                return user && item
                    ? {
                        ...user,
                        unreadCount: item.unreadCount,
                        lastMessage: {
                            _id: item.lastMessage._id,
                            text: item.lastMessage.text,
                            image: item.lastMessage.image,
                            mediaType: item.lastMessage.mediaType,
                            seen: item.lastMessage.seen,
                            Sender: item.lastMessage.Sender,
                            createdAt: item.lastMessage.createdAt,
                            isDeleted: item.lastMessage.isDeleted,
                        },
                    }
                    : null;
            })
            .filter(Boolean);

        res.status(200).json(orderedPartners)
    } catch (error) {
        console.error("Error in getChatsPartners", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getConversationMedia = async (req, res) => {
    try {
        const userId = req.user._id;
        const { type = "all", q = "", contactId, sort = "newest" } = req.query;
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 30));
        if (!["all", "photos", "videos", "documents", "audio", "voice", "other"].includes(type)) {
            return res.status(400).json({ message: "Invalid media category" });
        }
        if (!["newest", "oldest"].includes(sort)) {
            return res.status(400).json({ message: "Invalid media sort order" });
        }
        if (contactId && !isValidObjectId(contactId)) {
            return res.status(400).json({ message: "Invalid conversation contact" });
        }

        const match = {
            isDeleted: { $ne: true },
            $or: [{ Sender: userId }, { Reciever: userId }],
            $and: [
                {
                    $or: [
                        { mediaUrl: { $type: "string", $ne: "" } },
                        { image: { $type: "string", $ne: "" } },
                    ],
                },
            ],
        };
        if (type !== "all") {
            const typeMatch = {
                photos: [{ mediaType: "image" }, { image: { $type: "string", $ne: "" } }],
                videos: [{ mediaType: "video" }],
                documents: [{ mediaType: "document" }],
                audio: [{ mediaType: { $in: ["audio", "voice"] } }],
                voice: [{ mediaType: "voice" }],
                other: [{ mediaType: "other" }],
            }[type];
            match.$and.push({ $or: typeMatch });
        }

        const pipeline = [
            { $match: match },
            {
                $lookup: {
                    from: User.collection.name,
                    let: { sender: "$Sender", receiver: "$Reciever" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ["$_id", ["$$sender", "$$receiver"]],
                                },
                            },
                        },
                        { $project: { fullName: 1, profilepic: 1 } },
                    ],
                    as: "participants",
                },
            },
            {
                $addFields: {
                    conversation: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$participants",
                                    as: "participant",
                                    cond: { $ne: ["$$participant._id", userId] },
                                },
                            },
                            0,
                        ],
                    },
                    conversationId: {
                        $cond: [
                            { $eq: ["$Sender", userId] },
                            "$Reciever",
                            "$Sender",
                        ],
                    },
                },
            },
        ];
        if (contactId) {
            pipeline.push({
                $match: {
                    conversationId: new mongoose.Types.ObjectId(contactId),
                },
            });
        }
        const query = String(q).trim().slice(0, 100);
        if (query) {
            const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            pipeline.push({
                $match: {
                    $or: [
                        { mediaName: { $regex: escapedQuery, $options: "i" } },
                        { "conversation.fullName": { $regex: escapedQuery, $options: "i" } },
                    ],
                },
            });
        }
        pipeline.push(
            { $sort: { createdAt: sort === "oldest" ? 1 : -1, _id: 1 } },
            {
                $facet: {
                    items: [
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        {
                            $project: {
                                _id: 1,
                                mediaUrl: { $ifNull: ["$mediaUrl", "$image"] },
                                mediaType: { $ifNull: ["$mediaType", "image"] },
                                mediaName: {
                                    $ifNull: [
                                        "$mediaName",
                                        { $cond: [{ $ne: ["$image", null] }, "Photo", "Shared media"] },
                                    ],
                                },
                                mediaMimeType: 1,
                                mediaSize: 1,
                                mediaDuration: 1,
                                Sender: 1,
                                createdAt: 1,
                                conversation: 1,
                            },
                        },
                    ],
                    count: [{ $count: "total" }],
                },
            }
        );

        const [result] = await Message.aggregate(pipeline);
        const total = result?.count?.[0]?.total || 0;
        res.status(200).json({
            items: result?.items || [],
            page,
            limit,
            total,
            hasMore: page * limit < total,
        });
    } catch (error) {
        console.error("Error in getConversationMedia:", error);
        res.status(500).json({ message: "Could not load shared media" });
    }
};

// ✅ FEATURE 1: Mark all messages as seen
// Called when receiver opens the chat with sender
export const markMessagesAsSeen = async (req, res) => {
    try {
        const myId = req.user._id;           // receiver (jo chat khol raha hai)
        const { id: senderId } = req.params; // sender (jiska chat khola hai)
        if (!isValidObjectId(senderId) || String(senderId) === String(myId)) {
            return res.status(400).json({ message: "Invalid conversation user" });
        }

        // Un saare messages ko seen:true karo jo:
        // - Sender ne bheja ho (senderId)
        // - Receiver main hoon (myId)
        // - Abhi tak seen:false ho
        const seenAt = new Date();
        const result = await Message.updateMany(
            {
                Sender: senderId,
                Reciever: myId,
                seen: false,
                isDeleted: { $ne: true },
            },
            {
                $set: {
                    seen: true,
                    seenAt,
                }
            }
        );

        if (result.modifiedCount > 0) {
            getReceiverSocketIds(senderId).forEach((socketId) => {
                io.to(socketId).emit("messagesSeen", {
                    by: myId,
                    seenAt,
                });
            });
        }

        const unreadCount = await sendUnreadCount(myId, senderId);

        res.status(200).json({
            message: "Messages marked as seen",
            updatedCount: result.modifiedCount,
            unreadCount,
        });
    } catch (error) {
        console.error("Error in markMessagesAsSeen", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

export const editMessage = async (req, res) => {
    try {
        const { text } = req.body;
        const { id: messageId } = req.params;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: "Message not found" });

        // Sirf sender hi edit kar sakta hai
        if (message.Sender.toString() !== userId.toString()) {
            return res.status(403).json({ message: "You can only edit your own messages" });
        }
        if (message.isDeleted || typeof text !== "string" || !text.trim() || text.length > 2000) {
            return res.status(400).json({ message: "Invalid message text" });
        }

        // 10 min ka check
        const tenMinutes = 10 * 60 * 1000;
        const timePassed = Date.now() - new Date(message.createdAt).getTime();
        if (timePassed > tenMinutes) {
            return res.status(403).json({ message: "You can only edit messages within 10 minutes" });
        }

        message.text = text.trim();
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();

        new Set([
            ...getReceiverSocketIds(message.Sender),
            ...getReceiverSocketIds(message.Reciever),
        ]).forEach((socketId) => io.to(socketId).emit("messageEdited", message));

        res.status(200).json(message);
    } catch (error) {
        console.error("Error in editMessage", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const deleteMessage = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const { reason } = req.body;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: "Message not found" });

        // Sirf sender hi delete kar sakta hai
        if (message.Sender.toString() !== userId.toString()) {
            return res.status(403).json({ message: "You can only delete your own messages" });
        }
        const validReasons = ["Sent by mistake", "Wrong person", "Private"];
        if (reason && !validReasons.includes(reason)) {
            return res.status(400).json({ message: "Invalid delete reason" });
        }
        if (message.isDeleted) {
            return res.status(200).json({ message: "Message already deleted", data: message });
        }

        message.isDeleted = true;
        message.deletedAt = new Date();
        message.deleteReason = reason || null;
        message.text = null;
        message.image = null;
        message.mediaUrl = null;
        message.mediaPublicId = null;
        message.mediaType = null;
        message.mediaName = null;
        message.mediaMimeType = null;
        message.mediaSize = null;
        message.mediaDuration = null;
        await message.save();

        const payload = {
            messageId: message._id,
            reason: message.deleteReason,
        };
        new Set([
            ...getReceiverSocketIds(message.Sender),
            ...getReceiverSocketIds(message.Reciever),
        ]).forEach((socketId) => io.to(socketId).emit("messageDeleted", payload));
        if (!message.seen) await sendUnreadCount(message.Reciever, message.Sender);

        res.status(200).json({ message: "Message deleted", data: message });
    } catch (error) {
        console.error("Error in deleteMessage", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
