import React, { useEffect } from 'react'
import { CheckCheck } from 'lucide-react'
import UserLoadingSkeleton from './UserLoadingSkeleton'
import NoChatsFound from './NoChatsFound'
import { useChatStore } from '../store/useChatStore'
import { useAuthStore } from '../store/useAuthStore'

const formatMessageTime = (date) => {
  if (!date) return ''
  const messageDate = new Date(date)
  const today = new Date()
  if (messageDate.toDateString() === today.toDateString()) {
    return messageDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const ChatList = ({ searchQuery = '' }) => {
  const {
    selectedUser,
    getMyChatPartners,
    chats,
    messages,
    setSelectedUser,
    isUsersLoading,
    unreadMessages,
    clearUnread,
  } = useChatStore()
  const { onlineUsers, authUser } = useAuthStore()
  const onlineIds = new Set(onlineUsers.map(String))
  const query = searchQuery.trim().toLocaleLowerCase()
  const visibleChats = chats.filter((chat) =>
    chat.fullName?.toLocaleLowerCase().includes(query)
  )

  useEffect(() => {
    getMyChatPartners()
  }, [getMyChatPartners])

  if (isUsersLoading) return <UserLoadingSkeleton />
  if (!visibleChats.length) return <NoChatsFound />

  return (
    <div className="hama-chat-list">
      {visibleChats.map((chat) => {
        const chatId = String(chat._id)
        const isSelected = chatId === String(selectedUser?._id)
        const isOnline = onlineIds.has(chatId)
        const lastMessage = isSelected ? messages.at(-1) : null
        const preview = lastMessage
          ? lastMessage.isDeleted
            ? 'Message deleted'
            : lastMessage.text || (lastMessage.image ? 'Photo' : '')
          : 'No messages yet'
        const sentByMe = lastMessage &&
          String(lastMessage.Sender) === String(authUser?._id)

        return (
          <button
            type="button"
            key={chat._id}
            onClick={() => {
              setSelectedUser(chat)
              clearUnread(chat._id)
            }}
            className={`hama-chat-row ${isSelected ? 'is-selected' : ''}`}
            aria-current={isSelected ? 'true' : undefined}
          >
            <span className="hama-list-avatar">
              <img src={chat.profilepic || '/avatar.jpg'} alt="" />
              {isOnline && <i className="hama-online-dot" />}
            </span>
            <span className="hama-chat-row-body">
              <span className="hama-chat-row-top">
                <strong>{chat.fullName}</strong>
                <span className="hama-chat-time">
                  {lastMessage ? formatMessageTime(lastMessage.createdAt) : ''}
                </span>
              </span>
              <span className="hama-chat-row-bottom">
                <span className="hama-chat-preview">{preview}</span>
                <span className="hama-chat-row-meta">
                  {sentByMe && lastMessage.seen && (
                    <CheckCheck size={15} className="hama-list-seen" aria-label="Seen" />
                  )}
                  {unreadMessages[chat._id] && (
                    <i className="hama-unread-dot" aria-label="Unread message" />
                  )}
                </span>
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default ChatList
