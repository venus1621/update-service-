import express from "express";
import {
  createOfficer,
  getAllOfficers,
  getOfficerById,
  updateOfficer,
  verifyOfficer,
  suspendOfficer,
} from "../controllers/officer.controller.js";

import { protect, restrictTo } from "../controllers/authController.js";

const router = express.Router();

/* ======================================================
   PUBLIC / AUTHENTICATED ACCESS
====================================================== */

/**
 * GET /api/v1/officers
 * List officers (filters, pagination handled in controller)
 */
router.get("/", getAllOfficers);

/**
 * GET /api/v1/officers/:id
 * Get single officer profile
 */
router.get("/:id", getOfficerById);

/* ======================================================
   ADMIN / SUPER-ADMIN ONLY
====================================================== */

router.use(protect);
router.use(restrictTo("admin", "super-admin"));

/**
 * POST /api/v1/officers
 * Create officer (required fields enforced)
 */
router.post("/", createOfficer);

/**
 * PATCH /api/v1/officers/:id
 * Update officer (required fields NOT mutable)
 */
router.patch("/:id", updateOfficer);

/**
 * PATCH /api/v1/officers/:id/verify
 * Verify officer
 */
router.patch("/:id/verify", verifyOfficer);

/**
 * PATCH /api/v1/officers/:id/suspend
 * Soft-suspend officer
 */
router.patch("/:id/suspend", suspendOfficer);

export default router;
