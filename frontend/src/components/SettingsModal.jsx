import React, { useState, useRef } from 'react';
import { X, Camera, User, Mail, Lock, Eye, EyeOff, Save, Loader2, LogOut, MessageSquare, Briefcase } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';

const SettingsModal = ({ isOpen, onClose }) => {
    const { authUser, updateProfilePicture, updateUserDetails, changePassword, isUpdatingProfile, logout } = useAuthStore();

    // States for forms
    const [userDetails, setUserDetails] = useState({
        fullName: authUser?.fullName || "",
        email: authUser?.email || "",
        bio: authUser?.bio || "",
        profession: authUser?.profession || ""
    });
    const [password, setpassword] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
    const [showPass, setShowPass] = useState({ old: false, new: false, confirm: false });
    const [selectedImg, setSelectedImg] = useState(null);

    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    // 1. Profile Picture Logic [Source: ProfileHeader.jsx]
    const handleImageUpload = (e) => {
        const file = e.target.files[0]; // Use optional chaining

        if (!file) {
            console.log("No file selected");
            return;
        }

        // Validation: Ensure it's an image
        if (!file.type.startsWith("image/")) {
            return toast.error("Please select an image file");
        }

        // Validation: Size check (Optional, e.g., 5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            return toast.error("Image size must be less than 5MB");
        }

        const reader = new FileReader();

        reader.onloadstart = () => {
            // You can set a small loading state here if you want
        };

        reader.onloadend = () => {
            const base64Image = reader.result;
            setSelectedImg(base64Image); // This updates the preview in your UI
        };

        reader.onerror = () => {
            toast.error("Failed to read file");
        };

        reader.readAsDataURL(file); // This is where the error was happening
    };

    const saveProfilePic = async () => {
        if (!selectedImg) return toast.error("Please select an image first");
        await updateProfilePicture({ profilepic: selectedImg });
        setSelectedImg(null);
        toast.success("Profile Pic Updated")
    };

    // 2. User Details Logic
    const handleUpdateDetails = async (e) => {
        e.preventDefault();
        await updateUserDetails(userDetails);
    };

    // 3. Password Change Logic [Source: auth.controller.js]
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (password.newPassword !== password.confirmPassword) {
            return toast.error("New password do not match");
        }
        const success = await changePassword(password);
        if (success) setpassword({ oldPassword: "", newPassword: "", confirmPassword: "" });
    };

    return (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-[#0f0f0f] border border-white/10 w-full max-w-4xl rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-auto shadow-2xl">

                {/* LEFT SECTION: Profile Pic (Based on UI Sample) */}
                <div className="w-full md:w-[35%] p-8 border-b md:border-b-0 md:border-r border-white/5 flex flex-col items-center justify-center gap-6 bg-white/[0.02]">
                    {/* Avatar Preview Section */}
                    <div className="relative group">
                        <div className="h-40 w-40 rounded-full border-2 border-blue-500/30 p-1 overflow-hidden">
                            <img
                                src={selectedImg || authUser?.profilepic || "/avatar.jpg"}
                                className="h-full w-full rounded-full object-cover bg-gray-900"
                                alt="Profile"
                            />
                        </div>

                        {/* Hidden File Input */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageUpload} // The fixed function above
                        />

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-2 right-2 bg-blue-600 p-3 rounded-full hover:scale-110 transition-transform shadow-xl"
                        >
                            <Camera size={18} className="text-white" />
                        </button>
                    </div>

                    {/* Save Button (Only show if a new image is selected) */}
                    {selectedImg && (
                        <div className="flex flex-col gap-2 w-full px-4 mt-4">
                            <button
                                onClick={saveProfilePic}
                                disabled={isUpdatingProfile}
                                className="w-full py-2 bg-green-600 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-2"
                            >
                                {isUpdatingProfile ? <Loader2 size={12} className="animate-spin" /> : "Confirm Upload"}
                            </button>

                            {/* ADD THIS CANCEL BUTTON */}
                            <button
                                onClick={() => setSelectedImg(null)}
                                disabled={isUpdatingProfile}
                                className="w-full py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-[10px] font-bold transition-all"
                            >
                                Cancel
                            </button>
                        </div>

                    )}
                    <div className="border-t border-white/5 flex flex-col gap-5 justify-between items-center">
                        <div className="flex flex-col">
                            <p className="text-[10px] text-gray-500 font-medium">Session Management</p>
                            <p className="text-[9px] text-gray-600">Sign out of your account on this device</p>
                        </div>
                        <button
                            onClick={logout}
                            className="bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white px-6 py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-2 border border-red-500/20"
                        >
                            <LogOut size={14} />
                            Logout Account
                        </button>
                    </div>
                </div>

                {/* RIGHT SECTION: Details & Password */}
                <div className="flex-1 px-8 py-3 overflow-y-auto space-y-4">
                    <div className="flex justify-between items-start">
                        <h2 className="text-2xl font-bold text-white tracking-tight">Account Settings</h2>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white"><X size={20} /></button>
                    </div>

                    {/* Section 2: Change User Details */}
                    <div className="space-y-4">
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em]">Personal Information</p>
                        <form onSubmit={handleUpdateDetails} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={14} />
                                <input
                                    type="text"
                                    value={userDetails.fullName}
                                    onChange={(e) => setUserDetails({ ...userDetails, fullName: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-xs text-white outline-none focus:border-blue-500/50"
                                    placeholder="Username"
                                />
                            </div>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={14} />
                                <input
                                    type="email"
                                    value={userDetails.email}
                                    onChange={(e) => setUserDetails({ ...userDetails, email: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-xs text-white outline-none focus:border-blue-500/50"
                                    placeholder="Email"
                                />
                            </div>
                            {/* Bio */}
                            <div className="relative group md:col-span-2">
                                <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={14} />
                                <input
                                    type="text"
                                    value={userDetails.bio}
                                    onChange={(e) => setUserDetails({ ...userDetails, bio: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-xs text-white outline-none focus:border-blue-500/50"
                                    placeholder="About you..."
                                    maxLength={100}
                                />
                            </div>

                            {/* Profession */}
                            <div className="relative group md:col-span-2">
                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={14} />
                                <input
                                    type="text"
                                    value={userDetails.profession}
                                    onChange={(e) => setUserDetails({ ...userDetails, profession: e.target.value })}
                                    className="w-56 bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-xs text-white outline-none focus:border-blue-500/50"
                                    placeholder="Your profession (e.g. Software Engineer)"
                                    maxLength={50}
                                />
                            </div>
                            <button type="submit" className="md:col-span-2 w-max bg-white/10 hover:bg-blue-600 px-6 py-2.5 rounded-lg text-white text-[11px] font-bold transition-all self-end">
                                Save Details
                            </button>
                        </form>
                    </div>

                    <div className="h-[1px] bg-white/5" />

                    {/* Section 3: Change Password */}
                    <div className="space-y-4">
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em]">Security & Password</p>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={14} />
                                <input
                                    type={showPass.old ? "text" : "password"}
                                    value={password.oldPassword}
                                    onChange={(e) => setpassword({ ...password, oldPassword: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-12 text-xs text-white outline-none focus:border-blue-500/50"
                                    placeholder="Old Password"
                                />
                                <button type="button" onClick={() => setShowPass({ ...showPass, old: !showPass.old })} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white">
                                    {showPass.old ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={14} />
                                    <input
                                        type={showPass.new ? "text" : "password"}
                                        value={password.newPassword}
                                        onChange={(e) => setpassword({ ...password, newPassword: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-12 text-xs text-white outline-none focus:border-blue-500/50"
                                        placeholder="New Password"
                                    />
                                    <button type="button" onClick={() => setShowPass({ ...showPass, new: !showPass.new })} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white">
                                        {showPass.new ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={14} />
                                    <input
                                        type={showPass.confirm ? "text" : "password"}
                                        value={password.confirmPassword}
                                        onChange={(e) => setpassword({ ...password, confirmPassword: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-12 text-xs text-white outline-none focus:border-blue-500/50"
                                        placeholder="Confirm Password"
                                    />
                                    <button type="button" onClick={() => setShowPass({ ...showPass, confirm: !showPass.confirm })} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white">
                                        {showPass.confirm ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button type="submit" disabled={isUpdatingProfile} className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-xl text-white text-[11px] font-bold shadow-lg shadow-blue-600/10 transition-all flex items-center gap-2 disabled:opacity-50">
                                    {isUpdatingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    {isUpdatingProfile ? "Updating..." : "Update Security"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SettingsModal;