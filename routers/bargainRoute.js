import { protect } from "../controllers/authController.js";
import bargain from "../controllers/bargainController.js";

import express from "express";
const router = express.Router();
router.post("/create-bargain",protect, bargain.createBargain);

export default router ;