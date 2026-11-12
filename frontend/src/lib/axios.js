import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 
  || 'https://hama-chats-1.onrender.com/api';

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 
//   || 'http://localhost:5000/api';

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.MODE === 'development' ? 'http://localhost:5000/api' : '/api')

export const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
})
