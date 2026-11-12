//import form Libraries 
import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser'
import cors from 'cors';

//import form Files
import authRoute from './routes/auth.route.js'
import messageRoute from './routes/message.route.js'
import { connectDB } from './lib/db.js';
import { ENV } from './lib/env.js';
import { app, server } from './lib/socket.js';
dotenv.config();

const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  ENV.CLIENT_URL,          // from .env
  'http://localhost:5173',   // your local frontend (Vite)
  'http://localhost:3000',   // or CRA
  'https://hama-chats.vercel.app'  // your deployed frontend URL
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,  // if you're using cookies/sessions
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({"limit":"5MB"})) // allow inputs to connect with backend , req.body;
app.use(cookieParser())

//Creating APIs 

app.use("/api/auth", authRoute)
app.use("/api/messages", messageRoute)


const startServer = async () => {
    await connectDB();
    server.listen(PORT, () => {
        console.log(`Server is Running on Port ${PORT}`);
    });
};

startServer();