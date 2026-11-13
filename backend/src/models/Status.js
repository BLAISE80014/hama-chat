import mongoose from "mongoose";

const StatusSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ["text", "image", "video"],
        required: true,
    },
    text: {
        type: String,
        maxlength: 700,
        trim: true,
    },
    background: {
        type: String,
        enum: ["violet", "plum", "rose", "indigo", "midnight"],
        default: "violet",
    },
    mediaUrl: {
        type: String,
        maxlength: 2048,
    },
    mediaPublicId: {
        type: String,
        maxlength: 255,
    },
    mediaType: {
        type: String,
        enum: ["image", "video"],
    },
    mediaMimeType: {
        type: String,
        maxlength: 120,
    },
    mediaName: {
        type: String,
        maxlength: 180,
    },
    mediaSize: {
        type: Number,
        min: 0,
    },
    visibility: {
        type: String,
        enum: ["contacts", "except", "only"],
        default: "contacts",
    },
    excludedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    allowedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    viewers: [{
        _id: false,
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        viewedAt: {
            type: Date,
            required: true,
        },
    }],
    expiresAt: {
        type: Date,
        required: true,
        index: true,
    },
}, { timestamps: true });

StatusSchema.index({ expiresAt: 1, userId: 1 });
StatusSchema.index({ userId: 1, createdAt: -1 });

const Status = mongoose.model("Status", StatusSchema);

export default Status;
