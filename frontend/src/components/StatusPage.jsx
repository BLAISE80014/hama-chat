import React, { useEffect, useRef, useState } from "react";
import { CirclePlus, Image, MessageCircle, Plus, Type, Video } from "lucide-react";
import toast from "react-hot-toast";
import StatusAvatar from "./StatusAvatar";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useStatusStore } from "../store/useStatusStore";

const MAX_STATUS_MEDIA_BYTES = 3 * 1024 * 1024;
const statusBackgrounds = ["violet", "plum", "rose", "indigo", "midnight"];
const allowedStatusMimeTypes = new Set([
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "video/mp4", "video/webm", "video/quicktime",
]);

const StatusComposer = ({ onClose }) => {
    const contacts = useChatStore((state) => state.allcontacts);
    const getAllContacts = useChatStore((state) => state.getAllContacts);
    const createStatus = useStatusStore((state) => state.createStatus);
    const [type, setType] = useState("text");
    const [text, setText] = useState("");
    const [background, setBackground] = useState("violet");
    const [file, setFile] = useState(null);
    const [fileData, setFileData] = useState("");
    const [visibility, setVisibility] = useState("contacts");
    const [excludedUsers, setExcludedUsers] = useState([]);
    const [allowedUsers, setAllowedUsers] = useState([]);
    const [isPosting, setIsPosting] = useState(false);
    const fileRef = useRef(null);

    useEffect(() => {
        if (!contacts.length) void getAllContacts();
    }, [contacts.length, getAllContacts]);

    const selectType = (nextType) => {
        setType(nextType);
        setFile(null);
        setFileData("");
        if (fileRef.current) fileRef.current.value = "";
    };

    const handleFile = (event) => {
        const selected = event.target.files?.[0];
        if (!selected) return;
        const isImage = selected.type.startsWith("image/");
        const isVideo = selected.type.startsWith("video/");
        if (!allowedStatusMimeTypes.has(selected.type) || (type === "image" && !isImage) || (type === "video" && !isVideo)) {
            toast.error(type === "image" ? "Choose a supported photo" : "Choose a supported video");
            event.target.value = "";
            return;
        }
        if (selected.size > MAX_STATUS_MEDIA_BYTES) {
            toast.error("Status media must be 3 MB or smaller");
            event.target.value = "";
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result !== "string") {
                toast.error("Could not read the selected file");
                return;
            }
            setFile(selected);
            setFileData(reader.result);
        };
        reader.onerror = () => toast.error("Could not read the selected file");
        reader.readAsDataURL(selected);
    };

    const togglePrivacyUser = (userId) => {
        const setter = visibility === "except" ? setExcludedUsers : setAllowedUsers;
        setter((current) => current.includes(userId)
            ? current.filter((id) => id !== userId)
            : [...current, userId]);
    };

    const submit = async (event) => {
        event.preventDefault();
        if (type === "text" && !text.trim()) {
            toast.error("Write something for your status");
            return;
        }
        if (type !== "text" && !fileData) {
            toast.error("Choose a photo or video first");
            return;
        }

        setIsPosting(true);
        const status = await createStatus({
            type,
            text: text.trim(),
            background,
            mediaData: fileData || undefined,
            mediaType: type === "text" ? undefined : type,
            mediaMimeType: file?.type,
            mediaName: file?.name,
            visibility,
            excludedUsers: visibility === "except" ? excludedUsers : [],
            allowedUsers: visibility === "only" ? allowedUsers : [],
        });
        setIsPosting(false);
        if (status) onClose();
    };

    const privacyList = visibility === "except" ? excludedUsers : allowedUsers;

    return (
        <div className="hama-feature-modal-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
        }}>
            <form className="hama-status-composer" onSubmit={submit} role="dialog" aria-modal="true" aria-label="Create status">
                <header>
                    <div>
                        <span className="hama-feature-eyebrow">SHARE A MOMENT</span>
                        <h2>Create status</h2>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close status creator">×</button>
                </header>

                <div className="hama-status-type-tabs" role="tablist" aria-label="Status type">
                    <button type="button" className={type === "text" ? "is-active" : ""} onClick={() => selectType("text")}>
                        <Type size={17} /> Text
                    </button>
                    <button type="button" className={type === "image" ? "is-active" : ""} onClick={() => selectType("image")}>
                        <Image size={17} /> Photo
                    </button>
                    <button type="button" className={type === "video" ? "is-active" : ""} onClick={() => selectType("video")}>
                        <Video size={17} /> Video
                    </button>
                </div>

                {type === "text" ? (
                    <>
                        <div className={`hama-status-text-preview hama-status-card--${background}`}>
                            <textarea
                                value={text}
                                onChange={(event) => setText(event.target.value.slice(0, 700))}
                                placeholder="What's on your mind?"
                                maxLength={700}
                                aria-label="Status text"
                            />
                            <span>{text.length}/700</span>
                        </div>
                        <div className="hama-status-backgrounds" aria-label="Text background">
                            {statusBackgrounds.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    aria-label={`${color} background`}
                                    aria-pressed={background === color}
                                    className={`hama-status-color hama-status-card--${color} ${background === color ? "is-selected" : ""}`}
                                    onClick={() => setBackground(color)}
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="hama-status-file-picker">
                        {fileData ? (
                            type === "image"
                                ? <img src={fileData} alt="Status preview" />
                                : <video src={fileData} controls playsInline aria-label="Video status preview" />
                        ) : (
                            <div>
                                {type === "image" ? <Image size={30} /> : <Video size={30} />}
                                <span>Select a {type === "image" ? "photo" : "video"} up to 3 MB</span>
                            </div>
                        )}
                        <input
                            ref={fileRef}
                            type="file"
                            accept={type === "image" ? "image/jpeg,image/png,image/gif,image/webp" : "video/mp4,video/webm,video/quicktime"}
                            onChange={handleFile}
                        />
                    </div>
                )}

                {type !== "text" && (
                    <input
                        className="hama-status-caption"
                        value={text}
                        onChange={(event) => setText(event.target.value.slice(0, 700))}
                        placeholder="Add a caption (optional)"
                        maxLength={700}
                        aria-label="Status caption"
                    />
                )}

                <label className="hama-status-privacy-select">
                    Status visibility
                    <select value={visibility} onChange={(event) => setVisibility(event.target.value)}>
                        <option value="contacts">My Contacts</option>
                        <option value="except">My Contacts Except...</option>
                        <option value="only">Only Share With...</option>
                    </select>
                </label>
                {visibility !== "contacts" && (
                    <div className="hama-status-privacy-list custom-scroll">
                        {contacts.map((contact) => {
                            const id = String(contact._id);
                            return (
                                <label key={id}>
                                    <input
                                        type="checkbox"
                                        checked={privacyList.includes(id)}
                                        onChange={() => togglePrivacyUser(id)}
                                    />
                                    <span>{contact.fullName}</span>
                                </label>
                            );
                        })}
                        {!contacts.length && <span>No contacts available.</span>}
                    </div>
                )}

                <footer>
                    <small>Statuses disappear after 24 hours.</small>
                    <button type="submit" disabled={isPosting}>
                        <CirclePlus size={17} /> {isPosting ? "Posting..." : "Post status"}
                    </button>
                </footer>
            </form>
        </div>
    );
};

