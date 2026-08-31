import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  addTrackingUpdate,
  getTrackingHistory,
  streamTracking,
} from "../controllers/tracking.controller.js";

const router = express.Router();

router.post("/:bookingId/update", authMiddleware, addTrackingUpdate);
router.get("/:bookingId/history", authMiddleware, getTrackingHistory);
router.get("/:bookingId/live", authMiddleware, streamTracking);

export default router;
