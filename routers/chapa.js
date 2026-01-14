import { Router } from "express";
import { chapaWebhook } from "../utils/chapa.js";

const router= Router();

router.post("/chapa-webhook", chapaWebhook);
router.get("/chapa-webhook", chapaWebhook);

export default router;