import React from 'react'
import { LoaderIcon, LoaderPinwheel } from 'lucide-react'
import AestheticBackground from '../theme/AestheticBackground'

const PageLoader = () => {
    return (
        <div className='h-[100vh] w-[100vw] flex justify-center items-center overflow-x-hidden'>
            <AestheticBackground />
            <LoaderIcon className='animate-spin text-white' size={36}/>
            {/* <LoaderPinwheel className='animate-spin text-white' /> */}
        </div>
    )
}

export default PageLoader