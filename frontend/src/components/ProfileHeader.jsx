import { LocateFixed, LogOut, Settings } from 'lucide-react'
import React, { useRef, useState } from 'react'
import { useAuthStore } from '../store/useAuthStore';
import useWindowSize from '../hooks/useWindowSize';
import SettingsModal from '../components/SettingsModal'

const ProfileHeader = () => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { authUser, updateProfilePicture } = useAuthStore();
    const { isMobile, isTablet } = useWindowSize();

    const [selectedImg, setSelectedImg] = useState(null);

    const fileInputRef = useRef(null);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return

        const reader = new FileReader();
        reader.readAsDataURL(file)
        reader.onloadend = async () => {
            const base64Image = reader.result;
            setSelectedImg(base64Image);
            await updateProfilePicture({ profilepic: base64Image })
        }
    }

    // ─── MOBILE & TABLET: avatar only, centered, with setting below ────────────
    if (isMobile || isTablet) {
        return (
            <div className='w-full flex flex-col items-center gap-2 py-2 border-b border-white/10'>
                {/* Avatar */}
                <div className='avatar online relative'>
                    <button
                        className='h-10 w-10 rounded-full border border-white/10 relative group'
                        onClick={() => fileInputRef.current.click()}
                    >
                        <img
                            src={selectedImg || authUser.profilepic || "/avatar.jpg"}
                            alt=""
                            className='h-10 w-10 rounded-full border border-white/10 object-cover'
                        />
                        <div className='absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-full transition-all'>
                            <span className='text-[9px] text-white'>Edit</span>
                        </div>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept='image/*'
                        onChange={handleImageUpload}
                        className='hidden'
                    />
                </div>

                {/* Logout icon below avatar */}
                <button className='text-xs text-white/70 hover:text-white/100' onClick={() => setIsSettingsOpen(true)}>
                    <Settings size={16} />
                </button>
                <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            </div>
        );
    }

    // ─── DESKTOP: original setting, untouched ──────────────────────────────────
    return (
        <div className='h-16 w-full flex items-center gap-2 px-4 py-2 border-b border-white/10'>
            <div className='flex items-center gap-2 bg-white/10 rounded-full'>
                <div className='avatar online '>
                    <button
                        className='h-12 w-12 rounded-full border border-white/10 group'
                        onClick={() => fileInputRef.current.click()}
                    >
                        <img src={selectedImg || authUser.profilepic || "/avatar.jpg"} alt=""
                            className='h-12 w-12 rounded-full border border-white/10 object-contain' />
                        <div className='absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 rounded-full transition-all'>
                            <span className='text-[12px] text-white/70 hover:text-white/100'>Change</span>
                        </div>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept='image/*'
                        onChange={handleImageUpload}
                        className='hidden'
                    />
                </div>
            </div>

            {/* Name and Status */}
            <div className='flex flex-col items-start'>
                <span className='text-sm font-semibold'>
                    {authUser.fullName.length > 9
                        ? authUser.fullName.slice(0, 6) + "..."
                        : authUser.fullName}
                </span>
                <span className='text-xs text-white/70 text-green-500'>Online</span>
            </div>

            {/* Logout Button */}
            <div className='flex items-center ml-5'>
                <button className='text-xs text-white/70 hover:text-white/100' onClick={() => setIsSettingsOpen(true)}>
                    <Settings size={16} />
                </button>
                <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            </div>
        </div>
    );
}

export default ProfileHeader;