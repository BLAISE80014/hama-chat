import React from 'react'

const UserLoadingSkeleton = () => {
    return (
        <div className='w-full h-56 flex flex-col items-center gap-6 mt-3 animate-pulse'>
            {[1, 2, 3,4].map((item) => (
                <div key={item} className='w-full h-14 rounded-lg flex items-center gap-4 px-4'>
                    <div className='h-10 w-10 bg-white/10 rounded-full'></div>
                    <div className='flex-1 flex flex-col gap-2'>
                        <div className='h-4 w-1/10 bg-white/10 rounded'></div>
                        <div className='h-3 w-1/2 bg-white/10 rounded'></div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default UserLoadingSkeleton