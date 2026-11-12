import React from 'react'
import AestheticBackground from '../theme/AestheticBackground'
import { useChatStore } from '../store/useChatStore'
import ProfileHeader from '../components/ProfileHeader';
import ActiveTabSwitch from '../components/ActiveTabSwitch';
import ChatList from '../components/ChatList';
import ContactList from '../components/ContactList';
import ChatContainer from '../components/ChatContainer';
import NoChatConversation from '../components/NoChatConversation';
import useWindowSize from '../hooks/useWindowSize';
import ReceiverProfileDrawer from '../components/ReceiverProfileDrawer';

const Chatpage = () => {

  const { ActiveTab, selectedUser } = useChatStore();
  const { isMobile, isTablet } = useWindowSize();

  // ─── MOBILE (<768px) ──────────────────────────────────────────────────────
  // Show sidebar OR chat fullscreen — never both
  if (isMobile) {
    return (
      <div className='h-screen w-screen flex items-center justify-center font-sans overflow-hidden'>
        <AestheticBackground />
        <div className='h-screen w-screen bg-white/[0.01] backdrop-blur-3xl flex overflow-hidden z-10'>
          <ReceiverProfileDrawer />
          {selectedUser ? (
            <div className='w-full h-full'>
              <ChatContainer />
            </div>
          ) : (
            <div className='w-full h-full flex flex-col p-3 gap-3'>
              <ProfileHeader />
              <ActiveTabSwitch />
              <div className='flex-1 overflow-y-auto'>
                {ActiveTab === 'chats' ? <ChatList /> : <ContactList />}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── TABLET (768px–1023px) ────────────────────────────────────────────────
  // Narrow icon-only sidebar + chat area side by side
  if (isTablet) {
    return (
      <div className='h-screen w-screen flex items-center justify-center font-sans overflow-hidden'>
        <AestheticBackground />
        <div className='h-screen w-screen bg-white/[0.01] backdrop-blur-3xl border border-white/10 flex overflow-hidden z-10'>
          <ReceiverProfileDrawer />
          {/* Narrow Sidebar */}
          <div className='w-16 h-full border-r border-white/10 flex flex-col items-center py-3 gap-4 overflow-hidden'>
            <ProfileHeader />
            <ActiveTabSwitch />
            <div className='flex-1 w-full overflow-y-auto'>
              {ActiveTab === 'chats' ? <ChatList /> : <ContactList />}
            </div>
          </div>

          {/* Chat Area */}
          <div className='flex-1 h-full overflow-hidden'>
            {selectedUser ? <ChatContainer /> : <NoChatConversation />}
          </div>

        </div>
      </div>
    );
  }

  // ─── DESKTOP (≥1024px) — ORIGINAL CODE, UNTOUCHED ─────────────────────────
  return (
    <div className='h-screen w-screen flex items-center justify-center font-sans overflow-hidden'>
      <AestheticBackground />
      <div className='h-[90vh] w-[65vw] max-w-7xl bg-white/[0.01] backdrop-blur-3xl border border-white/10 rounded-lg flex overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] z-10'>
      <ReceiverProfileDrawer />
        <div className='w-1/4 border-r border-white/10'>
          {/* Sidebar */}
          <div className='h-full w-full flex flex-col items-center justify-start gap-4 p-4'>
            {/* User Details */}
            <ProfileHeader />

            {/* Chat List Or Contact List */}
            <ActiveTabSwitch />

            <div className='h-full w-full overflow-y-auto'>
              {ActiveTab === 'chats' ? (<ChatList />) : (<ContactList />)}
            </div>
          </div>
        </div>
        {/* Right Side */}
        <div className='w-3/4 h-full overflow-hidden'>
          {selectedUser ? (<ChatContainer />) : (<NoChatConversation />)}
        </div>
      </div>
    </div>
  );
}

export default Chatpage