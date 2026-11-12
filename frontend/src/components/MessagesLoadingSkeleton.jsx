import React from 'react'

const MessagesLoadingSkeleton = () => {
    return (
        <div className='p-4 flex flex-col gap-2 animate-pulse h-[calc(100%-4rem)]'>
            {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className={`chat ${index % 2 === 0 ? "chat-start" : "chat-end"}`}>
                    <div className={`chat-bubble ${index % 2 === 0 ? "bg-gray-500/20" : "bg-blue-500/20"} h-12 w-48 rounded-lg`}></div>
                </div>
            ))}
        </div>
    )
}

export default MessagesLoadingSkeleton