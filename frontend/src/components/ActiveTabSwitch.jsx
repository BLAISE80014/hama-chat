import React from 'react'
import { useChatStore } from '../store/useChatStore';
import { MessageCircle, Users } from 'lucide-react';
import useWindowSize from '../hooks/useWindowSize';

const ActiveTabSwitch = () => {
    const { ActiveTab, setActiveTab } = useChatStore();
    const { isTablet } = useWindowSize();

    // ─── TABLET: icon-only buttons stacked vertically ─────────────────────────
    if (isTablet) {
        return (
            <div className='w-full flex flex-col items-center gap-2 border-b pb-2 border-white/10'>
                <button
                    onClick={() => setActiveTab('chats')}
                    title="Chats"
                    className={`p-2 rounded-lg ${ActiveTab === 'chats' ? 'bg-blue-500 text-black' : 'text-white/70 hover:text-white/100'}`}>
                    <MessageCircle size={18} />
                </button>
                <button
                    onClick={() => setActiveTab('contacts')}
                    title="Contacts"
                    className={`p-2 rounded-lg ${ActiveTab === 'contacts' ? 'bg-purple-500 text-black' : 'text-white/70 hover:text-white/100'}`}>
                    <Users size={18} />
                </button>
            </div>
        );
    }

    // ─── MOBILE & DESKTOP: original text buttons ──────────────────────────────
    return (
        <div className='w-full h-10 flex items-center justify-around border-b pb-2 border-white/10'>
            <button onClick={() => setActiveTab('chats')}
                className={`py-1 px-4 rounded-lg ${ActiveTab === 'chats' ? 'bg-blue-500 text-black' : 'text-white/70 hover:text-white/100'}`}>Chats</button>
            <button onClick={() => setActiveTab('contacts')}
                className={`py-1 px-4 rounded-lg ${ActiveTab === 'contacts' ? 'bg-purple-500 text-black' : 'text-white/70 hover:text-white/100'}`}>Contacts</button>
        </div>
    );
}

export default ActiveTabSwitch