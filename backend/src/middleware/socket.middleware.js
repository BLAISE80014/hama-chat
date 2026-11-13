
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ENV } from "../lib/env.js";

export const socketAuthMiddleware = async (socket, next) => {
    try {
        const cookieHeader = socket.handshake.headers.cookie || "";

        const token = cookieHeader
            .split(";")
            .map((cookie) => cookie.trim())
            .find((cookie) => cookie.startsWith("jwt="))
            ?.slice(4);

        if (!token) {
            console.log("Socket rejected: No JWT cookie");
            return next(new Error("Unauthorized - No Token"));
        }

        const decoded = jwt.verify(token, ENV.JWT_SECRET);

        if (!decoded?.userId) {
            return next(new Error("Invalid authentication token"));
        }

        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            return next(new Error("User not found"));
        }

        socket.user = user;
        socket.userId = String(user._id);

        console.log("Socket authenticated:", user.fullName, socket.userId);

        next();
    } catch (error) {
        console.error("Socket authentication error:", error.message);
        next(new Error("Authentication failed"));
    }
};
