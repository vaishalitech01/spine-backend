import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import {
  getAllReferral,
  getReferralCode,
  getReferralTree,
  getReferralSummary,
  getMyReferralUsedInfo,
  getSubReferralsByDirectReferral
} from "../controllers/referralController.js";
import { checkUserStatus } from "../middleware/checkuserstatus.js";

const router = Router();

// Admin
router.get("/", getAllReferral);

// Authenticated user routes
router.get("/code-link", authenticate, checkUserStatus, getReferralCode);
router.get("/tree", authenticate, checkUserStatus, getReferralTree);
router.get("/summary", authenticate, checkUserStatus, getReferralSummary);
router.get("/my-referral-used", authenticate, checkUserStatus, getMyReferralUsedInfo);

router.get("/getSubReferralsByDirectReferral/:directReferralId", authenticate, checkUserStatus, getSubReferralsByDirectReferral);

export default router;
