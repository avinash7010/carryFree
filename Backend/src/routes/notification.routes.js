import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/my", authMiddleware, getMyNotifications);
router.patch("/:id/read", authMiddleware, markNotificationRead);
router.patch("/read-all", authMiddleware, markAllNotificationsRead);

export default router;
