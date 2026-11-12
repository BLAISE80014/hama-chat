import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    profilepic: {
        type: String,
        default: "",
    },
    securityQuestion: {
        type: String,
        required: false,
        default: "",
    },
    securityAnswerHash: {
        type: String,
        required: false,
        default: "",
    },
    bio: {
        type: String,
        default: "Hey there! I am using this app."
    },
    profession: {
        type: String,
        default: "Not specified"
    },
    blockedUsers: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "User",
        default: [],
    }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export default User;