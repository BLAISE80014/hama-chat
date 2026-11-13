import React from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useStatusStore } from "../store/useStatusStore";

const StatusAvatar = ({ user, imageSrc, online = false, className = "", onNoStatusClick, onAvatarClick }) => {
    const authUser = useAuthStore((state) => state.authUser);
    const statusGroups = useStatusStore((state) => state.statusGroups);
    const openViewer = useStatusStore((state) => state.openViewer);
    const ownerId = String(user?._id || "");
    const group = statusGroups.find((item) => String(item.user?._id) === ownerId);
    const hasStatus = Boolean(group?.statuses.length);
    const isOwner = String(authUser?._id) === ownerId;
    const hasUnseen = hasStatus && !isOwner && group.statuses.some((status) => !status.viewedByMe);

    const avatarButton = (
        <button
            type="button"
            className={`hama-status-avatar ${className} ${hasStatus ? 'has-status' : ''} ${hasUnseen ? 'has-unseen' : ''}`}
            onClick={() => {
                if (onAvatarClick) {
                    onAvatarClick();
                    return;
                }
                if (hasStatus) openViewer(ownerId);
                else onNoStatusClick?.();
            }}
            disabled={!hasStatus && !onNoStatusClick && !onAvatarClick}
            aria-label={onAvatarClick
                ? `View ${user?.fullName || 'contact'}'s profile`
                : hasStatus
                    ? `View ${user?.fullName || 'contact'}'s status`
                    : `${user?.fullName || 'Contact'} profile picture`}
            title={hasStatus && !onAvatarClick ? `View ${user?.fullName || 'contact'}'s status` : undefined}
        >
            <img src={imageSrc || user?.profilepic || "/avatar.jpg"} alt="" />
            {online && <i className="hama-online-dot" />}
        </button>
    );

    if (!hasStatus || !onAvatarClick) return avatarButton;

    return (
        <span className={`hama-status-avatar-wrap ${className}`}>
            {avatarButton}
            <button
                type="button"
                className="hama-status-view-button"
                onClick={(event) => {
                    event.stopPropagation();
                    openViewer(ownerId);
                }}
                aria-label={`View ${user?.fullName || 'contact'}'s status`}
                title={`View ${user?.fullName || 'contact'}'s status`}
            />
        </span>
    );
};

export default StatusAvatar;
