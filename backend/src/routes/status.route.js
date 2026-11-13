import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
    createStatus,
    deleteStatus,
    getStatuses,
    getStatusViewers,
    recordStatusView,
} from "../controllers/status.controller.js";

const router = express.Router();

router.get("/", protectRoute, getStatuses);
router.post("/", protectRoute, createStatus);
router.post("/:id/view", protectRoute, recordStatusView);
router.get("/:id/viewers", protectRoute, getStatusViewers);
router.delete("/:id", protectRoute, deleteStatus);

export default router;
