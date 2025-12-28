import express from "express";
import {
  createServiceCategory,
  getAllServiceCategories,
  getServiceCategoryById,
  updateServiceCategory,
  deleteServiceCategory,
} from "../controllers/serviceCategory.controller.js";

const router = express.Router();

router.post("/", createServiceCategory);
router.get("/", getAllServiceCategories);
router.get("/:id", getServiceCategoryById);
router.put("/:id", updateServiceCategory);
router.delete("/:id", deleteServiceCategory);

export default router;
