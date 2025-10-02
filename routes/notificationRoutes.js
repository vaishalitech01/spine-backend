import express from "express"
import { deleteUserNotifications, getUserNotifications } from "../controllers/notificationController.js";
import {  authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/notification", authenticate, getUserNotifications);
router.delete("/deleteAll", authenticate, deleteUserNotifications);

export default router;
