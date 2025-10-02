// routes/investmentRoutes.js
import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import {
  getInvestmentPlans,
  subscribeInvestment,
  getSubscriptionsbyId,
  getActiveInvestments,
  getInvestmentHistory
} from "../controllers/investController.js";
import { checkUserStatus } from "../middleware/checkuserstatus.js";

const router = Router();

// Public
router.get("/plans", getInvestmentPlans);
// router.get("/plans", authenticate, checkUserStatus, getInvestmentPlans);
// Authenticated
router.post("/subscribe/:id", authenticate,  checkUserStatus, subscribeInvestment);
router.get("/my-active", authenticate,  checkUserStatus, getActiveInvestments);
router.get("/my-history", authenticate,  checkUserStatus, getInvestmentHistory);

// Admin / or authorized
router.get("/:id", authenticate, getSubscriptionsbyId); 

export default router;
