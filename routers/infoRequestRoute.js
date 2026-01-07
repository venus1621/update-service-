// routes/infoRequestRoutes.js
import express from "express";
import {
  createInfoRequest,
  getMyInfoRequests,
  getInfoRequests,
  updateInfoRequest,
} from "../controllers/infoRequeastController.js"; // Adjust path if needed

// If you have an auth middleware (e.g., protect route with JWT)
import { protect } from "../controllers/authController.js";
const router = express.Router();

// Public route - Get all active info requests (feed)
router.get("/", getInfoRequests);

// Protected routes (require authenticated user)
router.use(protect); // Apply authentication to all routes below

// Create a new info request
router.post("/create", createInfoRequest);

// Get logged-in user's own info requests
router.get("/my-requests", getMyInfoRequests);

// Update an info request (better to use PATCH and :id in params)
router.patch("/:id", updateInfoRequest);

// Optional: If you prefer POST with infoId in body, you can keep this
// router.post("/update", updateInfoRequest);

// You can add more routes later like:
// router.delete("/:id", deleteInfoRequest);
// router.get("/:id", getSingleInfoRequest);

export default router;