import { useEffect, useState } from 'react';
import { X, Calendar, User, MessageSquare, Briefcase, Shield, ShieldOff } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { axiosInstance } from '../lib/axios'; // your axios instance

const ReceiverProfileDrawer = () => {
    const { selectedUser, showReceiverProfile, setShowReceiverProfile } = useChatStore();
    const { onlineUsers, blockedUsers, toggleBlockUser, fetchBlockedUsers } = useAuthStore();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isBlocking, setIsBlocking] = useState(false);

    useEffect(() => {
        if (!showReceiverProfile || !selectedUser?._id) return;

        const fetchProfile = async () => {
            setLoading(true);
            try {
                const res = await axiosInstance.get(`/messages/profile/${selectedUser._id}`);
                setProfile(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
        fetchBlockedUsers();
    }, [showReceiverProfile, selectedUser]);

    if (!showReceiverProfile) return null;

    const isOnline = onlineUsers.includes(selectedUser?._id);

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 z-40"
                onClick={() => setShowReceiverProfile(false)}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-80 bg-base-100 shadow-2xl z-50 flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-300/20">
                    <h2 className="font-semibold text-lg">Profile Info</h2>
                    <button onClick={() => setShowReceiverProfile(false)}>
                        <X size={22} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <span className="loading loading-spinner loading-md" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center gap-4">
                        {/* Avatar */}
                        <div className={`avatar ${isOnline ? 'online' : ''} w-24 h-24 rounded-full`}>
                            <img
                                src={profile?.profilepic || "/avatar.jpg"}
                                alt={profile?.fullName}
                                className="w-24 h-24 rounded-full object-cover"
                            />
                        </div>

                        {/* Name & Status */}
                        <div className="text-center">
                            <h3 className="text-xl font-bold">{profile?.fullName}</h3>
                            <span className={`text-sm ${isOnline ? 'text-green-500' : 'text-gray-400'}`}>
                                {isOnline ? '🟢 Online' : '⚫ Offline'}
                            </span>
                        </div>

                        {/* Details */}
                        <div className="w-full mt-4 flex flex-col gap-3">
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-base-200">
                                <MessageSquare size={18} className="text-primary" />
                                <div>
                                    <p className="text-xs text-gray-400">About</p>
                                    <p className="text-sm font-medium">{profile?.bio || "Hey there! I am using this app."}</p>
                                </div>
                            </div>

                            {/* // Profession */}
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-base-200">
                                <Briefcase size={18} className="text-primary" />
                                <div>
                                    <p className="text-xs text-gray-400">Profession</p>
                                    <p className="text-sm font-medium">{profile?.profession || "Not specified"}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-lg bg-base-200">
                                <User size={18} className="text-primary" />
                                <div>
                                    <p className="text-xs text-gray-400">Username</p>
                                    <p className="text-sm font-medium">{profile?.fullName}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-lg bg-base-200">
                                <Calendar size={18} className="text-primary" />
                                <div>
                                    <p className="text-xs text-gray-400">Joined</p>
                                    <p className="text-sm font-medium">
                                        {new Date(profile?.createdAt).toLocaleDateString('en-IN', {
                                            year: 'numeric', month: 'long', day: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>
                            {/* Block / Unblock Button */}
                            <button
                                onClick={async () => {
                                    setIsBlocking(true);
                                    await toggleBlockUser(selectedUser._id);
                                    setIsBlocking(false);
                                }}
                                disabled={isBlocking}
                                className={`w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all
        ${blockedUsers.includes(selectedUser?._id)
                                        ? "bg-green-600/20 text-green-400 hover:bg-green-600/30"
                                        : "bg-red-600/20 text-red-400 hover:bg-red-600/30"
                                    }`}
                            >
                                {isBlocking ? (
                                    <span className="loading loading-spinner loading-xs" />
                                ) : blockedUsers.includes(selectedUser?._id) ? (
                                    <><ShieldOff size={16} /> Unblock User</>
                                ) : (
                                    <><Shield size={16} /> Block User</>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default ReceiverProfileDrawer;