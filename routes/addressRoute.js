import express from 'express';
import { verifyAddress, verifyOtp } from '../controllers/verifyAddress.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { checkUserStatus } from '../middleware/checkuserstatus.js';

const router = express.Router();

router.post('/verify-address', authenticate, checkUserStatus, verifyAddress);
router.post('/verify-otp', authenticate, checkUserStatus, verifyOtp);

export default router;
