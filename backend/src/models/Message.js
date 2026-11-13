import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
    Sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    Reciever: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    text: {
        type: String,
        trim: true,
        maxlength: 2000,
    },
    image: {
        type: String,
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
        enum: ["image", "video", "audio", "voice", "document", "other"],
    },
    mediaName: {
        type: String,
        maxlength: 180,
    },
    mediaMimeType: {
        type: String,
        maxlength: 120,
    },
    mediaSize: {
        type: Number,
        min: 0,
    },
    mediaDuration: {
        type: Number,
        min: 0,
    },
    seen: {
        type: Boolean,
        default: false,
    },
    seenAt: {
        type: Date,
        default: null,
    },
    isEdited: {
        type: Boolean,
        default: false,
    },
    editedAt: {
        type: Date,
        default: null,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
    deleteReason: {
        type: String,
        enum: ["Sent by mistake", "Wrong person", "Private", null],
        default: null,
    }

}, { timestamps: true })

MessageSchema.index({ Reciever: 1, seen: 1, Sender: 1 });
MessageSchema.index({ Sender: 1, Reciever: 1, createdAt: -1 });
MessageSchema.index({ Reciever: 1, createdAt: -1, mediaType: 1 });

const Message = mongoose.model("Message", MessageSchema)

export default Message