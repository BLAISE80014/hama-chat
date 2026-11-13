import React from 'react'
import { useChatStore } from '../store/useChatStore';

const NoChatsFound = () => {
    const { setActiveTab } = useChatStore();
  return (
    <div className='hama-empty-list h-full w-full flex flex-col items-center justify-center gap-2'>
        <h2 className='text-lg font-semibold'>No Chats Found</h2>
        <p className='text-sm'>Start a new conversation by clicking on the &apos;New Chat&apos; button.</p>
        <button
        onClick={() => setActiveTab('contacts')}
         className='hama-empty-action mt-4 px-4 py-2 text-white rounded-lg transition-colors'>
          New Chat
        </button>
    </div>
  )
}

export default NoChatsFound