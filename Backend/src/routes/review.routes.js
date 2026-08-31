import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  submitReview,
  getTravelerReviews,
  getTravelerStats,
} from "../controllers/review.controller.js";

const router = express.Router();

/**
 * POST /api/reviews
 * Submit a review for a traveler after delivery
 * 
 * Request body:
 * {
 *   bookingId: string (ObjectId),
 *   rating: number (1-5),
 *   comment: string (optional)
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   message: "Review submitted successfully",
 *   data: {
 *     review: { reviewer, rating, comment, createdAt },
 *     travelerStats: { rating, totalReviews }
 *   }
 * }
 */
router.post("/", authMiddleware, submitReview);

/**
 * GET /api/reviews/traveler/:travelerId
 * Get all reviews for a traveler
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     travelerId,
 *     name,
 *     rating,
 *     totalReviews,
 *     completedDeliveries,
 *     reviews: [{ reviewer, rating, comment, createdAt }, ...]
 *   }
 * }
 */
router.get("/traveler/:travelerId", getTravelerReviews);

/**
 * GET /api/reviews/stats/:travelerId
 * Get rating statistics for a traveler
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     rating,
 *     totalReviews,
 *     completedDeliveries,
 *     ratingDistribution: {
 *       fiveStar,
 *       fourStar,
 *       threeStar,
 *       twoStar,
 *       oneStar
 *     }
 *   }
 * }
 */
router.get("/stats/:travelerId", getTravelerStats);

export default router;
