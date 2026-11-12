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

const Message = mongoose.model("Message", MessageSchema)

export default Message