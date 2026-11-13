import React, { useEffect } from 'react'
import { Search } from 'lucide-react'
import UserLoadingSkeleton from './UserLoadingSkeleton'
import { useChatStore } from '../store/useChatStore'
import { useAuthStore } from '../store/useAuthStore'

const ContactList = ({ searchQuery = '' }) => {
  const { allcontacts, selectedUser, setSelectedUser, getAllContacts, isUsersLoading } = useChatStore()
  const { onlineUsers } = useAuthStore()
  const onlineIds = new Set(onlineUsers.map(String))
  const query = searchQuery.trim().toLocaleLowerCase()
  const visibleContacts = allcontacts.filter((contact) =>
    contact.fullName?.toLocaleLowerCase().includes(query)
  )

  useEffect(() => {
    getAllContacts()
  }, [getAllContacts])

  if (isUsersLoading) return <UserLoadingSkeleton />
  if (!visibleContacts.length) {
    return (
      <div className="hama-empty-list">
        <span className="hama-empty-conversation-icon"><Search size={25} /></span>
        <strong>No contacts found</strong>
        <span>Try another name.</span>
      </div>
    )
  }

  return (
    <div className="hama-chat-list">
      {visibleContacts.map((contact) => {
        const contactId = String(contact._id)
        const isSelected = contactId === String(selectedUser?._id)
        return (
          <button
            type="button"
            key={contact._id}
            onClick={() => setSelectedUser(contact)}
            className={`hama-chat-row ${isSelected ? 'is-selected' : ''}`}
            aria-current={isSelected ? 'true' : undefined}
          >
            <span className="hama-list-avatar">
              <img src={contact.profilepic || '/avatar.jpg'} alt="" />
              {onlineIds.has(contactId) && <i className="hama-online-dot" />}
            </span>
            <span className="hama-chat-row-body">
              <span className="hama-chat-row-top">
                <strong>{contact.fullName}</strong>
              </span>
              <span className="hama-chat-row-bottom">
                <span className="hama-chat-preview">
                  {onlineIds.has(contactId) ? 'Online now' : 'Start a conversation'}
                </span>
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default ContactList
