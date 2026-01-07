import { Router } from "express";
import { protect } from "../controllers/authController.js";
import {
  createApplication,
  getApplicationsByInfoRequest,
  getApplicationsByOfficer,
  acceptApplication,
  rejectApplication,
  updateApplication,
} from "../controllers/applicationController.js";

const router = Router();

router.post("/createApplication", protect, createApplication);
router.get(
  "/getApplicationsByInfoRequest/:infoRequest",
  protect,
  getApplicationsByInfoRequest
);
router.get("/getMyApplications", protect, getApplicationsByOfficer);
router.post("/acceptApplication", protect, acceptApplication);
router.post("/rejectApplication", protect, rejectApplication);
router.patch("/updateApplication/:applicationId", protect, updateApplication);

export default router;
