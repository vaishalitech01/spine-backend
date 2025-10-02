import { Router } from "express";
import {
  getEmployeeById,
  updateUser,
  uploadAvatar,
  getRewardWalletTransactions,
  withdrawFromWallet,
  getUserDashboardSummary,
  sendOtp,
  resetPassword,
  getTodayEarnings,
  getAllTransactions
} from "../controllers/userController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { checkUserStatus } from "../middleware/checkuserstatus.js";

const router = Router();

router.get("/dashboardsummary", authenticate, checkUserStatus, getUserDashboardSummary);
router.get("/earnings/today-earnings", authenticate, checkUserStatus, getTodayEarnings);
router.get("/:employeeId", authenticate, checkUserStatus, getEmployeeById);
router.put("/update", authenticate, checkUserStatus, updateUser);
router.post("/avatar", authenticate, checkUserStatus,  uploadAvatar);
router.get("/reward-wallet", authenticate, checkUserStatus, getRewardWalletTransactions);
router.post("/withdraw", authenticate, checkUserStatus, withdrawFromWallet);
router.post("/otp", checkUserStatus, sendOtp);
router.post("/resetPass",checkUserStatus, resetPassword);
router.get("/transactions/get", authenticate, checkUserStatus, getAllTransactions);



export default router;
