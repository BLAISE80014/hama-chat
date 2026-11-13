import React from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useStatusStore } from "../store/useStatusStore";

const StatusAvatar = ({ user, imageSrc, online = false, className = "", onNoStatusClick }) => {
    const authUser = useAuthStore((state) => state.authUser);
    const statusGroups = useStatusStore((state) => state.statusGroups);
    const openViewer = useStatusStore((state) => state.openViewer);
    const ownerId = String(user?._id || "");
    const group = statusGroups.find((item) => String(item.user?._id) === ownerId);
    const hasStatus = Boolean(group?.statuses.length);
    const isOwner = String(authUser?._id) === ownerId;
    const hasUnseen = hasStatus && !isOwner && group.statuses.some((status) => !status.viewedByMe);

    return (
        <button
            type="button"
            className={`hama-status-avatar ${className} ${hasStatus ? 'has-status' : ''} ${hasUnseen ? 'has-unseen' : ''}`}
            onClick={() => {
                if (hasStatus) openViewer(ownerId);
                else onNoStatusClick?.();
            }}
            disabled={!hasStatus && !onNoStatusClick}
            aria-label={hasStatus ? `View ${user?.fullName || 'contact'}'s status` : `${user?.fullName || 'Contact'} profile picture`}
            title={hasStatus ? `View ${user?.fullName || 'contact'}'s status` : undefined}
        >
            <img src={imageSrc || user?.profilepic || "/avatar.jpg"} alt="" />
            {online && <i className="hama-online-dot" />}
        </button>
    );
};

export default StatusAvatar;
