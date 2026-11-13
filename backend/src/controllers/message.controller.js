import Message from "../models/Message.js"
import User from '../models/User.js'

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketIds, io } from "../lib/socket.js";

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
        const { text, image } = req.body;
        const { id: Reciever } = req.params;
        const Sender = req.user._id;

        // Block check - agar receiver ne sender ko block kiya hai
        const receiver = await User.findById(Reciever).select("blockedUsers");
        if (receiver?.blockedUsers?.some((blockedUserId) => String(blockedUserId) === String(Sender))) {
            return res.status(403).json({ message: "You cannot send message to this user" });
        }

        let imageUrl;
        if (image) {
            const uploadResponce = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponce.secure_url;
        }

        const newMessage = new Message({
            Sender,
            Reciever,
            text,
            image: imageUrl,
        })

        await newMessage.save();
        new Set([
            ...getReceiverSocketIds(Reciever),
            ...getReceiverSocketIds(Sender),
        ]).forEach((socketId) => {
            io.to(socketId).emit("newMessage", newMessage);
        });

        res.status(201).json(newMessage)
    } catch (error) {
        console.error("Error in sendMessage", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

export const getChatsPartners = async (req, res) => {
    try {
        const loggedUserId = req.user._id;

        //find al the messages from data base either sender or receiver

        const messages = await Message.find({
            $or: [{ Sender: loggedUserId }, { Reciever: loggedUserId }]
        });

        const chatPartnerIds = [
            ...new Set(
                messages.map((msg) =>
                    msg.Sender.toString() === loggedUserId.toString() ?
                        msg.Reciever.toString() : msg.Sender.toString()
                )
            )
        ]

        const chatPartners = await User.find({ _id: { $in: chatPartnerIds } }).select("-password")

        res.status(200).json(chatPartners)
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

// ✅ FEATURE 1: Mark all messages as seen
// Called when receiver opens the chat with sender
export const markMessagesAsSeen = async (req, res) => {
    try {
        const myId = req.user._id;           // receiver (jo chat khol raha hai)
        const { id: senderId } = req.params; // sender (jiska chat khola hai)

        // Un saare messages ko seen:true karo jo:
        // - Sender ne bheja ho (senderId)
        // - Receiver main hoon (myId)
        // - Abhi tak seen:false ho
        const result = await Message.updateMany(
            {
                Sender: senderId,
                Reciever: myId,
                seen: false,
            },
            {
                $set: {
                    seen: true,
                    seenAt: new Date(),
                }
            }
        );

        if (result.modifiedCount > 0) {
            const seenAt = new Date();
            getReceiverSocketIds(senderId).forEach((socketId) => {
                io.to(socketId).emit("messagesSeen", {
                    by: myId,
                    seenAt,
                });
            });
        }

        res.status(200).json({
            message: "Messages marked as seen",
            updatedCount: result.modifiedCount,
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
        await message.save();

        const payload = {
            messageId: message._id,
            reason: message.deleteReason,
        };
        new Set([
            ...getReceiverSocketIds(message.Sender),
            ...getReceiverSocketIds(message.Reciever),
        ]).forEach((socketId) => io.to(socketId).emit("messageDeleted", payload));

        res.status(200).json({ message: "Message deleted", data: message });
    } catch (error) {
        console.error("Error in deleteMessage", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
