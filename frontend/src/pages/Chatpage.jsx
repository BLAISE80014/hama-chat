import React, { useEffect, useState } from 'react'
import { LogOut, MessageCircleMore, Search, Settings, SquarePen } from 'lucide-react'
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

  useEffect(() => {
    if (!socket) return undefined
    void loadStatuses()
    return subscribeToStatusEvents()
  }, [socket, loadStatuses, subscribeToStatusEvents])

  const conversationList = ActiveTab === 'chats'
    ? <ChatList searchQuery={searchQuery} />
    : <ContactList searchQuery={searchQuery} />

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
          placeholder={ActiveTab === 'chats' ? 'Search conversations...' : 'Search contacts...'}
          aria-label="Search conversations and contacts"
        />
      </label>
      <div className="hama-conversation-list custom-scroll">
        {conversationList}
      </div>
    </section>
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
      <div className={`hama-app-shell ${isTablet ? 'hama-app-shell--tablet' : ''}`}>
        <ReceiverProfileDrawer />
        <aside className="hama-sidebar">
          {!isTablet && (
            <div className="hama-brand">
              <span className="hama-brand-mark"><MessageCircleMore size={24} /></span>
              <span className="hama-brand-copy">
                <strong>Hama Chat</strong>
                <small>Connect · Chat · Share</small>
              </span>
            </div>
          )}
          {isTablet && (
            <div className="hama-brand hama-brand--compact" title="Hama Chat">
              <span className="hama-brand-mark"><MessageCircleMore size={23} /></span>
            </div>
          )}
          <ActiveTabSwitch />
          {!isTablet && (
            <div className="hama-sidebar-nav hama-sidebar-nav--secondary">
              <button
                type="button"
                className="hama-nav-link"
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings size={21} />
                <span>Settings</span>
              </button>
              <button type="button" className="hama-nav-link" onClick={logout}>
                <LogOut size={21} />
                <span>Logout</span>
              </button>
            </div>
          )}
          {isTablet && (
            <div className="hama-sidebar-nav hama-sidebar-nav--secondary hama-sidebar-nav--compact">
              <button
                type="button"
                className="hama-nav-link"
                onClick={() => setIsSettingsOpen(true)}
                title="Settings"
                aria-label="Settings"
              >
                <Settings size={21} />
              </button>
              <button
                type="button"
                className="hama-nav-link"
                onClick={logout}
                title="Logout"
                aria-label="Logout"
              >
                <LogOut size={21} />
              </button>
            </div>
          )}
          <ProfileHeader onOpenSettings={() => setIsSettingsOpen(true)} compact={isTablet} />
        </aside>
        {isFeaturePage ? (
          <main className="hama-feature-workspace">{featurePage}</main>
        ) : (
          <>
            {listPanel}
            <main className="hama-conversation-view">
              {selectedUser ? <ChatContainer /> : <NoChatConversation />}
            </main>
          </>
        )}
      </div>
      <CallOverlay />
      <StatusViewer key={activeViewerUserId || 'closed'} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}

export default Chatpage
