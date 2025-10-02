// routes/authRoutes.js
import { Router } from "express";
import { login, signup, getUser } from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { checkUserStatus } from "../middleware/checkuserstatus.js"

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/user",authenticate, checkUserStatus, getUser);

export default router;
