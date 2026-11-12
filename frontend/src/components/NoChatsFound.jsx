import React from 'react'
import { useChatStore } from '../store/useChatStore';

const NoChatsFound = () => {
    const { ActiveTab , setActiveTab} = useChatStore();
  return (
    <div className='h-full w-full flex flex-col items-center justify-center text-white/70 gap-2'>
        <h2 className='text-lg font-semibold'>No Chats Found</h2>
        <p className='text-sm text-gray-500'>Start a new conversation by clicking on the 'New Chat' button.</p>
        <button
        onClick={() => setActiveTab('contacts')}
         className='mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'>
          New Chat
        </button>
    </div>
  )
}

export default NoChatsFound