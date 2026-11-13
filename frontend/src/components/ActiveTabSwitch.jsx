import React from 'react'
import { useChatStore } from '../store/useChatStore';
import { CircleDot, Image, MessageCircle, Users } from 'lucide-react';
import useWindowSize from '../hooks/useWindowSize';

const ActiveTabSwitch = () => {
    const { ActiveTab, setActiveTab } = useChatStore();
    const { isTablet } = useWindowSize();

    return (
        <nav className={`hama-sidebar-nav ${isTablet ? 'hama-sidebar-nav--compact' : ''}`} aria-label="Main navigation">
            <button
                type="button"
                onClick={() => setActiveTab('chats')}
                title="Chats"
                aria-current={ActiveTab === 'chats' ? 'page' : undefined}
                className={`hama-nav-link ${ActiveTab === 'chats' ? 'is-active' : ''}`}
            >
                <MessageCircle size={21} />
                <span>Chats</span>
            </button>
            <button
                type="button"
                onClick={() => setActiveTab('contacts')}
                title="Contacts"
                aria-current={ActiveTab === 'contacts' ? 'page' : undefined}
                className={`hama-nav-link ${ActiveTab === 'contacts' ? 'is-active' : ''}`}
            >
                <Users size={21} />
                <span>Contacts</span>
            </button>
            <button
                type="button"
                onClick={() => setActiveTab('media')}
                title="Media"
                aria-current={ActiveTab === 'media' ? 'page' : undefined}
                className={`hama-nav-link ${ActiveTab === 'media' ? 'is-active' : ''}`}
            >
                <Image size={21} />
                <span>Media</span>
            </button>
            <button
                type="button"
                onClick={() => setActiveTab('status')}
                title="Status"
                aria-current={ActiveTab === 'status' ? 'page' : undefined}
                className={`hama-nav-link ${ActiveTab === 'status' ? 'is-active' : ''}`}
            >
                <CircleDot size={21} />
                <span>Status</span>
            </button>
        </nav>
    );
}

export default ActiveTabSwitch