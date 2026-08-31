import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  createTrip,
  getMyTrips,
  getOpenTrips,
} from "../controllers/trip.controller.js";

const router = express.Router();

router.get("/", getOpenTrips);
router.get("/my", authMiddleware, getMyTrips);
router.post("/", authMiddleware, createTrip);

export default router;
