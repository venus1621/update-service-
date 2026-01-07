import express from "express";
import {
  getUsersByRole,
  assignOfficerRole,
  revokeOfficerRole,
  assignInstitutionToAdmin,
  revokeInstitutionFromAdmin,
  createAdmin,
  requestUpgradeToOfficer,
  purchaseConnects,
} from "../controllers/userController.js";

import { protect } from "../controllers/authController.js";
const router = express.Router();

router.get("/", getUsersByRole);
router.post(
  "/create-admin",

  createAdmin
);
router.patch("/:id/assign-officer", assignOfficerRole);
router.patch("/:id/revoke-officer", revokeOfficerRole);

router.patch("/:id/assign-institution", assignInstitutionToAdmin);
router.patch("/:id/revoke-institution", revokeInstitutionFromAdmin);
router.post("/requestUpgradeToOfficer", protect, requestUpgradeToOfficer);
router.post("/purchaseConnect", protect, purchaseConnects);

export default router;