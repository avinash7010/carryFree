import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  createBooking,
  generateDeliveryOtp,
  getMyBookings,
  markInTransit,
  respondToBooking,
  verifyDeliveryOtp,
} from "../controllers/booking.controller.js";

const router = express.Router();

router.get("/my", authMiddleware, getMyBookings);
router.post("/", authMiddleware, createBooking);
router.patch("/:id/respond", authMiddleware, respondToBooking);
router.patch("/:id/start", authMiddleware, markInTransit);
router.post("/:id/generate-otp", authMiddleware, generateDeliveryOtp);
router.post("/:id/verify-delivery", authMiddleware, verifyDeliveryOtp);

export default router;
