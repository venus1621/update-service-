import express from "express";
import {
  createOfficer,
  getAllOfficers,
  getOfficerById,
  updateOfficer,
  verifyOfficer,
  suspendOfficer,
  deleteOfficer,
  superAdminUpdateOfficer,
} from "../controllers/officer.controller.js";

const router = express.Router();

router.post("/", createOfficer);
router.get("/", getAllOfficers);
router.get("/:id", getOfficerById);

router.put("/:id", updateOfficer); // officer self-update
router.put("/admin/:id", superAdminUpdateOfficer);

router.patch("/verify/:id", verifyOfficer);
router.patch("/suspend/:id", suspendOfficer);

router.delete("/:id", deleteOfficer);

export default router;