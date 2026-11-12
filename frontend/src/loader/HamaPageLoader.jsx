import React from 'react'
import AestheticBackground from '../theme/AestheticBackground'
const HamaPageLoader = () => {
    
    const MouseFollower = (e)=>{
        const X = e.clientX
        const Y = e.clientY
    }

  return (
        <div className='h-screen w-screen'
        onMouseMove={(e) => { MouseFollower(e)}} 
        >
        <AestheticBackground />
        <div
        className= {`h-10 w-10 bg-white rounded-full absolute top-${Y} left-${X}`}>
        </div>
    </div>
  )
}

export default HamaPageLoader