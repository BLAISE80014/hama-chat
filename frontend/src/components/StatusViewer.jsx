import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Trash2, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useStatusStore } from "../store/useStatusStore";

const IMAGE_DURATION_MS = 6_000;

const StatusViewer = () => {
    const authUser = useAuthStore((state) => state.authUser);
    const statusGroups = useStatusStore((state) => state.statusGroups);
    const userId = useStatusStore((state) => state.activeViewerUserId);
    const closeViewer = useStatusStore((state) => state.closeViewer);
    const recordView = useStatusStore((state) => state.recordView);
    const deleteStatus = useStatusStore((state) => state.deleteStatus);
    const getViewers = useStatusStore((state) => state.getViewers);
    const [statusIndex, setStatusIndex] = useState(0);
    const [elapsedState, setElapsedState] = useState({ statusId: null, elapsed: 0 });
    const [paused, setPaused] = useState(false);
    const [videoProgressState, setVideoProgressState] = useState({ statusId: null, progress: 0 });
    const [viewerListState, setViewerListState] = useState(null);
    const [isLoadingViewers, setIsLoadingViewers] = useState(false);

    const groupIndex = statusGroups.findIndex((group) => String(group.user?._id) === String(userId));
    const group = groupIndex >= 0 ? statusGroups[groupIndex] : null;
    const status = group?.statuses[statusIndex];
    const statusId = status?._id;
    const isOwner = String(authUser?._id) === String(group?.user?._id);
    const duration = IMAGE_DURATION_MS;
    const elapsed = elapsedState.statusId === status?._id ? elapsedState.elapsed : 0;
    const videoProgress = videoProgressState.statusId === status?._id ? videoProgressState.progress : 0;
    const viewerList = viewerListState?.statusId === status?._id ? viewerListState.viewers : null;

    const nextStatus = useCallback(() => {
        if (!group) return closeViewer();
        if (statusIndex < group.statuses.length - 1) {
            setStatusIndex((current) => current + 1);
            return;
        }
        const nextGroup = statusGroups[groupIndex + 1];
        if (nextGroup) {
            useStatusStore.getState().openViewer(nextGroup.user._id);
            setStatusIndex(0);
        } else {
            closeViewer();
        }
    }, [closeViewer, group, groupIndex, statusGroups, statusIndex]);

    const previousStatus = useCallback(() => {
        if (!group) return closeViewer();
        if (statusIndex > 0) {
            setStatusIndex((current) => current - 1);
            return;
        }
        const previousGroup = statusGroups[groupIndex - 1];
        if (previousGroup) {
            useStatusStore.getState().openViewer(previousGroup.user._id);
            setStatusIndex(previousGroup.statuses.length - 1);
        }
    }, [closeViewer, group, groupIndex, statusGroups, statusIndex]);

    useEffect(() => {
        if (!statusId) {
            if (userId) closeViewer();
            return;
        }
        void recordView(statusId);
    }, [statusId, closeViewer, recordView, userId]);

    useEffect(() => {
        if (!userId || !statusId || status?.type === "video" || paused) return undefined;
        const timer = setInterval(() => {
            setElapsedState((current) => {
                const elapsedForStatus = current.statusId === statusId ? current.elapsed : 0;
                const next = elapsedForStatus + 100;
                if (next >= duration) {
                    clearInterval(timer);
                    setTimeout(nextStatus, 0);
                    return { statusId, elapsed: duration };
                }
                return { statusId, elapsed: next };
            });
        }, 100);
        return () => clearInterval(timer);
    }, [duration, nextStatus, paused, status?.type, statusId, userId]);

    useEffect(() => {
        if (!userId) return undefined;
        const onKeyDown = (event) => {
            if (event.key === "Escape") closeViewer();
            if (event.key === "ArrowRight") nextStatus();
            if (event.key === "ArrowLeft") previousStatus();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [closeViewer, nextStatus, previousStatus, userId]);

    const progress = useMemo(() => status?.type === "video"
        ? videoProgress
        : Math.min(1, elapsed / duration), [duration, elapsed, status?.type, videoProgress]);

    if (!userId || !status || !group) return null;

    const loadViewers = async () => {
        setIsLoadingViewers(true);
        const viewers = await getViewers(status._id);
        setIsLoadingViewers(false);
        if (viewers) setViewerListState({ statusId: status._id, viewers });
    };

    const removeCurrentStatus = async () => {
        if (await deleteStatus(status._id)) {
            if (group.statuses.length > 1 && statusIndex > 0) {
                setStatusIndex((current) => current - 1);
            } else if (group.statuses.length > 1) {
                setStatusIndex(0);
            } else {
                closeViewer();
            }
        }
    };

    return (
        <div className="hama-status-viewer-backdrop" role="dialog" aria-modal="true" aria-label={`${group.user.fullName}'s status`}>
            <section
                className="hama-status-viewer"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
            >
                <div className="hama-status-progress">
                    {group.statuses.map((item, index) => (
                        <span key={item._id}>
                            <i style={{
                                width: index < statusIndex ? "100%" : index === statusIndex ? `${progress * 100}%` : "0%",
                            }} />
                        </span>
                    ))}
                </div>
                <header className="hama-status-viewer-header">
                    <img src={group.user.profilepic || "/avatar.jpg"} alt="" />
                    <div>
                        <strong>{group.user.fullName}</strong>
                        <time dateTime={status.createdAt}>
                            {new Date(status.createdAt).toLocaleString([], { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" })}
                        </time>
                    </div>
                    {isOwner && (
                        <button type="button" onClick={removeCurrentStatus} aria-label="Delete status">
                            <Trash2 size={18} />
                        </button>
                    )}
                    <button type="button" onClick={closeViewer} aria-label="Close status viewer">
                        <X size={21} />
                    </button>
                </header>

                <button className="hama-status-nav hama-status-nav--previous" type="button" onClick={previousStatus} aria-label="Previous status">
                    <ChevronLeft size={25} />
                </button>
                <div className={`hama-status-content ${status.type === "text" ? `hama-status-card--${status.background}` : ""}`}>
                    {status.type === "text" ? (
                        <p>{status.text}</p>
                    ) : status.type === "image" ? (
                        <img src={status.mediaUrl} alt={status.text || "Photo status"} />
                    ) : (
                        <video
                            src={status.mediaUrl}
                            controls
                            autoPlay
                            playsInline
                            onTimeUpdate={(event) => {
                                const video = event.currentTarget;
                                setVideoProgressState({
                                    statusId: status._id,
                                    progress: video.duration ? video.currentTime / video.duration : 0,
                                });
                            }}
                            onEnded={nextStatus}
                        />
                    )}
                    {status.type !== "text" && status.text && <p className="hama-status-caption">{status.text}</p>}
                </div>
                <button className="hama-status-nav hama-status-nav--next" type="button" onClick={nextStatus} aria-label="Next status">
                    <ChevronRight size={25} />
                </button>

                {isOwner && (
                    <footer className="hama-status-viewer-footer">
                        <button type="button" onClick={loadViewers}>
                            <Eye size={16} /> {status.viewerCount || 0} views
                        </button>
                        {viewerList && (
                            <div className="hama-status-viewer-list">
                                {isLoadingViewers ? "Loading viewers..." : viewerList.length
                                    ? viewerList.map((viewer) => <span key={viewer._id}>{viewer.fullName}</span>)
                                    : "No views yet"}
                            </div>
                        )}
                    </footer>
                )}
            </section>
        </div>
    );
};

export default StatusViewer;
