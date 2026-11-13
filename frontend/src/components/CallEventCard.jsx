import {
    ArrowDownLeft,
    ArrowUpRight,
    CircleCheck,
    Clock3,
    Phone,
    PhoneOff,
    Video,
} from "lucide-react";

const formatDuration = (seconds) => {
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    return `${minutes}:${(totalSeconds % 60).toString().padStart(2, "0")}`;
};

const getStatusLabel = (status, isOutgoing) => {
    switch (status) {
        case "active":
            return "In progress";
        case "missed":
            return isOutgoing ? "No answer" : "Missed call";
        case "declined":
            return isOutgoing ? "Declined" : "Declined call";
        case "completed":
            return "Completed";
        case "cancelled":
            return "Cancelled";
        case "failed":
            return "Call failed";
        default:
            return isOutgoing ? "Calling..." : "Incoming call";
    }
};

const CallEventCard = ({ callEvent, peer, currentUserId }) => {
    const isOutgoing = String(callEvent.callerId) === String(currentUserId);
    const isVideo = callEvent.callType === "video";
    const isMissed = callEvent.status === "missed" || callEvent.status === "declined";
    const statusLabel = getStatusLabel(callEvent.status, isOutgoing);
    const callLabel = isVideo ? "Video call" : "Voice call";
    const timestamp = callEvent.startedAt || callEvent.createdAt;
    const date = timestamp ? new Date(timestamp) : null;
    const hasValidDate = date && Number.isFinite(date.getTime());
    const duration = callEvent.status === "completed" &&
        callEvent.answeredAt &&
        Number.isFinite(callEvent.durationSeconds)
        ? formatDuration(callEvent.durationSeconds)
        : null;
    const DirectionIcon = isOutgoing ? ArrowUpRight : ArrowDownLeft;
    const OutcomeIcon = isMissed
        ? PhoneOff
        : callEvent.status === "completed"
            ? CircleCheck
            : Clock3;

    return (
        <article
            className={`hama-call-event ${isOutgoing ? "is-outgoing" : "is-incoming"} ${isMissed ? "is-missed" : ""}`}
            aria-label={`${isOutgoing ? "Outgoing" : "Incoming"} ${callLabel.toLowerCase()}: ${statusLabel}`}
        >
            <div className={`hama-call-event-icon ${isVideo ? "is-video" : ""}`}>
                {isVideo ? <Video size={20} /> : <Phone size={20} />}
            </div>
            <div className="hama-call-event-content">
                <div className="hama-call-event-heading">
                    <strong>{callLabel}</strong>
                    <span className="hama-call-event-status">
                        <OutcomeIcon size={14} aria-hidden="true" />
                        {statusLabel}
                    </span>
                </div>
                <div className="hama-call-event-details">
                    <span className="hama-call-event-peer">
                        <img src={peer?.profilepic || "/avatar.jpg"} alt="" />
                        {isOutgoing ? "You called" : `${peer?.fullName || "Contact"} called you`}
                        {isOutgoing && peer?.fullName ? ` ${peer.fullName}` : ""}
                    </span>
                    <span className="hama-call-event-direction">
                        <DirectionIcon size={13} aria-hidden="true" />
                        {isOutgoing ? "Outgoing" : "Incoming"}
                    </span>
                    {duration && (
                        <span className="hama-call-event-duration">
                            <Clock3 size={13} aria-hidden="true" />
                            {duration}
                        </span>
                    )}
                </div>
            </div>
            {hasValidDate && (
                <time dateTime={date.toISOString()}>
                    {date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </time>
            )}
        </article>
    );
};

export default CallEventCard;
