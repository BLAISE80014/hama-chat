import jwt from "jsonwebtoken"

import User from "../models/User.js";
import { ENV } from "../lib/env.js";

export const protectRoute = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;
        if (!token) return res.status(401).json({ message: "No Token Provided" });

        const decoded = jwt.verify(token, ENV.JWT_SECRET)
        if (!decoded) return res.status(401).json({ message: "Unuthorize _ Invalid Token" })

        const user = await User.findById(decoded.userId).select("-password")
        if (!user) return res.status(401).json({ message: "User Not Found" })

        req.user = user;
        next()
    } catch (error) {
        console.error("Error in protective middleware",error);
        res.status(500).json({message:"Internal Server Error"})
    }

}
