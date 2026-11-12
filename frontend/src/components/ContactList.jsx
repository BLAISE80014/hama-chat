import React, { useEffect } from 'react'
import UserLoadingSkeleton from './UserLoadingSkeleton';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import useWindowSize from '../hooks/useWindowSize';

const ContactList = () => {
  const { allcontacts, setSelectedUser, getAllContacts, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const { isTablet } = useWindowSize();

  useEffect(() => {
    getAllContacts();
  }, [getAllContacts])

  if (isUsersLoading) return <UserLoadingSkeleton />

  // ─── TABLET: avatar-only list ─────────────────────────────────────────────
  if (isTablet) {
    return (
      <div className='w-full h-full flex flex-col items-center gap-2 overflow-y-auto py-1'>
        {[...allcontacts].reverse().sort((a, b) => {
          const aOnline = onlineUsers.includes(a._id) ? 1 : 0;
          const bOnline = onlineUsers.includes(b._id) ? 1 : 0;
          return bOnline - aOnline;
        }).map((contact) => (
          <button
            key={contact._id}
            onClick={() => setSelectedUser(contact)}
            title={contact.fullName}
            className='relative flex-shrink-0'
          >
            <div className={`avatar ${onlineUsers.includes(contact._id) ? 'online' : ''} h-10 w-10 rounded-full`}>
              <img
                src={contact.profilepic || "/avatar.jpg"}
                alt={contact.fullName}
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
    <div className='h-full w-full flex gap-3 text-white/70 flex-col'>
      {[...allcontacts].reverse().sort((a, b) => {
        const aOnline = onlineUsers.includes(a._id) ? 1 : 0;
        const bOnline = onlineUsers.includes(b._id) ? 1 : 0;
        return bOnline - aOnline;
      }).map((contact) => (
        <div
          key={contact._id}
          className='px-3 py-2 flex gap-2 rounded-lg bg-blue-900/20 hover:bg-blue-900/30 cursor-pointer'
          onClick={() => setSelectedUser(contact)}
        >
          {contact.profilepic ? (
            <div className={`avatar ${onlineUsers.includes(contact._id) ? 'online' : ''} h-10 w-10 rounded-full`}>
              <img
                src={contact.profilepic}
                alt={contact.fullName}
                className='w-10 h-10 rounded-full object-cover'
              />
            </div>
          ) : (
            <div className={`avatar ${onlineUsers.includes(contact._id) ? 'online' : ''} w-10 h-10 rounded-full bg-gray-300`}>
              <img src="/avatar.jpg" alt="" className='object-cover w-full h-full rounded-full' />
            </div>
          )}
          <div className='flex flex-col'>
            <span>
              {contact.fullName.length > 9
                ? contact.fullName.slice(0, 6) + "..."
                : contact.fullName}
            </span>
            <span className={`text-sm ${onlineUsers.includes(contact._id) ? 'text-green-500' : 'text-gray-300/30'}`}>{onlineUsers.includes(contact._id) ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ContactList