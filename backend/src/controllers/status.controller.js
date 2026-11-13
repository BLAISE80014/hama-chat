import Status from "../models/Status.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketIds, io } from "../lib/socket.js";
import { uploadStatusMedia } from "../lib/mediaUpload.js";
import { canViewStatus, getStatusAudience, statusUserPayload } from "../lib/statusVisibility.js";

const backgrounds = new Set(["violet", "plum", "rose", "indigo", "midnight"]);
const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id || ""));

const serializeStatus = (status, viewerId) => {
    const owner = status.userId;
    const isOwner = String(owner?._id || owner) === String(viewerId);
    return {
        _id: status._id,
        userId: statusUserPayload(owner),
        type: status.type,
        text: status.text || "",
        background: status.background,
        mediaUrl: status.mediaUrl || "",
        mediaType: status.mediaType,
        mediaMimeType: status.mediaMimeType,
        mediaName: status.mediaName,
        createdAt: status.createdAt,
        expiresAt: status.expiresAt,
        viewedByMe: !isOwner && status.viewers?.some(
            (viewer) => String(viewer.userId?._id || viewer.userId) === String(viewerId)
        ),
        ...(isOwner ? { viewerCount: status.viewers?.length || 0 } : {}),
    };
};

const notifyAudience = async (status, eventName, payload) => {
    const recipients = await getStatusAudience(status);
    const socketIds = new Set(recipients.flatMap(getReceiverSocketIds));
    socketIds.forEach((socketId) => io.to(socketId).emit(eventName, payload));
};

export const getStatuses = async (req, res) => {
    try {
        const statuses = await Status.find({ expiresAt: { $gt: new Date() } })
            .populate("userId", "fullName profilepic blockedUsers")
            .select("-__v")
            .sort({ createdAt: 1 })
            .lean();
        const visibleStatuses = statuses
            .filter((status) => canViewStatus(status, req.user))
            .map((status) => serializeStatus(status, req.user._id));
        res.status(200).json({ statuses: visibleStatuses });
    } catch (error) {
        console.error("Error in getStatuses:", error);
        res.status(500).json({ message: "Could not load statuses" });
    }
};

export const createStatus = async (req, res) => {
    try {
        const {
            type,
            text,
            background = "violet",
            mediaData,
            mediaType,
            mediaMimeType,
            mediaName,
            visibility = "contacts",
            excludedUsers = [],
            allowedUsers = [],
        } = req.body;
        const userId = req.user._id;

        if (!["text", "image", "video"].includes(type)) {
            return res.status(400).json({ message: "Unsupported status type" });
        }
        if (!["contacts", "except", "only"].includes(visibility)) {
            return res.status(400).json({ message: "Invalid status privacy setting" });
        }
        if (!backgrounds.has(background)) {
            return res.status(400).json({ message: "Invalid text status background" });
        }
        if (type === "text" && (typeof text !== "string" || !text.trim() || text.length > 700)) {
            return res.status(400).json({ message: "Text statuses must contain 1 to 700 characters" });
        }
        if (type !== "text" && (!mediaData || mediaType !== type)) {
            return res.status(400).json({ message: "A photo or video file is required" });
        }
        if (
            !Array.isArray(excludedUsers) ||
            !Array.isArray(allowedUsers) ||
            excludedUsers.length > 100 ||
            allowedUsers.length > 100 ||
            [...excludedUsers, ...allowedUsers].some((id) => !isValidObjectId(id))
        ) {
            return res.status(400).json({ message: "Invalid status privacy contacts" });
        }

        const selectedUsers = visibility === "except" ? excludedUsers : visibility === "only" ? allowedUsers : [];
        if (selectedUsers.length) {
            const existingUsers = await User.countDocuments({
                _id: { $in: selectedUsers, $ne: userId },
            });
            if (existingUsers !== new Set(selectedUsers.map(String)).size) {
                return res.status(400).json({ message: "A selected privacy contact does not exist" });
            }
        }

        let uploadedMedia = {};
        if (type !== "text") {
            uploadedMedia = await uploadStatusMedia(mediaData, {
                mediaType,
                mediaName,
                mediaMimeType,
            });
        }

        const status = await Status.create({
            userId,
            type,
            text: type === "text" ? text.trim() : undefined,
            background: type === "text" ? background : undefined,
            ...uploadedMedia,
            visibility,
            excludedUsers: visibility === "except" ? excludedUsers : [],
            allowedUsers: visibility === "only" ? allowedUsers : [],
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        const populatedStatus = await Status.findById(status._id)
            .populate("userId", "fullName profilepic")
            .lean();
        await notifyAudience(status.toObject(), "statusCreated", {
            userId: String(userId),
            statusId: String(status._id),
        });
        res.status(201).json({ status: serializeStatus(populatedStatus, userId) });
    } catch (error) {
        console.error("Error in createStatus:", error);
        res.status(error.status || 500).json({
            message: error.status ? error.message : "Could not create status",
        });
    }
};

export const recordStatusView = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid status" });

        const status = await Status.findOne({ _id: id, expiresAt: { $gt: new Date() } })
            .populate("userId", "fullName profilepic blockedUsers");
        if (!status || !canViewStatus(status, req.user)) {
            return res.status(404).json({ message: "Status not found" });
        }

        const ownerId = String(status.userId._id);
        if (ownerId === String(req.user._id)) {
            return res.status(200).json({ viewed: false });
        }

        const result = await Status.updateOne(
            { _id: status._id, "viewers.userId": { $ne: req.user._id } },
            { $push: { viewers: { userId: req.user._id, viewedAt: new Date() } } }
        );
        if (result.modifiedCount) {
            const viewer = await User.findById(req.user._id).select("fullName profilepic").lean();
            getReceiverSocketIds(ownerId).forEach((socketId) => {
                io.to(socketId).emit("statusViewed", {
                    statusId: String(status._id),
                    viewer: statusUserPayload(viewer),
                });
            });
        }

        res.status(200).json({ viewed: Boolean(result.modifiedCount) });
    } catch (error) {
        console.error("Error in recordStatusView:", error);
        res.status(500).json({ message: "Could not record status view" });
    }
};

