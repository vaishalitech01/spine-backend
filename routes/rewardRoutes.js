import { Router } from "express";
import {
  getRewardWallet,
  getRewardHistory,
  getMyReferralSummary,
  getReferralBonusHistory,
  withdrawRewardBalance
} from "../controllers/rewardController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { checkUserStatus } from "../middleware/checkuserstatus.js";

const router = Router();

router.get("/getreward", authenticate, checkUserStatus, getRewardWallet);
router.get("/history", authenticate, checkUserStatus, getRewardHistory);
router.get('/referral-summary', authenticate, checkUserStatus, getMyReferralSummary);
router.get('/ReferralBonusHistory', authenticate, checkUserStatus, getReferralBonusHistory);
router.put("/withdrawRewardBalance", authenticate, checkUserStatus, withdrawRewardBalance);

export default router;