const StatusPage = () => {
    const authUser = useAuthStore((state) => state.authUser);
    const statusGroups = useStatusStore((state) => state.statusGroups);
    const isLoadingStatuses = useStatusStore((state) => state.isLoadingStatuses);
    const loadStatuses = useStatusStore((state) => state.loadStatuses);
    const openViewer = useStatusStore((state) => state.openViewer);
    const [isComposerOpen, setIsComposerOpen] = useState(false);

    useEffect(() => {
        void loadStatuses();
    }, [loadStatuses]);

    const groupsByUser = [...statusGroups].sort((a, b) => {
        const aIsOwn = String(a.user?._id) === String(authUser?._id);
        const bIsOwn = String(b.user?._id) === String(authUser?._id);
        return Number(bIsOwn) - Number(aIsOwn);
    });
    const ownStatusGroup = groupsByUser.find(
        (group) => String(group.user?._id) === String(authUser?._id)
    );

    return (
        <section className="hama-feature-page hama-status-page">
            <header className="hama-feature-header">
                <div>
                    <span className="hama-feature-eyebrow">SHARE MOMENTS</span>
                    <h1>Status</h1>
                    <p>Photos, videos, and thoughts that disappear after 24 hours.</p>
                </div>
                <button type="button" className="hama-feature-primary" onClick={() => setIsComposerOpen(true)}>
                    <Plus size={19} /> Add status
                </button>
            </header>

            <div className="hama-status-list custom-scroll">
                <button
                    type="button"
                    className="hama-status-own-row"
                    onClick={() => ownStatusGroup ? openViewer(authUser._id) : setIsComposerOpen(true)}
                >
                    <span className="hama-status-add-avatar">
                        <img src={authUser?.profilepic || "/avatar.jpg"} alt="" />
                        <i><Plus size={14} /></i>
                    </span>
                    <span>
                        <strong>My status</strong>
                        <small>{ownStatusGroup
                            ? "Tap to view your active updates"
                            : "Share a photo, video, or text update"}</small>
                    </span>
                </button>

                {groupsByUser
                    .filter((group) => String(group.user?._id) !== String(authUser?._id))
                    .map((group) => {
                        const latest = group.statuses.at(-1);
                        return (
                            <div className="hama-status-contact-row" key={group.user._id}>
                                <StatusAvatar user={group.user} className="hama-status-list-avatar" />
                                <button type="button" onClick={() => openViewer(group.user._id)}>
                                    <strong>{group.user.fullName}</strong>
                                    <small>
                                        {group.statuses.length > 1 ? `${group.statuses.length} updates · ` : ""}
                                        {new Date(latest.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                    </small>
                                </button>
                            </div>
                        );
                    })}

                {isLoadingStatuses && <div className="hama-feature-loading">Loading statuses...</div>}
                {!isLoadingStatuses && !groupsByUser.length && (
                    <div className="hama-status-empty">
                        <MessageCircle size={29} />
                        <strong>No active statuses</strong>
                        <span>Post an update or check back when your contacts share a moment.</span>
                    </div>
                )}
            </div>

            {isComposerOpen && <StatusComposer onClose={() => setIsComposerOpen(false)} />}
        </section>
    );
};

export default StatusPage;
