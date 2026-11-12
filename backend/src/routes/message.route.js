import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getAllContact ,getMessagesByUserId ,sendMessage ,getChatsPartners, getUserProfile, markMessagesAsSeen, editMessage} from '../controllers/message.controller.js'

const router = express.Router();

router.put("/seen/:id", protectRoute, markMessagesAsSeen);
router.put("/edit/:id", protectRoute, editMessage);

router.get('/contacts', protectRoute, getAllContact)
router.get('/chats',protectRoute,getChatsPartners)
router.get("/profile/:id", protectRoute, getUserProfile);
router.get('/:id',protectRoute , getMessagesByUserId)
router.post('/send/:id' ,protectRoute,sendMessage)


export default router;