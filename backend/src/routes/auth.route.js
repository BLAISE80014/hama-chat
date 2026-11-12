import express from "express"

import {
     signup,
     login,
     logout,
     updateProfile,
     getSecurityQuestion,
     verifySecurityAnswer,
     resetPassword,
     changePassword,
     updateDetails,
     getBlockedUsers,
     blockUser
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router()

router.use(arcjetProtection)

router.put("/block/:id", protectRoute, blockUser);
router.get("/blocked-users", protectRoute, getBlockedUsers);

router.get('/test', (req, res) => { res.json({ mesage: "test success" }) })
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.put('/update-profile', protectRoute, updateProfile);
router.get('/check', protectRoute, (req, res) => { res.status(200).json(req.user) })


// ─── Forgot Password (no auth needed) ─────────────────────────────
router.post('/get-security-question', getSecurityQuestion);
router.post('/verify-security-answer', verifySecurityAnswer);
router.post('/reset-password', resetPassword);

// ─── Change Password (auth required) ──────────────────────────────
router.put('/change-password', protectRoute, changePassword);
router.put("/update-details", protectRoute, updateDetails);

export default router;