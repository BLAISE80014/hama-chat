import React, { useState } from 'react'

const MouseFolloower = () => {

    const [position, setPosition] = useState({ x: 0, y: 0 })

    const handleMouseMove = (e) => {
        setPosition({
            x: e.clientX,
            y: e.clientY
        })
    }

    return (
        <div 
            className='h-screen w-screen bg-slate-800 relative'
            onMouseMove={handleMouseMove}
        >
            <div 
                className='h-5 w-5 border-2 border-white rounded-full absolute transition-all duration-300 ease-out pointer-events-none'
                style={{
                    top: position.y,
                    left: position.x,
                    transform: "translate(-50%, -50%)"
                }}
            >
            </div>
                <div className='h-3 w-3 bg-black rounded-full absolute transition-all duration-500 ease-out pointer-events-none' 
                style={{
                    top: position.y,
                    left: position.x,
                    transform: "translate(-50%, -50%)"
                }}></div>
        </div>
    )
}

export default MouseFolloower