import CallEvent from "../models/CallEvent.js";

const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id || ""));

export const getConversationCallEvents = async (req, res) => {
    try {
        const { id: peerId } = req.params;
        const userId = req.user._id;
        if (!isValidObjectId(peerId) || String(peerId) === String(userId)) {
            return res.status(400).json({ message: "Invalid conversation user" });
        }

        const callEvents = await CallEvent.find({
            $or: [
                { callerId: userId, receiverId: peerId },
                { callerId: peerId, receiverId: userId },
            ],
        })
            .sort({ startedAt: 1, _id: 1 })
            .lean();

        res.status(200).json({ callEvents });
    } catch (error) {
        console.error("Error in getConversationCallEvents:", error);
        res.status(500).json({ message: "Could not load call history" });
    }
};
