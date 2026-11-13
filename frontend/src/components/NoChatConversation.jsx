import React from 'react'
import { MessageCircleMore  } from 'lucide-react'

const NoChatConversation = () => {
  return (
    <div className='hama-empty-conversation'>
        <div>
          <span className="hama-empty-conversation-icon"><MessageCircleMore size={34} /></span>
          <h1>No Conversation Selected</h1>
          <p>Select a conversation to start chatting</p>
        </div>
    </div>
  )
}

export default NoChatConversation