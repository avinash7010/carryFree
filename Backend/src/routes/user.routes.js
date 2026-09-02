import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { getPublicProfile, getMyProfile } from "../controllers/user.controller.js";

const router = express.Router();

/**
 * GET /api/users/me
 * Get authenticated user's own profile (includes email)
 * Uses req.user.id from verified JWT — never trusts frontend-supplied ID
 */
router.get("/me", authMiddleware, getMyProfile);

/**
 * GET /api/users/:id
 * Get public profile for any user by ID
 * Safe fields only: name, role, rating, totalReviews, completedDeliveries, createdAt
 */
router.get("/:id", getPublicProfile);

export default router;
