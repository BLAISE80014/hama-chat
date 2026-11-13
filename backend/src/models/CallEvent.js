import mongoose from "mongoose";

const CallEventSchema = new mongoose.Schema({
    callId: {
        type: String,
        required: true,
        unique: true,
    },
    callerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    callType: {
        type: String,
        enum: ["audio", "video"],
        required: true,
    },
    status: {
        type: String,
        enum: ["ringing", "active", "missed", "declined", "completed", "cancelled", "failed"],
        required: true,
        default: "ringing",
    },
    startedAt: {
        type: Date,
        required: true,
        default: Date.now,
    },
    answeredAt: {
        type: Date,
        default: null,
    },
    endedAt: {
        type: Date,
        default: null,
    },
    durationSeconds: {
        type: Number,
        min: 0,
        default: 0,
    },
    endReason: {
        type: String,
        maxlength: 32,
    },
}, { timestamps: true });

CallEventSchema.index({ callerId: 1, receiverId: 1, startedAt: -1 });
CallEventSchema.index({ receiverId: 1, callerId: 1, startedAt: -1 });

const CallEvent = mongoose.model("CallEvent", CallEventSchema);

export default CallEvent;
