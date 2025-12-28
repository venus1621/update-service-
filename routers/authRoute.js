import { Router } from "express";
import { signup, login, logout, getMe, protect, updatePassword } from "../controllers/authController.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/logout",protect, logout);
router.get("/me",protect, getMe);
router.post("/updatePassword",protect, updatePassword); // make sure protect middleware is used in app.js if needed

export default router;
