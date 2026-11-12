import React from 'react'
import { MessageCircleMore  } from 'lucide-react'

const NoChatConversation = () => {
  return (
    <div className='h-full w-full rounded-lg shadow-md'>
      <div className='h-full w-full flex items-center justify-center text-white/70'>
        <div className='flex flex-col items-center gap-2'>
          <MessageCircleMore className='w-16 h-16 text-blue-500 bg-blue-500/30 rounded-full p-4' />
          <h1 className='text-2xl font-bold'>No Conversation Selected</h1>
          <p className='text-sm'>Select a conversation to start chatting</p>
        </div>
      </div>  
    </div>
  )
}

export default NoChatConversation