import { Router } from "express";
import { authenticate, checkAdmin } from "../middleware/authMiddleware.js";
import * as adminlogic from "../controllers/adminController.js"; 

const router = Router();

router.get('/dashboard', authenticate, checkAdmin, adminlogic.getDashboardStats);

router.get('/approvewithdrawals', authenticate, checkAdmin, adminlogic.getAllWithdrawals);

router.put('/withdrawalstatus/:id', authenticate, checkAdmin,  adminlogic.handleWithdrawalApproval);

router.post('/investment/plan',authenticate,checkAdmin,adminlogic.createInvestmentPlan);

router.get('/investment/plans', authenticate, checkAdmin, adminlogic.getAllInvestmentPlans)

router.get('/userinvestments',authenticate, checkAdmin,  adminlogic.getAllUserInvestments);

router.put('/investment/updateplan/:id',authenticate, checkAdmin,  adminlogic.updateInvestmentPlan);

router.get('/users', authenticate, checkAdmin,  adminlogic.getAllUsers);

router.get('/user/:id',authenticate, checkAdmin,  adminlogic.getUser);

router.put('/user/:id/status', authenticate, checkAdmin,  adminlogic.toggleUserStatus );

router.put('/depositstatus/:id', authenticate, checkAdmin,  adminlogic.handleDepositApproval);

router.get('/transactions', authenticate, checkAdmin,  adminlogic.getAllTransactionReports);

router.get('/wallet/deposits', authenticate, checkAdmin,  adminlogic.getAllDeposits);

router.get('/wallet/withdrawals',authenticate,checkAdmin,  adminlogic.getAllWithdrawals);

router.get('/spins/logs', authenticate, checkAdmin,  adminlogic.getSpinLogs);

router.get('/referrals', authenticate, checkAdmin,  adminlogic.getReferralStats);

router.delete('/deleteplan/:id', authenticate,  adminlogic.deletePlans);

export default router;
