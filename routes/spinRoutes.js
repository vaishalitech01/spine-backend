import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { getSpinLogs, playSpin, purchaseSpin,getPrizeList,getSpinCount, playSpin2 } from "../controllers/spinController.js";
import { checkUserStatus } from "../middleware/checkuserstatus.js";
const router = Router();

router.get("/play", authenticate, checkUserStatus, playSpin);
router.get("/playtwo", authenticate, checkUserStatus, playSpin2);
router.post("/purchase", authenticate, checkUserStatus, purchaseSpin);
router.get("/logs", authenticate, checkUserStatus, getSpinLogs);
router.get("/prizelist", authenticate,checkUserStatus, getPrizeList);
router.get("/count", authenticate, checkUserStatus, getSpinCount);

export default router;
