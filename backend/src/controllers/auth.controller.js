import User from "../models/User.js";
import { generateToken } from "../lib/utils.js";
import cloudinary from "../lib/cloudinary.js";

import bcrypt from "bcryptjs"

export const signup = async (req, res) => {
    const { email, fullName, password, securityQuestion, securityAnswer } = req.body;

    try {
        if (!email || !fullName || !password || !securityQuestion || !securityAnswer) {
            return res.status(400).json({ message: "All fields including security question are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password is too small" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ message: "Email already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);
        const hashAnswer = await bcrypt.hash(securityAnswer.trim().toLowerCase(), salt);

        const newUser = new User({
            fullName,
            email,
            password: hashPassword,
            securityQuestion,
            securityAnswerHash: hashAnswer,
        });

        await newUser.save();
        await generateToken(newUser._id, res);

        return res.status(201).json({
            _id: newUser._id,
            email: newUser.email,
            fullName: newUser.fullName,
            profilepic: newUser.profilepic,
        });

    } catch (error) {
        console.error("Error in Signup Controller", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const isPasswordCorrect = await bcrypt.compare(password, user.password)
        if (!isPasswordCorrect) return res.status(400).json({ message: "Invalid credentials" })

        await generateToken(user._id, res)
        res.status(200).json({
            _id: user._id,
            email: user.email,
            fullName: user.fullName,
            profilepic: user.profilepic,
        })

    } catch (error) {
        console.error("Something Gonna Wrong", error);
        return res.status(500).json({ message: "Internal Server Error" })
    }
}
export const logout = async (_, res) => {
    res.cookie("jwt", "", { maxAge: 0 })
    res.status(200).json({ message: "Logout Successfully" })
}
export const updateProfile = async (req, res, next) => {
    try {
        const { profilepic } = req.body;

        if (!profilepic) return res.status(400).json({ message: "Profile pic is required" })

        const userId = req.user._id;
        const uploadResponce = await cloudinary.uploader.upload(profilepic);

        const updateUser = await User.findByIdAndUpdate(
            userId,
            { profilepic: uploadResponce.secure_url },
            { new: true }
        )

        res.status(200).json({ updateUser })
    } catch (error) {
        console.log("Error In update Profile", error);
        res.status(500).json({ message: "Internal server error" })
    }
}

export const verifySecurityAnswer = async (req, res) => {
    const { email, securityAnswer } = req.body;
    try {
        if (!email || !securityAnswer) {
            return res.status(400).json({ message: "Email and answer are required" });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        if (!user.securityAnswerHash) {
            return res.status(400).json({ message: "No security question set for this account" });
        }

        const isCorrect = await bcrypt.compare(
            securityAnswer.trim().toLowerCase(),
            user.securityAnswerHash
        );

        if (!isCorrect) {
            return res.status(400).json({ message: "Incorrect answer" });
        }

        // Return a temporary token to authorize the password reset
        return res.status(200).json({ message: "Answer verified", userId: user._id });

    } catch (error) {
        console.error("Error in verifySecurityAnswer", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const resetPassword = async (req, res) => {
    const { userId, newPassword, confirmPassword } = req.body;
    try {
        if (!userId || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        return res.status(200).json({ message: "Password reset successfully" });

    } catch (error) {
        console.error("Error in resetPassword", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ─── NEW: Change password (logged in user) ───────────────────────────────────
export const changePassword = async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    try {
        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const user = await User.findById(req.user._id);
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: "Old password is incorrect" });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        return res.status(200).json({ message: "Password changed successfully" });

    } catch (error) {
        console.error("Error in changePassword", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ─── NEW: Get security question for a given email ────────────────────────────
export const getSecurityQuestion = async (req, res) => {
    const { email } = req.body;
    try {
        if (!email) return res.status(400).json({ message: "Email is required" });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        return res.status(200).json({ securityQuestion: user.securityQuestion });
    } catch (error) {
        console.error("Error in getSecurityQuestion", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// ─── NEW: Update User Details (Name & Email) ──────────────────────────────────
export const updateDetails = async (req, res) => {
    try {
        const { fullName, email ,  bio, profession } = req.body;
        const userId = req.user._id;

        if (!fullName || !email) {
            return res.status(400).json({ message: "Full name and email are required" });
        }

        // Check if the new email is already taken by another user
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser._id.toString() !== userId.toString()) {
            return res.status(400).json({ message: "Email is already in use by another account" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { fullName, email, bio, profession },
            { new: true } // Returns the updated document
        ).select("-password -securityAnswerHash"); // Hide sensitive data

        res.status(200).json({ 
            message: "Profile updated successfully", 
            user: updatedUser 
        });

    } catch (error) {
        console.error("Error in updateDetails controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const blockUser = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: targetId } = req.params;

        if (myId.toString() === targetId) {
            return res.status(400).json({ message: "You cannot block yourself" });
        }

        const me = await User.findById(myId);

        const alreadyBlocked = me.blockedUsers.includes(targetId);

        if (alreadyBlocked) {
            // Unblock
            me.blockedUsers = me.blockedUsers.filter(
                (id) => id.toString() !== targetId
            );
            await me.save();
            return res.status(200).json({ message: "User unblocked", blocked: false });
        } else {
            // Block
            me.blockedUsers.push(targetId);
            await me.save();
            return res.status(200).json({ message: "User blocked", blocked: true });
        }
    } catch (error) {
        console.error("Error in blockUser", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getBlockedUsers = async (req, res) => {
    try {
        const me = await User.findById(req.user._id).select("blockedUsers");
        res.status(200).json({ blockedUsers: me.blockedUsers });
    } catch (error) {
        console.error("Error in getBlockedUsers", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

