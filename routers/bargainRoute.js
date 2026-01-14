import { protect } from "../controllers/authController.js";
import { createBargain } from "../controllers/bargainController.js";

import express from "express";
const router = express.Router();
router.post("/create-bargain", protect, createBargain);
export default router ;