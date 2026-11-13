import cloudinary from "./cloudinary.js";

const MAX_MEDIA_BYTES = 3 * 1024 * 1024;
const allowedMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "audio/webm",
    "audio/ogg",
    "audio/mp4",
    "audio/mpeg",
    "audio/wav",
    "audio/aac",
    "application/pdf",
    "application/msword",
    "application/rtf",
    "text/plain",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
    "application/x-zip-compressed",
]);

const mediaError = (message, status = 400) => Object.assign(new Error(message), { status });
const documentMimeTypes = new Set([
    "application/pdf",
    "application/msword",
    "application/rtf",
    "text/plain",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const normalizeName = (name, fallback) =>
    String(name || fallback)
        .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
        .trim()
        .slice(0, 180) || fallback;

const inferMediaType = (mimeType) => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (documentMimeTypes.has(mimeType)) return "document";
    if (mimeType === "application/zip" || mimeType === "application/x-zip-compressed") return "other";
    return "other";
};

export const uploadMediaData = async ({
    data,
    mediaType,
    mediaName,
    mediaMimeType,
    folder = "hama-chat/messages",
}) => {
    if (typeof data !== "string" || data.length > MAX_MEDIA_BYTES * 1.4) {
        throw mediaError("Media file exceeds the 3 MB limit");
    }

    const match = /^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
    if (!match) throw mediaError("Invalid media upload");

    const mimeType = match[1].toLowerCase();
    if (!allowedMimeTypes.has(mimeType)) {
        throw mediaError("This media type is not supported");
    }

    const bytes = Buffer.from(match[2], "base64");
    if (!bytes.length || bytes.length > MAX_MEDIA_BYTES) {
        throw mediaError("Media file exceeds the 3 MB limit");
    }

    const inferredType = inferMediaType(mimeType);
    if (
        !["image", "video", "audio", "voice", "document", "other"].includes(mediaType) ||
        (mediaType === "voice" && inferredType !== "audio") ||
        (mediaType !== "voice" && mediaType !== inferredType)
    ) {
        throw mediaError("Media type does not match the uploaded file");
    }
    if (mediaMimeType && mediaMimeType.toLowerCase() !== mimeType) {
        throw mediaError("Media MIME type does not match the uploaded file");
    }

    const resourceType = inferredType === "image"
        ? "image"
        : inferredType === "video" || inferredType === "audio"
            ? "video"
            : "raw";
    const fallbackName = mediaType === "voice" ? "Voice message" : `Shared ${mediaType}`;

    const upload = await cloudinary.uploader.upload(data, {
        folder,
        resource_type: resourceType,
        use_filename: false,
        unique_filename: true,
    });

    return {
        mediaUrl: upload.secure_url,
        mediaPublicId: upload.public_id,
        mediaType,
        mediaName: normalizeName(mediaName, fallbackName),
        mediaMimeType: mimeType,
        mediaSize: bytes.length,
        mediaDuration: undefined,
    };
};

export const uploadMessageMedia = async (data, options = {}) =>
    uploadMediaData({ data, ...options, folder: "hama-chat/messages" });

export const uploadStatusMedia = async (data, options = {}) =>
    uploadMediaData({ data, ...options, folder: "hama-chat/statuses" });

export const MAX_MEDIA_BYTES_PER_UPLOAD = MAX_MEDIA_BYTES;