export const getStatusViewers = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid status" });
        const status = await Status.findOne({
            _id: id,
            userId: req.user._id,
            expiresAt: { $gt: new Date() },
        })
            .populate("viewers.userId", "fullName profilepic")
            .select("viewers");
        if (!status) return res.status(404).json({ message: "Status not found" });

        res.status(200).json({
            viewers: status.viewers
                .filter((viewer) => viewer.userId)
                .map((viewer) => ({
                    ...statusUserPayload(viewer.userId),
                    viewedAt: viewer.viewedAt,
                })),
        });
    } catch (error) {
        console.error("Error in getStatusViewers:", error);
        res.status(500).json({ message: "Could not load status viewers" });
    }
};

export const deleteStatus = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid status" });
        const status = await Status.findOne({ _id: id, userId: req.user._id });
        if (!status) return res.status(404).json({ message: "Status not found" });

        if (status.mediaPublicId) {
            const resourceType = status.type === "video" ? "video" : "image";
            const result = await cloudinary.uploader.destroy(status.mediaPublicId, { resource_type: resourceType });
            if (!["ok", "not found"].includes(result.result)) {
                return res.status(502).json({ message: "Could not remove status media" });
            }
        }

        await status.deleteOne();
        const recipientIds = await getStatusAudience(status.toObject());
        const socketIds = new Set([
            ...getReceiverSocketIds(req.user._id),
            ...recipientIds.flatMap(getReceiverSocketIds),
        ]);
        socketIds.forEach((socketId) => {
            io.to(socketId).emit("statusDeleted", {
                userId: String(req.user._id),
                statusId: String(status._id),
            });
        });
        res.status(200).json({ deleted: true });
    } catch (error) {
        console.error("Error in deleteStatus:", error);
        res.status(500).json({ message: "Could not delete status" });
    }
};

export const expireStatuses = async () => {
    const expiredStatuses = await Status.find({ expiresAt: { $lte: new Date() } }).lean();
    for (const expired of expiredStatuses) {
        const status = await Status.findOneAndDelete({
            _id: expired._id,
            expiresAt: { $lte: new Date() },
        });
        if (!status) continue;

        const recipientIds = await getStatusAudience(status.toObject());
        const socketIds = new Set([
            ...getReceiverSocketIds(status.userId),
            ...recipientIds.flatMap(getReceiverSocketIds),
        ]);
        socketIds.forEach((socketId) => {
            io.to(socketId).emit("statusExpired", {
                userId: String(status.userId),
                statusId: String(status._id),
            });
        });

        if (status.mediaPublicId) {
            const resourceType = status.type === "video" ? "video" : "image";
            try {
                await cloudinary.uploader.destroy(status.mediaPublicId, { resource_type: resourceType });
            } catch (error) {
                console.error("Could not remove expired status media:", error);
            }
        }
    }
};
