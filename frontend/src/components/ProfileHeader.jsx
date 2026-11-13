import React, { useRef, useState } from 'react'
import { Camera, Settings } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import StatusAvatar from './StatusAvatar'

const ProfileHeader = ({ onOpenSettings, compact = false }) => {
    const { authUser, updateProfilePicture } = useAuthStore()
    const [selectedImg, setSelectedImg] = useState(null)
    const fileInputRef = useRef(null)

    const handleImageUpload = (event) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onloadend = async () => {
            const base64Image = reader.result
            setSelectedImg(base64Image)
            await updateProfilePicture({ profilepic: base64Image })
        }
    }

    return (
        <div className={`hama-profile-card ${compact ? 'hama-profile-card--compact' : ''}`}>
            <div className="hama-profile-avatar avatar online">
                <StatusAvatar
                    user={authUser}
                    imageSrc={selectedImg || authUser?.profilepic || '/avatar.jpg'}
                    className="hama-profile-status-avatar"
                    onNoStatusClick={() => fileInputRef.current?.click()}
                />
                <button
                    type="button"
                    className="hama-avatar-edit-overlay"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Change profile picture"
                >
                    <Camera size={13} />
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                />
            </div>
            <div className="hama-profile-copy">
                <strong title={authUser?.fullName}>{authUser?.fullName}</strong>
                <span><i />Online</span>
            </div>
            <button
                type="button"
                className="hama-profile-settings"
                onClick={onOpenSettings}
                aria-label="Open account settings"
                title="Settings"
            >
                <Settings size={17} />
            </button>
        </div>
    )
}

export default ProfileHeader
