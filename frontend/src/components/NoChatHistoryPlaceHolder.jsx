import { MessageCircleIcon } from 'lucide-react';
import React from 'react'

const NoChatHistoryPlaceHolder = ({ name }) => {
    return (
        <div className="hama-empty-history flex flex-col items-center justify-center h-full text-center p-6">
            <div className="hama-empty-history-icon">
                <MessageCircleIcon className="size-8" />
            </div>
            <h3 className="text-lg font-medium mb-3">
                Start your conversation with {name}
            </h3>
            <div className="flex flex-col space-y-3 max-w-md mb-5">
                <p className="text-sm">
                    This is the beginning of your conversation. Send a message to start chatting!
                </p>
                <div className="h-px w-32 bg-gradient-to-r from-transparent via-violet-500/30 to-transparent mx-auto"></div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
                <button className="hama-suggested-prompt px-4 py-2 text-xs font-medium rounded-full transition-colors">
                    👋 Say Hello
                </button>
                <button className="hama-suggested-prompt px-4 py-2 text-xs font-medium rounded-full transition-colors">
                    🤝 How are you?
                </button>
                <button className="hama-suggested-prompt px-4 py-2 text-xs font-medium rounded-full transition-colors">
                    📅 Meet up soon?
                </button>
            </div>
        </div>
    );
};


export default NoChatHistoryPlaceHolder