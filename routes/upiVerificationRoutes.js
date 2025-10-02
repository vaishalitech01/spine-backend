// routes/upiVerificationRoutes.js
import express from "express";
import { requestUpiVerification, verifyUpiOtp } from "../controllers/upiVerificationController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { checkUserStatus } from "../middleware/checkuserstatus.js";

const router = express.Router();

router.post("/verify-upid", authenticate, checkUserStatus, requestUpiVerification);
router.post("/verify-upid/otp", authenticate, checkUserStatus, verifyUpiOtp);

export default router;
