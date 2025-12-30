import express from "express";
import {
  getUsersByRole,
  assignOfficerRole,
  revokeOfficerRole,
  assignInstitutionToAdmin,
  revokeInstitutionFromAdmin,
  createAdmin,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/", getUsersByRole);
router.post(
  "/create-admin",

  createAdmin
);
router.patch("/:id/assign-officer", assignOfficerRole);
router.patch("/:id/revoke-officer", revokeOfficerRole);

router.patch("/:id/assign-institution", assignInstitutionToAdmin);
router.patch("/:id/revoke-institution",  revokeInstitutionFromAdmin);

export default router;