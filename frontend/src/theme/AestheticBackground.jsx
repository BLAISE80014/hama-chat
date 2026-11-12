import React, { useEffect } from 'react'
import { toast } from 'react-hot-toast'

const AestheticBackground = () => {

    return (
        <div className='overflow-hidden'>
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-900/40 blur-[80px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-900/40 blur-[80px] rounded-full" />
        </div>
    )
}

export default AestheticBackground