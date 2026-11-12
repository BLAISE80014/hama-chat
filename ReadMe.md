
# Project Title 
## HAMA Chats ( Real-Time chat App )

This Application use for Sending & Recieving the Messages to the one user to 2nd user ; 


## Create Two Folders

[Backend](https://linktodocumentation)

[Frontend](https://linktodocumentation)


## Frontend Setup 

We Use Vite for Frontend 

```bash
  npm i vite
```

## Backend Setup 

We use Multiple Packages for Backend. Run Commands one by one

Create Package.json file

```bash
  npm init -y
```

```bash
   npm i express@4.21.2 cookie-parser cloudinary
```
```bash
   npm i mongoose@8.10.1 jsonwebtoken@9.0.2 bcryptjs@2.4.3
```
```bash
npm i nodemon -D 
```

## create the Server.js File in the Backend

```javascript
import express from 'express'
const Port = 3000
const app = express();

app.listen(Port, () => {
    console.log("Server is Running on Port 3000");

})
```

Create The Server and Start it.

## Running Tests

To run tests, run the following command

```base
nodemon Server.js
```
## Create Api 
```javascript
app.get("/api/auth/signup",(req, res)=>{
    res.send("Sign Up Page");
})

app.get("/api/auth/login",(req , res)=>{
    res.send("Login Page");
});

app.get("/api/auth/logout",(req , res)=>{
    res.send("Logout Page");
})
```


## Create src folder and cut and paste the server.js file inside
the src folder.

```javascript
src__
         |-server.js
```

## Create .env file in the backend

```javascript
backend__
                  |- node_modules
                  |- src
                  |- .env
                  |- package-lock.json
                  |- package.json
```

and Keep this code 
```javascript
PORT = 3000
MONGO_URI = my_db_connection_URL;

NODE_ENV = development;
```

use the PORT and others like
```javascript
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const Port = process.env.PORT;

```

## Create Two Folder 

contollers
routes 

create the auth.route.js file for managing the all out apis

```javascript
import express from "express"

const router = express.Router()

router.get("/signup",(req, res)=>{
    res.send("Sign Up Page");
})

router.get("/login",(req , res)=>{
    res.send("Login Page");
});

router.get("/logout",(req , res)=>{
    res.send("Logout Page");
})

export default router;
```

and Change the Server.js file code 

import the authRoute from auth.route.js file

```javascript
import authRoute from './routes/auth.route.js'

app.use("/api/auth", authRoute)
```


same as Create message.route.js file inside the routes file and put code 

```javascript
import express from "express";

const router = express.Router();

router.get('/send',(req, res)=>{
    res.send("Send Message Endpoint");
})
router.get('/receive',(req, res)=>{
    res.send("Send Message Endpoint");
})

export default router;
```

## Create Repository and Push Your Code
Use following this code 
```base
git init
git add .
git commit -m "fisrt commit"
git remote add origin git_hub_repo_link
git branch -M main
git push -u origin main
```

## Create Database and Setup It 
 I use Mongo DB Atlas and I setUp it 
 Just Copy and paste the URL of the Mongo DB Url in .env file

 Sorry i can not explain the Setup 

## Now Create the Lib Folder is called Library Folder -

Create db.js file for the connection of the Database -

Follow the code-
 ```javascript
 import mongoose from 'mongoose'

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log("MONGO Database is Connected",conn.connection.host);
    } catch (error) {
        console.error("Database Connection failed",error);
        process.exit(1); // 1 code is means that Fails , 0 means Sucess
    }
}
```

import the function in Server.js file and call it in app.listen;
like this - 
```javascript
import { connectDB } from './lib/db.js';

app.listen(Port, () => {
    console.log(`Server is Running on Port ${Port}`);
    connectDB()
})
```

## let's implement the Authentication

Make controllers folder and create a File name as auth.contorller.js for 

start from Signup Controller

Create Model Folder and create A file named as User.js 
and keep this code 
```javascript
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    profilepic: {
        type: String,
        default: "",
    }
}, { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
```

# In Controller file we add write and export code of Signup , login , logout 
Keep Follow this code 

```javascript
export const signup = async (req, res) => {
    const { email, fullName, password } = req.body;

    try {

        if (!email || !fullName || !password) {
            return res.status(400).json({ message: "All Fields are Required" })
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password is Too Small" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Invalid Email Format" })
        }

        const user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: "Email Already Exists" })

        const salt = await bcrypt.genSalt(10);
        const HashPassword = await bcrypt.hash(password, salt)

        const newUser = new User({
            fullName,
            email,
            password: HashPassword
        })

        if (newUser) {
            await newUser.save();
            await generateToken(newUser._id, res);

            return res.status(201).json({
                _id: newUser._id,
                email: newUser.email,
                fullName: newUser.fullName,
                profilepic: newUser.profilepic
            });
        } else {
            res.status(400).json({ message: "Invalid User Data" })
        }

    } catch (error) {
        console.error("Error in Sign Up Controller", error);
        return res.status(500).json({ message: "Internal Server Error" })
    }
}
export const login = async (req, res) => {
    const { email, password } = req.body;
    try {

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const isPasswordCorrect = await bcrypt.compare(password, user.password)
        if (!isPasswordCorrect) return res.status(400).json({ message: "Invalid credentials" })

        await generateToken(user._id, res)
        res.status(200).json({
            _id: user._id,
            email: user.email,
            fullName: user.fullName,
            profilepic: user.profilepic,
        })

    } catch (error) {
        console.error("Something Gonna Wrong", error);
        return res.status(500).json({ message: "Internal Server Error" })
    }
}
export const logout = async (_, res) => {
    res.cookie("jwt", "", { maxAge: 0 })
    res.status(200).json({ message: "Logout Successfully" })
}
```

Here , Your Authentication have completed;


# Now create Middleware for Updateing the Information from Database 

```base
Why ?? we Create Middleware
Ans = Middleware is a like a Bodygaurd if you have Token then you can change sensitive information like name , email , profilepic and much more;
```
So we want to upload and remove profile pic , this is sensitive information that's why we create middleware.

# Follow these Steps
- Create Folder Named as Middleware
- Create file Named as auth.middleware.js 
- keep this code in auth.middleware.js
```javascript
import jwt from "jsonwebtoken"

import User from "../models/User.js";
import { ENV } from "../lib/env.js";

export const protectRoute = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;
        if (!token) return res.status(401).json({ message: "No Token Provided" });

        const decoded = jwt.verify(token, ENV.JWT_SECRET)
        if (!decoded) return res.status(401).json({ message: "Unuthorize _ Invalid Token" })

        const user = await User.findById(decoded.userId).select("-password")
        if (!user) return res.status(401).json({ message: "User Not Found" })

        req.user = user;
        next()
    } catch (error) {
        console.error("Error in protective middleware",error);
        res.status(500).json({message:"Internal Server Error"})
    }

}
```

and Add in Routes like this

```javascript

router.put('/update-profile', protectRoute, updateProfile);

router.get('/check', protectRoute, (req, res) => { res.status(200).json(req.user) })
```

Export And Import ProtectRoute

# Now , in auth.contorller.js file , We Write code for updateProfile
keep this code 

```javascript
export const updateProfile = async (req, res , next) => {
    try {
        const {profilepic} = req.body;

        if(!profilepic) return res.status(400).json({message:"Profile pic is required"})

        const userId = req.userId;
        const uploadResponce = await cloudinary.uploader.upload(profilepic);

        const updateUser = await User.findByIdAndUpate(
            userId,
            {profilepic:uploadResponce.secure_url},
            {new:true}
        )

        res.status(200).json({updateUser})
    } catch (error) {
        console.log("Error In update Profile",error);
        res.status(500).json({message:"Internal server error"})
    }
}
```
In This code We Write about Cloudinary 
#### What is Cloudinary ??
#### And - Cloudinary is a Tool which is use to store the images and video and it generate a link , we save this link in our database and use the link in the frontend to show the our image

## Before Using this code follow this 
- open lib folder 
- Create a File named as Cloudinary.js 

Keep this code

```javascript
import { v2 as cloudinary } from "cloudinary"
import { ENV } from "./env.js"

cloudinary.config({
    cloud_name:ENV.CLOUDINARY_CLOUD_NAME,
    api_key:ENV.CLOUDINARY_API_KEY,
    api_secret:ENV.CLOUDINARY_API_SECRET,
})

export default cloudinary;
```

```base
npm i @arcjet/node@1.0.0-beta.10 @arcjet/inspect@1.0.0-beta.10
```

## Message Endpoint Start From Here;
We havw to do 3 things 

1. Create Api in the server.js file

```javascript
app.use('/api/messages',messageRoutes)
```

2. Craete the Message.route.js file inside routes folder
```javascript
import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getAllContact ,getMessagesByUserId ,sendMessage ,getChatsPartners} from '../controllers/message.controller.js'

const router = express.Router();

router.get('/contacts', protectRoute, getAllContact)
router.get('/chats',protectRoute,getChatsPartners)
router.get('/:id',protectRoute , getMessagesByUserId)
router.post('/send/:id' ,protectRoute,sendMessage)

export default router;
```
3. Create the message.controller.js file inside the controller folders 

```javascript
import Message from "../models/Message.js"
import User from '../models/User.js'

import cloudinary from "../lib/cloudinary.js";

export const getAllContact = async (req, res) => {
    try {
        const loggedUser = req.user._id;

        const FilterUser = await User.find({ _id: { $ne: loggedUser } }).select("-password")

        res.status(200).json(FilterUser)
    } catch (error) {
        console.error("Error in getAllContact ", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export const getMessagesByUserId = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: usertochat } = req.params;

        const allmessages = await Message.find({
            $or: [
                { Sender: myId, Reciever: usertochat },
                { Sender: usertochat, Reciever: myId }
            ]
        })

        res.status(200).json(allmessages)
    } catch (error) {
        console.error("Error in getMessagesByUserId", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const { id: Reciever } = req.params;
        const Sender = req.user._id;

        let imageUrl;
        if (image) {
            const uploadResponce = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponce.secure_url;
        }

        const newMessage = new Message({
            Sender,
            Reciever,
            text,
            imageUrl,
        })

        await newMessage.save();
        //  Todo - adding the socket io
        res.status(201).json(newMessage)
    } catch (error) {
        console.error("Error in sendMessage", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

export const getChatsPartners = async (req, res) => {
    try {
        const loggedUserId = req.user._id;

        //find al the messages from data base either sender or receiver

        const messages = await Message.find({
            $or: [{ Sender: loggedUserId }, { Reciever: loggedUserId }]
        });

        const chatPartnerIds = [
            ...new Set(
                messages.map((msg) => 
                    msg.Sender.toString() === loggedUserId.toString() ?
                        msg.Reciever.toString() : msg.Sender.toString()
                )
            )
        ]

        const chatPartners = await User.find({ _id: { $in: chatPartnerIds } }).select("-password")
        
        res.status(200).json(chatPartners)
    } catch (error) {
        console.error("Error in getChatsPartners", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}
```

## Backend Is Done 

Last Folder Stucture -

```base
Backend ____
                        |-node_modules
                        |-src  ___
                                        |-controller__
                                                                |-auth.controller.js
                                                                |-message.controller.js
                                        |-lib_
                                                  |-arcjet.js
                                                  |-cloudinary.js
                                                  |-db.js
                                                  |-env.js
                                                  |-utils.js
                                        |-routes_
                                                        |-auth.route.js
                                                        |-message.route.js
                                        |-middleware_
                                                                |-arcjet.middleware.js
                                                                |-auth.middleware.js
                                        |-models_
                                                        |-User.js
                                                        |-Message.js
                                        |-server.js
                        |-.env
                        |-package-lock.json
                        |-package.json
```
# Frontend Set up 

### Here we Create a React App , in the Previous Codes 

But whatever we start from the Start

1. Install Vite Bundler
```
npm i create vite
```
2. Setup Tailwindcss v3
```
npm i tailwindcss@v3
```
3. Setup Daisy Ui v4 - Better Class Utilization for tailwindcss
```
npm i daisyui@4
```
4. install these Resources 
```
npm i axios@1.14.0  zustand@5.0.3  lucide-react  react-router react-router-dom  react-hot-toast
```

# Clean the App.jsx , index.css - Remove the all code from this 
# Delete this files App.jsx , assets folder 

After this

## 1. Centralize the Data in a File 
   ### Create lib Folder and create axios.js file inside the folder
   ### Create Store Folder in the src folder and create a file UseAuthStore.js 

Keep this code - for axios.js

```javascript 
import axios from 'axios'

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.MODE === 'development' ? 'https://hama-chats-1.onrender.com/api' : '/api')

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.MODE === 'development' ? 'http://localhost:5000/api' : '/api')

export const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
})

```

Keep this code - for UseAuthStore.js

```javascript
import { create } from 'zustand'
import { axiosInstance } from '../lib/axios'
import { toast } from "react-hot-toast"
export const useAuthStore = create((set) => ({
    authUser: null,
    isCheckingAuth: false,
    isSigningUp: false,
    isLogin: false,


    checkAuth: async () => {
        set({ isCheckingAuth: true })
        try {
            const res = await axiosInstance.get('/auth/check');
            set({ authUser: res.data })
        } catch (error) {
            set({ authUser: null })
        }
        finally {
            set({ isCheckingAuth: false })
        }
    },

    signup: async (data) => {
        set({ isSigningUp: true });
        try {
            const res = await axiosInstance.post("/auth/signup", data);
            set({ authUser: res.data })
            toast.success("Account Created Successfully");
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong")
        }
        finally {
            set({ isSigningUp: false })
        }
    },

    login: async (data) => {
        set({ isLogin: true })
        try {
            const res = await axiosInstance.post("/auth/login", data);
            set({ authUser: res.data })
            toast.success("User Logged In")
        } catch (error) {
            toast.error(error.response?.data?.message || "Login Error");
        }
        finally {
            set({ isLogin: false })
        }
    },

    logout : async()=>{
        try {
            const res = await axiosInstance.post('/auth/logout');
            set({authUser:null})
            toast.success("Logged Out Successfully")
        } catch (error) {
            toast.error(error.response?.data?.message)
        }
    },

    updateProfilePicture: async (data) => {
        try {
            const res = await axiosInstance.put('/auth/update-profile', data);
            set({ authUser: res.data });
            toast.success("Profile Picture Updated Successfully");
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong");
            console.error("Error updating profile picture:", error);
        }
    }

}))
```

# 2. Keep this in App.jsx file
 
 ```javascript
 import React, { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import NeonChatBackground from './theme/NeonChatBackground'
import Chatpage from './pages/Chatpage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import { useAuthStore } from './store/useAuthStore'
import PageLoader from './loader/PageLoader'
import HamaPageLoader from './loader/HamaPageLoader'
import { Toaster } from 'react-hot-toast'
import MouseFolloower from './components/MouseFolloower'

const App = () => {
  const { checkAuth, authUser, isCheckingAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (isCheckingAuth) return <PageLoader />

  return (
    <div className='relative h-screen w-screen flex items-center justify-center'>
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

        <Route path='/loader' element={<HamaPageLoader/>} />

        <Route path='/follower' element={<MouseFolloower/>} />
      </Routes>

      <Toaster
        position="top-center"
        reverseOrder={false}
      />
    </div>
  )
}

export default App
 ```

# 3. main.jsx file keep this code 
```javascript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>

)
```

# 4. now Create Folders and Keep this folder Stucture 

```javascript 
src__
            |-components__
                                         |-ActiveTabSwitch.jsx
                                         |-ChatContainer.jsx
                                         |-ChatList.jsx
                                         |-ContactList.jsx
                                         |-NoChatConversation.jsx
                                         |-NoChatFound.jsx
                                         |-ProfileHeader.jsx
                                         |-UserLoadingSkeleton.jsx
            |-pages__
                            |-Chatpage.jsx
                            |-Login.jsx
                            |-Signup.jsx
            |-store__
                            |-useAuthStore.jsx
                            |-useChatStore.jsx
            |-loader__
                             |-PageLoader.jsx
            |-lib__
                        |-axios.js
            |-theme__
                            |-AestheticBackground.jsx
            |-App.jsx
            |-main.jsx
            |-index.css
```

## Setup the frontend , create and explain = pages folder , tailwind setup , daisy ui setup , component folder , install axios and zustand@5.0.3 create store folder for zustand , lib for axios 