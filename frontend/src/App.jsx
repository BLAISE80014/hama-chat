import React, { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Chatpage from './pages/Chatpage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import { useAuthStore } from './store/useAuthStore'
import PageLoader from './loader/PageLoader'
import { Toaster } from 'react-hot-toast'
import { useChatStore } from './store/useChatStore'

const App = () => {
  const { checkAuth, authUser, isCheckingAuth ,socket  } = useAuthStore()
  const { unsubscribeFromMessages, subscribeToMessages } = useChatStore()

  useEffect(() => {
    if (!socket) return;
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [socket]);

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (isCheckingAuth) return <PageLoader />

  return (
    <div className='relative h-screen w-screen flex items-center justify-center overflow-hidden'>
      {/* Full-screen background */}


      <Routes>
        <Route
          path='/'
          element={authUser ? <Chatpage /> : <Navigate to="/login" replace />}
        />
        <Route
          path='/login'
          element={authUser ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path='/signup'
          element={authUser ? <Navigate to="/" replace /> : <Signup />}
        />
        {/* Fallback route */}
        <Route path='*' element={<Navigate to="/" replace />} />

        {/* <Route path='/loader' element={<HamaPageLoader/>} /> */}
        {/* 
        <Route path='/follower' element={<MouseFolloower/>} /> */}
      </Routes>

      <Toaster
        position="top-center"
        reverseOrder={false}
      />
    </div>
  )
}

export default App