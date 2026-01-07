import {sendMessage, getMessages} from "../controllers/messageController.js";
import { protect } from "../controllers/authController.js";
import { Router } from "express";
const router= Router();
router.post("/sendMessage", protect, sendMessage);
router.get("/getMessages/:chatRoomId", protect, getMessages);
export default router;
