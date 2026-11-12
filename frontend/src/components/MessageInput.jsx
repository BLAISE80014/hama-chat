import { Image, Send, Shield, XIcon } from 'lucide-react'
import React, { useRef, useState } from 'react'
import { useChatStore } from '../store/useChatStore';
import toast from 'react-hot-toast';
import useWindowSize from '../hooks/useWindowSize';
import { useAuthStore } from '../store/useAuthStore';

const MessageInput = () => {

    const { sendMessage } = useChatStore();
    const { blockedUsers } = useAuthStore();
    const { selectedUser } = useChatStore();
    const isBlocked = blockedUsers.includes(selectedUser?._id);
    const { isMobile } = useWindowSize();

    const [text, setText] = useState("");
    const [imagePreview, setImagePreview] = useState(null);

    const FileInputRef = useRef(null);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!text.trim() && !imagePreview) return;
        sendMessage({ text: text.trim(), image: imagePreview })
        setText("");
        setImagePreview(null);
        if (FileInputRef.current) FileInputRef.current.value = ""
    }

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (!file.type.startsWith("image/")) {
            toast.error("Please select a valid image file");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result)
        reader.readAsDataURL(file);
    }

    const RemoveImagePreview = () => {
        setImagePreview(null);
        if (FileInputRef.current) FileInputRef.current.value = "";
    }

    if (isBlocked) {
        return (
            <div className="w-full p-4 border-t border-gray-300/20 flex items-center justify-center">
                <p className="text-red-400 text-sm flex items-center gap-2">
                    <Shield size={16} />
                    You have blocked this user. Unblock to send messages.
                </p>
            </div>
        );
    }
    
    return (
        <div className={`w-full border-t border-gray-300/20 flex flex-col gap-2 ${isMobile ? 'p-2' : 'p-4'}`}>

            {/* Image Preview */}
            {imagePreview && (
                <div className="relative w-fit">
                    <img
                        src={imagePreview}
                        alt="Preview"
                        className={`object-cover rounded-lg border border-slate-700 ${isMobile ? 'w-14 h-14' : 'w-20 h-20'}`}
                    />
                    <button
                        onClick={RemoveImagePreview}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 hover:bg-slate-700"
                        type="button"
                    >
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Input Row */}
            <form
                className='w-full flex items-center gap-2'
                onSubmit={handleSendMessage}
            >
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type your message..."
                    className={`flex-1 border border-gray-300/20 bg-gray-100/20 outline-none rounded-lg ${isMobile ? 'p-1.5 text-sm' : 'p-2'}`}
                />

                <input
                    type="file"
                    accept="image/*"
                    ref={FileInputRef}
                    className='hidden'
                    onChange={handleImageChange}
                />

                <button
                    type='submit'
                    disabled={!text.trim() && !imagePreview}
                    className={`bg-blue-500/20 text-white rounded-lg ${isMobile ? 'p-2' : 'p-3'}`}>
                    <Send size={isMobile ? 18 : 24} />
                </button>

                <button
                    type='button'
                    onClick={() => FileInputRef.current.click()}
                    className={`bg-blue-500/20 text-white rounded-lg ${isMobile ? 'p-2' : 'p-3'}`}>
                    <Image size={isMobile ? 18 : 24} />
                </button>
            </form>

        </div>
    )
}

export default MessageInput;