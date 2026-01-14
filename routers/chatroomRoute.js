import { getUserChatRooms } from "../controllers/chatRoomConteoller.js";
import { protect } from "../controllers/authController.js";

import { Router } from "express";
const router = Router();

router.get("/", protect, getUserChatRooms);

export default router;
