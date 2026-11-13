import React from 'react'
import { useChatStore } from '../store/useChatStore';
import { MessageCircle, Users } from 'lucide-react';
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
        </nav>
    );
}

export default ActiveTabSwitch