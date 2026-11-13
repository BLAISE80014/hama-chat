import React, { useCallback, useEffect, useState } from "react";
import { Download, FileAudio, FileText, Film, Image, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useChatStore } from "../store/useChatStore";
import useWindowSize from "../hooks/useWindowSize";

const categories = [
    ["all", "All Media"],
    ["photos", "Photos"],
    ["videos", "Videos"],
    ["documents", "Documents"],
    ["audio", "Audio"],
    ["voice", "Voice Messages"],
    ["other", "Other Files"],
];

const formatSize = (bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "Size unavailable";
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MediaLibrary = () => {
    const chats = useChatStore((state) => state.chats);
    const getMyChatPartners = useChatStore((state) => state.getMyChatPartners);
    const { isMobile } = useWindowSize();
    const [category, setCategory] = useState("all");
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState("newest");
    const [contactId, setContactId] = useState("");
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        if (!chats.length) void getMyChatPartners();
    }, [chats.length, getMyChatPartners]);

    const loadMedia = useCallback(async (nextPage = 1, append = false) => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.get("/messages/media", {
                params: { type: category, q: query.trim(), sort, contactId: contactId || undefined, page: nextPage },
            });
            setItems((current) => append ? [...current, ...response.data.items] : response.data.items);
            setPage(response.data.page);
            setHasMore(response.data.hasMore);
            setTotal(response.data.total);
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not load shared media");
        } finally {
            setIsLoading(false);
        }
    }, [category, contactId, query, sort]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadMedia(1);
        }, query ? 250 : 0);
        return () => clearTimeout(timer);
    }, [loadMedia, query]);

    const renderPreview = (item) => {
        if (item.mediaType === "image") {
            return <img src={item.mediaUrl} alt={item.mediaName} loading="lazy" />;
        }
        if (item.mediaType === "video") {
            return <video src={item.mediaUrl} preload="metadata" muted playsInline />;
        }
        if (item.mediaType === "audio" || item.mediaType === "voice") {
            return <FileAudio size={27} />;
        }
        if (item.mediaType === "document") return <FileText size={27} />;
        return <Film size={27} />;
    };

    return (
        <section className="hama-feature-page hama-media-library">
            <header className="hama-feature-header">
                <div>
                    <span className="hama-feature-eyebrow">YOUR CONVERSATIONS</span>
                    <h1>Media Library</h1>
                    <p>{total} shared {total === 1 ? "file" : "files"} from your conversations</p>
                </div>
                <div className="hama-media-toolbar">
                    <label className="hama-feature-search">
                        <Search size={17} aria-hidden="true" />
                        <input
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search files or people..."
                            aria-label="Search shared media"
                        />
                    </label>
                    <select
                        value={contactId}
                        onChange={(event) => setContactId(event.target.value)}
                        aria-label="Filter by conversation"
                    >
                        <option value="">All conversations</option>
                        {chats.map((chat) => (
                            <option key={chat._id} value={chat._id}>{chat.fullName}</option>
                        ))}
                    </select>
                    <select
                        value={sort}
                        onChange={(event) => setSort(event.target.value)}
                        aria-label="Sort media"
                    >
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                    </select>
                </div>
            </header>

            <div className="hama-media-categories" role="tablist" aria-label="Media categories">
                {categories.map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={category === key}
                        className={category === key ? "is-active" : ""}
                        onClick={() => setCategory(key)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="hama-media-grid custom-scroll">
                {items.map((item) => (
                    <article className="hama-media-card" key={item._id}>
                        <button
                            type="button"
                            className={`hama-media-thumbnail ${item.mediaType === "image" || item.mediaType === "video" ? "has-preview" : ""}`}
                            onClick={() => setPreview(item)}
                            aria-label={`Preview ${item.mediaName || item.mediaType}`}
                        >
                            {renderPreview(item)}
                            {item.mediaType === "video" && <span className="hama-media-type-label">VIDEO</span>}
                        </button>
                        <div className="hama-media-card-copy">
                            <strong title={item.mediaName}>{item.mediaName || "Shared file"}</strong>
                            <span>{item.conversation?.fullName || "Conversation"} · {formatSize(item.mediaSize)}</span>
                            <time dateTime={item.createdAt}>
                                {new Date(item.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                            </time>
                        </div>
                        <a
                            href={item.mediaUrl}
                            download={item.mediaName || "shared-file"}
                            target="_blank"
                            rel="noreferrer"
                            className="hama-media-download"
                            aria-label={`Download ${item.mediaName || "shared file"}`}
                        >
                            <Download size={17} />
                        </a>
                    </article>
                ))}
                {!items.length && !isLoading && (
                    <div className="hama-media-empty">
                        <Image size={30} />
                        <strong>No shared media found</strong>
                        <span>Files shared in your conversations will appear here.</span>
                    </div>
                )}
            </div>

            {isLoading && <div className="hama-feature-loading">Loading shared media...</div>}
            {hasMore && !isLoading && (
                <button
                    type="button"
                    className="hama-feature-more"
                    onClick={() => void loadMedia(page + 1, true)}
                >
                    Load more
                </button>
            )}

            {preview && (
                <div className="hama-feature-modal-backdrop" onClick={() => setPreview(null)}>
                    <section
                        className={`hama-media-preview-modal ${isMobile ? "is-mobile" : ""}`}
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Preview ${preview.mediaName || "shared media"}`}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <header>
                            <strong>{preview.mediaName || "Shared file"}</strong>
                            <button type="button" onClick={() => setPreview(null)} aria-label="Close preview">
                                <X size={20} />
                            </button>
                        </header>
                        {preview.mediaType === "image" ? (
                            <img src={preview.mediaUrl} alt={preview.mediaName} />
                        ) : preview.mediaType === "video" ? (
                            <video src={preview.mediaUrl} controls autoPlay playsInline />
                        ) : preview.mediaType === "audio" || preview.mediaType === "voice" ? (
                            <audio src={preview.mediaUrl} controls autoPlay />
                        ) : (
                            <div className="hama-media-file-preview">
                                <FileText size={48} />
                                <span>{preview.mediaName}</span>
                            </div>
                        )}
                        <a href={preview.mediaUrl} download={preview.mediaName || "shared-file"} target="_blank" rel="noreferrer">
                            <Download size={16} /> Download file
                        </a>
                    </section>
                </div>
            )}
        </section>
    );
};

export default MediaLibrary;
