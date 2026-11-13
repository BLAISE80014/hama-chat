import { useEffect, useState } from 'react';
import {
    Briefcase,
    Calendar,
    ChevronRight,
    FileAudio,
    FileText,
    Image as ImageIcon,
    MessageSquare,
    MoreHorizontal,
    Phone,
    Shield,
    ShieldOff,
    User,
    Video,
    X,
    ZoomIn,
} from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { useCallStore } from '../store/useCallStore';
import { axiosInstance } from '../lib/axios';

const ReceiverProfileDrawer = ({ docked = false, onDismiss }) => {
    const { selectedUser, showReceiverProfile, setShowReceiverProfile, setActiveTab } = useChatStore();
    const { onlineUsers, blockedUsers, toggleBlockUser, fetchBlockedUsers } = useAuthStore();
    const startCall = useCallStore((state) => state.startCall);
    const [profile, setProfile] = useState(null);
    const [sharedMedia, setSharedMedia] = useState([]);
    const [sharedMediaTotal, setSharedMediaTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [mediaLoading, setMediaLoading] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [mediaError, setMediaError] = useState('');
    const [isBlocking, setIsBlocking] = useState(false);
    const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [showMoreOptions, setShowMoreOptions] = useState(false);

    const contactId = selectedUser?._id;
    const isOpen = docked ? Boolean(contactId) : showReceiverProfile;
    const isOnline = onlineUsers.some((id) => String(id) === String(contactId));
    const isBlocked = blockedUsers.some((id) => String(id) === String(contactId));
    const profilePicture = profile?.profilepic || selectedUser?.profilepic || '/avatar.jpg';
    const displayName = profile?.fullName || selectedUser?.fullName || 'Contact';

    useEffect(() => {
        if (!isOpen || !contactId) return undefined;

        let isActive = true;
        setProfile(null);
        setSharedMedia([]);
        setSharedMediaTotal(0);
        setProfileError('');
        setMediaError('');
        setLoading(true);
        setMediaLoading(true);
        void fetchBlockedUsers();

        const loadProfileAndMedia = async () => {
            const [profileResult, mediaResult] = await Promise.allSettled([
                axiosInstance.get(`/messages/profile/${contactId}`),
                axiosInstance.get('/messages/media', {
                    params: { contactId, page: 1, limit: 8, sort: 'newest' },
                }),
            ]);

            if (!isActive) return;

            if (profileResult.status === 'fulfilled') {
                setProfile(profileResult.value.data);
            } else {
                setProfileError('Could not load profile information.');
            }
            if (mediaResult.status === 'fulfilled') {
                setSharedMedia(mediaResult.value.data?.items || []);
                setSharedMediaTotal(mediaResult.value.data?.total || 0);
            } else {
                setMediaError('Could not load shared media.');
            }
            setLoading(false);
            setMediaLoading(false);
        };

        void loadProfileAndMedia();
        return () => {
            isActive = false;
        };
    }, [contactId, fetchBlockedUsers, isOpen]);

    useEffect(() => {
        if (!imagePreviewOpen && !mediaPreview) return undefined;
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setImagePreviewOpen(false);
                setMediaPreview(null);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [imagePreviewOpen, mediaPreview]);

    if (!isOpen || !contactId) return null;

    const closeProfile = () => {
        if (docked) onDismiss?.();
        else setShowReceiverProfile(false);
    };

    const toggleBlock = async () => {
        setIsBlocking(true);
        try {
            await toggleBlockUser(contactId);
        } finally {
            setIsBlocking(false);
            setShowMoreOptions(false);
        }
    };

    const renderMediaPreview = (item) => {
        if (item.mediaType === 'image') {
            return <img src={item.mediaUrl} alt={item.mediaName || 'Shared image'} />;
        }
        if (item.mediaType === 'video') {
            return <video src={item.mediaUrl} controls playsInline />;
        }
        if (item.mediaType === 'audio' || item.mediaType === 'voice') {
            return <audio src={item.mediaUrl} controls />;
        }
        return (
            <div className="hama-profile-media-file">
                <FileText size={38} />
                <span>{item.mediaName || 'Shared file'}</span>
            </div>
        );
    };

    return (
        <>
            {!docked && (
                <div
                    className="fixed inset-0 bg-black/40 z-40"
                    onClick={closeProfile}
                />
            )}
            <section
                className={`hama-profile-drawer ${docked ? 'hama-profile-drawer--docked' : 'fixed right-0 top-0 h-full w-80 shadow-2xl z-50 animate-slide-in-right'} flex flex-col`}
                role="dialog"
                aria-modal={!docked}
                aria-label={`${displayName} profile`}
            >
                <header className="hama-profile-drawer-heading flex items-center justify-between p-4 border-b border-gray-300/20">
                    <h2 className="font-semibold text-lg">Profile Info</h2>
                    {!docked && (
                        <button
                            type="button"
                            onClick={closeProfile}
                            aria-label="Close profile"
                        >
                            <X size={22} />
                        </button>
                    )}
                </header>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <span className="loading loading-spinner loading-md" />
                    </div>
                ) : (
                    <div className="hama-profile-drawer-content flex-1 overflow-y-auto p-6 flex flex-col items-center gap-4">
                        <button
                            type="button"
                            className={`hama-profile-image-trigger avatar ${isOnline ? 'online' : ''}`}
                            onClick={() => setImagePreviewOpen(true)}
                            aria-label={`Preview ${displayName}'s profile picture`}
                        >
                            <img src={profilePicture} alt="" />
                            <span><ZoomIn size={15} /></span>
                        </button>

                        <div className="text-center">
                            <h3 className="text-xl font-bold">{displayName}</h3>
                            <span className={`hama-profile-presence ${isOnline ? 'is-online' : ''}`}>
                                <i />
                                {isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div>

                        <div className="hama-profile-actions">
                            <button
                                type="button"
                                onClick={() => startCall(selectedUser, 'audio')}
                                aria-label={`Start voice call with ${displayName}`}
                                title="Voice call"
                            >
                                <Phone size={18} />
                            </button>
                            <button
                                type="button"
                                onClick={() => startCall(selectedUser, 'video')}
                                aria-label={`Start video call with ${displayName}`}
                                title="Video call"
                            >
                                <Video size={18} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowMoreOptions((value) => !value)}
                                aria-label="More contact options"
                                aria-expanded={showMoreOptions}
                                title="More options"
                            >
                                <MoreHorizontal size={19} />
                            </button>
                            {showMoreOptions && (
                                <div className="hama-profile-more-menu">
                                    <button type="button" onClick={toggleBlock} disabled={isBlocking}>
                                        {isBlocked ? <ShieldOff size={15} /> : <Shield size={15} />}
                                        {isBlocked ? 'Unblock contact' : 'Block contact'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {profileError && <p className="hama-profile-error" role="alert">{profileError}</p>}

                        <div className="w-full mt-2 flex flex-col gap-3">
                            {(profile?.bio || selectedUser?.bio) && (
                                <div className="hama-profile-detail flex items-center gap-3 p-3 rounded-lg">
                                    <MessageSquare size={18} />
                                    <div>
                                        <p className="text-xs">About</p>
                                        <p className="text-sm font-medium">{profile?.bio || selectedUser?.bio}</p>
                                    </div>
                                </div>
                            )}

                            {(profile?.profession || selectedUser?.profession) &&
                                (profile?.profession || selectedUser?.profession) !== 'Not specified' && (
                                    <div className="hama-profile-detail flex items-center gap-3 p-3 rounded-lg">
                                        <Briefcase size={18} />
                                        <div>
                                            <p className="text-xs">Profession</p>
                                            <p className="text-sm font-medium">{profile?.profession || selectedUser?.profession}</p>
                                        </div>
                                    </div>
                                )}

                            {(profile?.username || profile?.phoneNumber || profile?.phone) && (
                                <div className="hama-profile-detail flex items-center gap-3 p-3 rounded-lg">
                                    <User size={18} />
                                    <div>
                                        {profile?.username && (
                                            <>
                                                <p className="text-xs">Username</p>
                                                <p className="text-sm font-medium">{profile.username}</p>
                                            </>
                                        )}
                                        {(profile?.phoneNumber || profile?.phone) && (
                                            <>
                                                <p className="text-xs">Phone</p>
                                                <p className="text-sm font-medium">{profile.phoneNumber || profile.phone}</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {profile?.createdAt && (
                                <div className="hama-profile-detail flex items-center gap-3 p-3 rounded-lg">
                                    <Calendar size={18} />
                                    <div>
                                        <p className="text-xs">Joined</p>
                                        <p className="text-sm font-medium">
                                            {new Date(profile.createdAt).toLocaleDateString([], {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <section className="hama-profile-shared-media" aria-label="Shared media">
                                <div className="hama-profile-shared-heading">
                                    <strong>Shared media</strong>
                                    <span>{sharedMediaTotal}</span>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('media')}
                                        aria-label={`See all media shared with ${displayName}`}
                                    >
                                        See all <ChevronRight size={14} />
                                    </button>
                                </div>
                                {mediaLoading ? (
                                    <p className="hama-profile-media-message">Loading shared media...</p>
                                ) : mediaError ? (
                                    <p className="hama-profile-media-message" role="alert">{mediaError}</p>
                                ) : sharedMedia.length ? (
                                    <div className="hama-profile-media-grid">
                                        {sharedMedia.map((item) => (
                                            <button
                                                key={item._id}
                                                type="button"
                                                onClick={() => setMediaPreview(item)}
                                                aria-label={`Preview ${item.mediaName || item.mediaType}`}
                                            >
                                                {item.mediaType === 'image' ? (
                                                    <img src={item.mediaUrl} alt="" loading="lazy" />
                                                ) : item.mediaType === 'video' ? (
                                                    <><Video size={24} /><i>VIDEO</i></>
                                                ) : item.mediaType === 'audio' || item.mediaType === 'voice' ? (
                                                    <FileAudio size={24} />
                                                ) : (
                                                    <ImageIcon size={24} />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="hama-profile-media-message">No shared media yet.</p>
                                )}
                            </section>

                        </div>
                    </div>
                )}
            </section>

            {imagePreviewOpen && (
                <div
                    className="hama-profile-image-preview"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${displayName} profile picture`}
                    onClick={() => setImagePreviewOpen(false)}
                >
                    <button type="button" aria-label="Close image preview" onClick={() => setImagePreviewOpen(false)}>
                        <X size={22} />
                    </button>
                    <img src={profilePicture} alt={displayName} onClick={(event) => event.stopPropagation()} />
                </div>
            )}

            {mediaPreview && (
                <div className="hama-profile-media-preview" onClick={() => setMediaPreview(null)}>
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Preview ${mediaPreview.mediaName || 'shared media'}`}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <header>
                            <strong>{mediaPreview.mediaName || 'Shared media'}</strong>
                            <button type="button" onClick={() => setMediaPreview(null)} aria-label="Close shared media preview">
                                <X size={20} />
                            </button>
                        </header>
                        {renderMediaPreview(mediaPreview)}
                        <a href={mediaPreview.mediaUrl} download={mediaPreview.mediaName || 'shared-file'} target="_blank" rel="noreferrer">
                            Download
                        </a>
                    </section>
                </div>
            )}
        </>
    );
};

export default ReceiverProfileDrawer;
