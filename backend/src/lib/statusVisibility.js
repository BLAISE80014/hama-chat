import User from "../models/User.js";

const userIdOf = (value) => String(value?._id || value || "");

export const canViewStatus = (status, viewer) => {
    const owner = status.userId;
    const ownerId = userIdOf(owner);
    const viewerId = userIdOf(viewer);

    if (!ownerId || !viewerId || new Date(status.expiresAt).getTime() <= Date.now()) {
        return false;
    }
    if (ownerId === viewerId) return true;

    const ownerBlockedUsers = owner?.blockedUsers || [];
    const viewerBlockedUsers = viewer?.blockedUsers || [];
    if (
        ownerBlockedUsers.some((id) => userIdOf(id) === viewerId) ||
        viewerBlockedUsers.some((id) => userIdOf(id) === ownerId)
    ) {
        return false;
    }

    if (status.visibility === "except") {
        return !status.excludedUsers?.some((id) => userIdOf(id) === viewerId);
    }
    if (status.visibility === "only") {
        return Boolean(status.allowedUsers?.some((id) => userIdOf(id) === viewerId));
    }
    return status.visibility === "contacts";
};

export const getStatusAudience = async (status) => {
    const ownerId = userIdOf(status.userId);
    const owner = await User.findById(ownerId).select("blockedUsers").lean();
    const ownerBlockedUsers = (owner?.blockedUsers || status.userId?.blockedUsers || []).map(userIdOf);
    const excludedUsers = status.visibility === "except"
        ? (status.excludedUsers || []).map(userIdOf)
        : [];
    const allowedUsers = status.visibility === "only"
        ? (status.allowedUsers || []).map(userIdOf)
        : null;
    const excludedIds = [...new Set([ownerId, ...ownerBlockedUsers, ...excludedUsers])];
    const filter = {
        _id: { $nin: excludedIds },
        blockedUsers: { $ne: ownerId },
    };
    if (allowedUsers) filter._id.$in = allowedUsers;

    const recipients = await User.find(filter).select("_id").lean();
    return recipients.map(({ _id }) => String(_id));
};

export const statusUserPayload = (user) => ({
    _id: user?._id,
    fullName: user?.fullName || "",
    profilepic: user?.profilepic || "",
});
