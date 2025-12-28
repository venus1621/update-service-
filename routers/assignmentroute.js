import express from "express";
import {
  createAssignment,
  getAllAssignments,
  getAssignmentById,
  updateAssignment,
  unassignAssignment,
} from "../controllers/assignmentController.js";
import { protect, restrictTo } from "../controllers/authController.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("admin", "super-admin"));

router.post("/", createAssignment);
router.get("/", getAllAssignments);
router.get("/:id", getAssignmentById);
router.patch("/:id", updateAssignment);
router.patch("/:id/unassign", unassignAssignment);

export default router;
