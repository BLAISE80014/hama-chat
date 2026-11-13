import React, { useEffect, useState } from 'react'
import { ChevronRight, Crown, LogOut, MessageCircleMore, Search, Settings, SquarePen } from 'lucide-react'
import { useChatStore } from '../store/useChatStore'
import { useAuthStore } from '../store/useAuthStore'
import ProfileHeader from '../components/ProfileHeader'
import ActiveTabSwitch from '../components/ActiveTabSwitch'
import ChatList from '../components/ChatList'
import ContactList from '../components/ContactList'
import ChatContainer from '../components/ChatContainer'
import NoChatConversation from '../components/NoChatConversation'
import useWindowSize from '../hooks/useWindowSize'
import ReceiverProfileDrawer from '../components/ReceiverProfileDrawer'
import SettingsModal from '../components/SettingsModal'
import CallOverlay from '../components/CallOverlay'
import MediaLibrary from '../components/MediaLibrary'
import StatusPage from '../components/StatusPage'
import StatusViewer from '../components/StatusViewer'
import { useStatusStore } from '../store/useStatusStore'

const Chatpage = () => {
  const { ActiveTab, selectedUser, setActiveTab } = useChatStore()
  const { logout, socket } = useAuthStore()
  const { isMobile, isTablet } = useWindowSize()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const loadStatuses = useStatusStore((state) => state.loadStatuses)
  const subscribeToStatusEvents = useStatusStore((state) => state.subscribeToStatusEvents)
  const activeViewerUserId = useStatusStore((state) => state.activeViewerUserId)
  const isFeaturePage = ActiveTab === 'media' || ActiveTab === 'status'
  const featurePage = ActiveTab === 'media' ? <MediaLibrary /> : <StatusPage />
  const showDockedProfile = Boolean(
    selectedUser &&
    !isFeaturePage &&
    !isTablet
  )

  useEffect(() => {
    if (!socket) return undefined
    void loadStatuses()
    return subscribeToStatusEvents()
  }, [socket, loadStatuses, subscribeToStatusEvents])

  const conversationList = ActiveTab === 'contacts'
    ? <ContactList searchQuery={searchQuery} />
    : <ChatList searchQuery={searchQuery} />

  const listPanel = (
    <section className="hama-conversations">
      <header className="hama-list-heading">
        <h1>{ActiveTab === 'chats' ? 'Chats' : 'Contacts'}</h1>
        <button
          type="button"
          className="hama-new-chat"
          onClick={() => setActiveTab('contacts')}
          aria-label="Start a new chat"
          title="New chat"
        >
          <SquarePen size={19} />
        </button>
      </header>
      <label className="hama-search">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={ActiveTab === 'contacts' ? 'Search contacts...' : 'Search conversations...'}
          aria-label="Search conversations and contacts"
        />
      </label>
      <div className="hama-conversation-list custom-scroll">
        {conversationList}
      </div>
    </section>
  )

  const desktopSidebar = (
    <aside className="hama-left-panel">
      <header className="hama-left-brand-row">
        <div className="hama-brand">
          <span className="hama-brand-mark"><MessageCircleMore size={25} /></span>
          <span className="hama-brand-copy">
            <strong>Hama Chat</strong>
            <small>Chat · Connect · Share</small>
          </span>
        </div>
        <button
          type="button"
          className="hama-new-chat"
          onClick={() => setActiveTab('contacts')}
          aria-label="Start a new chat"
          title="Start a new chat"
        >
          <SquarePen size={17} />
        </button>
      </header>

      <label className="hama-search">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={ActiveTab === 'contacts' ? 'Search contacts...' : 'Search conversations...'}
          aria-label="Search conversations and contacts"
        />
      </label>

      <div className="hama-conversation-list custom-scroll">
        {conversationList}
      </div>

      <div className="hama-left-footer">
        <div className="hama-premium-banner" aria-label="Hama Chat Premium">
          <span className="hama-premium-crown"><Crown size={24} fill="currentColor" /></span>
          <span>
            <strong>Hama Chat Premium</strong>
            <small>Chat better, together!</small>
          </span>
          <ChevronRight size={20} aria-hidden="true" />
        </div>

        <div className="hama-left-account-actions">
          <ProfileHeader onOpenSettings={() => setIsSettingsOpen(true)} />
          <button type="button" onClick={logout} aria-label="Log out" title="Log out">
            <LogOut size={18} />
          </button>
        </div>

        <div className="hama-bottom-navigation">
          <ActiveTabSwitch />
          <button
            type="button"
            className="hama-bottom-nav-settings"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </aside>
  )

  if (isMobile) {
    return (
      <div className="hama-page hama-mobile-page">
        <ReceiverProfileDrawer />
        {selectedUser && !isFeaturePage ? (
          <div className="hama-mobile-chat">
            <ChatContainer />
          </div>
        ) : (
          <div className="hama-mobile-shell">
            <header className="hama-mobile-top">
              <div className="hama-brand">
                <span className="hama-brand-mark"><MessageCircleMore size={23} /></span>
                <span className="hama-brand-copy">
                  <strong>Hama Chat</strong>
                  <small>Connect · Chat · Share</small>
                </span>
              </div>
              <div className="hama-mobile-account-actions">
                <button type="button" onClick={() => setIsSettingsOpen(true)} aria-label="Settings">
                  <Settings size={19} />
                </button>
                <button type="button" onClick={logout} aria-label="Log out">
                  <LogOut size={19} />
                </button>
              </div>
            </header>
            <ProfileHeader onOpenSettings={() => setIsSettingsOpen(true)} />
            <ActiveTabSwitch />
            {isFeaturePage
              ? <div className="hama-mobile-feature">{featurePage}</div>
              : listPanel}
          </div>
        )}
        <CallOverlay />
        <StatusViewer key={activeViewerUserId || 'closed'} />
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    )
  }

  return (
    <div className={`hama-page ${isTablet ? 'hama-page--tablet' : ''}`}>
      <div className={`hama-app-shell ${isTablet ? 'hama-app-shell--tablet' : ''} ${showDockedProfile ? 'has-contact-profile' : ''}`}>
        {desktopSidebar}
        {isFeaturePage ? (
          <main className="hama-feature-workspace">{featurePage}</main>
        ) : (
          <main className="hama-conversation-view">
            {selectedUser ? <ChatContainer /> : <NoChatConversation />}
          </main>
        )}
        {showDockedProfile && (
          <ReceiverProfileDrawer docked />
        )}
      </div>
      {isTablet && <ReceiverProfileDrawer />}
      <CallOverlay />
      <StatusViewer key={activeViewerUserId || 'closed'} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}

export default Chatpage
