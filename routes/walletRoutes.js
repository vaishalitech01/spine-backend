import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { depositFunds, getTransactions, getWalletBalance, withdrawFunds } from "../controllers/walletController.js";
import { checkUpiVerified } from "../middleware/checkUpiVerified.js";
import { checkUserStatus } from "../middleware/checkuserstatus.js";

const router = Router();


router.get("/balance",authenticate, checkUserStatus,getWalletBalance);
router.get("/transactions",authenticate, checkUserStatus,getTransactions);
router.post("/deposit",authenticate, checkUserStatus, checkUpiVerified, depositFunds);
router.post("/withdrawal",authenticate, checkUserStatus, checkUpiVerified, withdrawFunds);

export default router;