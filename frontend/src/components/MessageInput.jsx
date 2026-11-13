import { Paperclip, Send, Shield, Smile, XIcon } from 'lucide-react'
import React, { Suspense, lazy, useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { useChatStore } from '../store/useChatStore';
import toast from 'react-hot-toast';
import useWindowSize from '../hooks/useWindowSize';
import { useAuthStore } from '../store/useAuthStore';
import { insertAtSelection } from '../lib/insertAtSelection';

const EmojiPicker = lazy(() => import('emoji-picker-react'))

const MessageInput = () => {

    const { sendMessage } = useChatStore();
    const { blockedUsers, socket } = useAuthStore();
    const { selectedUser } = useChatStore();
    const isBlocked = blockedUsers.includes(selectedUser?._id);
    const { isMobile } = useWindowSize();

    const [text, setText] = useState("");
    const [imagePreview, setImagePreview] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);
    const inputRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const caretRef = useRef({ start: 0, end: 0 });
    const pendingCaretRef = useRef(null);

const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
    }

    if (isTypingRef.current && socket?.connected && selectedUser?._id) {
        socket.emit("stopTyping", {
            receiverId: String(selectedUser._id),
        });
    }

    isTypingRef.current = false;
}, [socket, selectedUser]);

const updateTyping = (value) => {
    if (value.trim() && socket?.connected && selectedUser?._id) {
        if (!isTypingRef.current) {
            socket.emit("typing", {
                receiverId: String(selectedUser._id),
            });
            isTypingRef.current = true;
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            stopTyping();
        }, 1500);
    } else if (!value.trim()) {
        stopTyping();
    }
};

const handleTextChange = (e) => {
    const value = e.currentTarget.value;
    caretRef.current = {
        start: e.currentTarget.selectionStart ?? value.length,
        end: e.currentTarget.selectionEnd ?? value.length,
    };
    setText(value);
    updateTyping(value);
};

const handleEmojiClick = ({ emoji }) => {
    const { text: nextText, caret: nextCaret } = insertAtSelection(text, emoji, caretRef.current);

    caretRef.current = { start: nextCaret, end: nextCaret };
    pendingCaretRef.current = nextCaret;
    setText(nextText);
    updateTyping(nextText);
    setShowEmojiPicker(false);
};

useLayoutEffect(() => {
    if (pendingCaretRef.current === null) return;
    const caret = pendingCaretRef.current;
    pendingCaretRef.current = null;
    inputRef.current?.focus();
    inputRef.current?.setSelectionRange(caret, caret);
}, [text]);

useEffect(() => {
    if (!showEmojiPicker) return undefined;

    const handleOutsidePointerDown = (event) => {
        if (!emojiPickerRef.current?.contains(event.target)) {
            setShowEmojiPicker(false);
        }
    };
    const handleEscape = (event) => {
        if (event.key === 'Escape') setShowEmojiPicker(false);
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
        document.removeEventListener('pointerdown', handleOutsidePointerDown);
        document.removeEventListener('keydown', handleEscape);
    };
}, [showEmojiPicker]);

useEffect(() => {
    return () => {
        stopTyping();
    };
}, [stopTyping]);

    const FileInputRef = useRef(null);

const handleSendMessage = (e) => {
    e.preventDefault();

    if (!text.trim() && !imagePreview) return;

    stopTyping();

    sendMessage({
        text: text.trim(),
        image: imagePreview
    });

    setText("");
    setImagePreview(null);
    caretRef.current = { start: 0, end: 0 };
    setShowEmojiPicker(false);

    if (FileInputRef.current) {
        FileInputRef.current.value = "";
    }
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
            <div className="hama-composer w-full flex items-center justify-center">
                <p className="text-red-400 text-sm flex items-center gap-2">
                    <Shield size={16} />
                    You have blocked this user. Unblock to send messages.
                </p>
            </div>
        );
    }
    
    return (
        <div className={`hama-composer w-full flex flex-col gap-2 ${isMobile ? 'p-2' : 'p-4'}`}>

            {/* Image Preview */}
            {imagePreview && (
                <div className="hama-image-preview relative w-fit">
                    <img
                        src={imagePreview}
                        alt="Preview"
                        className={`object-cover rounded-xl border border-violet-200 ${isMobile ? 'w-14 h-14' : 'w-20 h-20'}`}
                    />
                    <button
                        onClick={RemoveImagePreview}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-violet-700 flex items-center justify-center text-white hover:bg-violet-600"
                        type="button"
                    >
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Input Row */}
            <form
                className='hama-message-form w-full'
                onSubmit={handleSendMessage}
            >
                <input
                    type="file"
                    accept="image/*"
                    ref={FileInputRef}
                    className='hidden'
                    onChange={handleImageChange}
                />

                <button
                    type='button'
                    onClick={() => FileInputRef.current?.click()}
                    className='hama-attach-button'
                    aria-label="Attach an image">
                    <Paperclip size={isMobile ? 19 : 23} />
                </button>

                <input
                    type="text"
                    ref={inputRef}
                    value={text}
                    onChange={handleTextChange}
                    onBlur={stopTyping}
                    placeholder="Type a message..."
                    aria-label="Type a message"
                    onSelect={(event) => {
                        caretRef.current = {
                            start: event.currentTarget.selectionStart ?? text.length,
                            end: event.currentTarget.selectionEnd ?? text.length,
                        };
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Escape') setShowEmojiPicker(false);
                    }}
                    className={`hama-message-field ${isMobile ? 'text-sm' : ''}`}
                />

                <div className="hama-emoji-container" ref={emojiPickerRef}>
                    <button
                        type="button"
                        className="hama-emoji-button"
                        aria-label={showEmojiPicker ? 'Close emoji picker' : 'Open emoji picker'}
                        aria-expanded={showEmojiPicker}
                        onClick={() => {
                            if (inputRef.current) {
                                caretRef.current = {
                                    start: inputRef.current.selectionStart ?? text.length,
                                    end: inputRef.current.selectionEnd ?? text.length,
                                };
                            }
                            setShowEmojiPicker((isOpen) => !isOpen);
                        }}
                    >
                        <Smile size={isMobile ? 19 : 22} />
                    </button>
                    {showEmojiPicker && (
                        <div className="hama-emoji-popover">
                            <Suspense fallback={<div className="hama-emoji-loading">Loading emoji...</div>}>
                                <EmojiPicker
                                    className="hama-emoji-picker"
                                    colorScheme="light"
                                    width={320}
                                    height={360}
                                    previewConfig={{ showPreview: false }}
                                    onEmojiClick={handleEmojiClick}
                                />
                            </Suspense>
                        </div>
                    )}
                </div>

                <button
                    type='submit'
                    disabled={!text.trim() && !imagePreview}
                    className='hama-send-button'
                    aria-label="Send message">
                    <Send size={isMobile ? 18 : 24} />
                </button>
            </form>

        </div>
    )
}

export default MessageInput;