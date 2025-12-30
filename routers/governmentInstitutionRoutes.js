import express from "express";
import {
  createGovernmentInstitution,
  getGovernmentInstitutions,
  getGovernmentInstitutionById,
  updateGovernmentInstitution,
  suspendGovernmentInstitution,
  reactivateGovernmentInstitution,
} from "../controllers/governmentInstitutionController.js";


const router = express.Router();

// @desc    Fetch all institutions (public - with filters & search)
// @route   GET /api/government-institutions
// @access  Public
router.get("/", getGovernmentInstitutions);

// @desc    Fetch single institution by ID
// @route   GET /api/government-institutions/:id
// @access  Public
router.get("/:id", getGovernmentInstitutionById);

// ==================== ADMIN ONLY ROUTES ====================

// @desc    Create new government institution
// @route   POST /api/government-institutions
// @access  Private/Admin
router.post("/",  createGovernmentInstitution);

// @desc    Update institution
// @route   PATCH /api/government-institutions/:id
// @access  Private/Admin
router.patch("/:id",  updateGovernmentInstitution);

// @desc    Suspend institution
// @route   PATCH /api/government-institutions/:id/suspend
// @access  Private/Admin
router.patch("/:id/suspend",  suspendGovernmentInstitution);

// @desc    Reactivate suspended institution
// @route   PATCH /api/government-institutions/:id/reactivate
// @access  Private/Admin
router.patch("/:id/reactivate", reactivateGovernmentInstitution);

export default router;