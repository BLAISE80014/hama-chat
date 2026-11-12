import React, { useEffect } from 'react'
import UserLoadingSkeleton from './UserLoadingSkeleton'
import NoChatsFound from './NoChatsFound'
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import useWindowSize from '../hooks/useWindowSize';

const ChatList = () => {

  const {selectedUser, getMyChatPartners,subscribeToMessages,unsubscribeFromMessages, chats, setSelectedUser, isUsersLoading, unreadMessages, clearUnread } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const { isTablet } = useWindowSize();

  useEffect(() => {
    getMyChatPartners();
    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [getMyChatPartners])

  if (isUsersLoading) return <UserLoadingSkeleton />

  if (chats.length === 0) return <NoChatsFound />

  // ─── TABLET: avatar-only list ─────────────────────────────────────────────
  if (isTablet) {
    return (
      <div className='w-full h-full flex flex-col items-center gap-2 overflow-y-auto py-1'>
        {[...chats].sort((a, b) => {
          const aVal = unreadMessages[a._id] ? 2 : onlineUsers.includes(a._id) ? 1 : 0;
          const bVal = unreadMessages[b._id] ? 2 : onlineUsers.includes(b._id) ? 1 : 0;
          return bVal - aVal;
        }).map((chat) => (
          <button
            key={chat._id}
            onClick={() => { setSelectedUser(chat); clearUnread(chat._id); }}
            title={chat.fullName}
            className='relative flex-shrink-0'
          >
            <div className={`avatar ${onlineUsers.includes(chat._id) ? 'online' : ''} h-10 w-10 rounded-full`}>
              <img
                src={chat.profilepic || "/avatar.jpg"}
                alt={chat.fullName}
                className='w-10 h-10 rounded-full object-cover'
              />
            </div>
          </button>
        ))}
      </div>
    );
  }

  // ─── MOBILE & DESKTOP: original layout ────────────────────────────────────
  return (
    <div className='w-full h-full p-1 flex flex-col gap-2 overflow-y-auto'>
      {[...chats].sort((a, b) => {
        const aVal = unreadMessages[a._id] ? 2 : onlineUsers.includes(a._id) ? 1 : 0;
        const bVal = unreadMessages[b._id] ? 2 : onlineUsers.includes(b._id) ? 1 : 0;
        return bVal - aVal;
      }).map((chat) => (
        <div
          key={chat._id}
          onClick={() => { setSelectedUser(chat); clearUnread(chat._id); }}
          className={`px-3 py-2 flex gap-2 rounded-lg cursor-pointer transition-all
             ${unreadMessages[chat._id]
              ? 'bg-blue-500/30 hover:bg-blue-500/40 border border-blue-400/40'
              : 'bg-blue-900/20 hover:bg-blue-900/30'}`}
        >
          {chat.profilepic ? (
            <div className={`avatar ${onlineUsers.includes(chat._id) ? 'online' : ''} h-10 w-10 rounded-full`}>
              <img
                src={chat.profilepic}
                alt={chat.fullName}
                className='w-10 h-10 rounded-full object-cover'
              />
            </div>
          ) : (
            <div className={`avatar ${onlineUsers.includes(chat._id) ? 'online' : ''} h-10 w-10 rounded-full`}>
              <img src="/avatar.jpg" alt="" className='object-cover w-full h-full rounded-full' />
            </div>
          )}
          <div className='flex flex-col flex-1'>
            <div className='flex items-center justify-between'>
              <span>
                {chat.fullName.length > 9 ? chat.fullName.slice(0, 6) + "..." : chat.fullName}
              </span>
              {unreadMessages[chat._id] && (
                <span className='w-2.5 h-2.5 rounded-full bg-blue-400'></span>
              )}
            </div>
            <span className={`text-sm ${onlineUsers.includes(chat._id) ? 'text-green-500' : 'text-gray-300/30'}`}>
              {onlineUsers.includes(chat._id) ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ChatList