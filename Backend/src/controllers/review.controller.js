import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";
import { notifyUsers } from "../services/notification.service.js";

/**
 * ============== HELPER FUNCTIONS ==============
 */

/**
 * Calculate and update user's average rating
 * Efficiently computes average from all reviews and stores in user.rating
 * 
 * @param {Object} user - User document with reviews array
 * @returns {number} Updated average rating (rounded to 2 decimals)
 * 
 * Formula: rating = (sum of all ratings) / totalReviews
 * Optimized: O(n) single pass with reduce
 */
const updateUserRating = (user) => {
  if (!user.reviews || user.reviews.length === 0) {
    user.rating = 0;
    user.totalReviews = 0;
    return 0;
  }

  // Single pass calculation using reduce
  const totalRating = user.reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / user.reviews.length;

  // Round to 2 decimal places
  user.rating = Math.round(averageRating * 100) / 100;
  user.totalReviews = user.reviews.length;

  return user.rating;
};

/**
 * Alternative: Calculate rating using MongoDB aggregation for efficiency at scale
 * Use this when working with very large datasets in separate operation
 * 
 * @param {string} userId - User ID
 * @returns {Promise<number>} Average rating from database
 */
const calculateRatingViaAggregation = async (userId) => {
  const result = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },
    {
      $project: {
        averageRating: {
          $cond: [
            { $eq: [{ $size: "$reviews" }, 0] },
            0,
            {
              $round: [
                { $avg: "$reviews.rating" },
                2
              ]
            }
          ]
        },
        reviewCount: { $size: "$reviews" }
      }
    }
  ]);

  return result[0] || { averageRating: 0, reviewCount: 0 };
};

/**
 * ============== MAIN CONTROLLER ==============
 */

/**
 * Submit a review for a traveler after delivery is completed
 * 
 * Only allowed if:
 * - Booking status is "delivered"
 * - Reviewer is the package sender
 * - No duplicate review from same reviewer for same booking
 * 
 * This endpoint:
 * - Adds review to traveler's reviews array
 * - Increments traveler's totalReviews
 * - Updates traveler's average rating automatically
 */
export const submitReview = async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;
    const reviewerId = req.user.id;

    // ============== VALIDATION ==============
    if (!bookingId || rating === undefined) {
      return errorResponse(
        res,
        "bookingId and rating are required",
        400
      );
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return errorResponse(res, "Invalid booking id", 400);
    }

    // Validate rating is between 1-5
    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return errorResponse(
        res,
        "Rating must be a number between 1 and 5",
        400
      );
    }

    // ============== FIND BOOKING ==============
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return errorResponse(res, "Booking not found", 404);
    }

    // Check booking status is delivered
    if (booking.status !== "delivered") {
      return errorResponse(
        res,
        `Cannot review until delivery is completed. Current status: ${booking.status}`,
        400
      );
    }

    // Verify reviewer is the package sender
    if (booking.senderId.toString() !== reviewerId) {
      return errorResponse(
        res,
        "Only the package sender can submit a review",
        403
      );
    }

    // ============== FIND TRAVELER ==============
    const traveler = await User.findById(booking.travelerId);
    if (!traveler) {
      return errorResponse(res, "Traveler not found", 404);
    }

    // ============== CHECK DUPLICATE REVIEW ==============
    const existingReview = traveler.reviews.find((review) => {
      const sameReviewer = review.reviewer.toString() === reviewerId;
      const sameBooking = review.bookingId && review.bookingId.toString() === bookingId;
      return sameReviewer && sameBooking;
    });

    if (existingReview) {
      return errorResponse(
        res,
        "You have already submitted a review for this booking",
        400
      );
    }

    // ============== ADD REVIEW ==============
    const newReview = {
      bookingId: new mongoose.Types.ObjectId(bookingId),
      reviewer: new mongoose.Types.ObjectId(reviewerId),
      rating: numericRating,
      comment: (comment || "").trim(),
      createdAt: new Date(),
    };

    traveler.reviews.push(newReview);

    // ============== RECALCULATE AVERAGE RATING ==============
    // Optimized: Single-pass calculation with reduce (O(n))
    const updatedRating = updateUserRating(traveler);

    await traveler.save();

    // ============== NOTIFY TRAVELER ==============
    notifyUsers([
      {
        userId: booking.travelerId,
        type: "review_posted",
        title: "New review received",
        message: `A sender left you a ${numericRating}-star review for a delivery.`,
        metadata: {
          bookingId: booking._id,
          reviewerId: reviewerId,
          travelerId: booking.travelerId,
          rating: numericRating,
        },
      },
    ]).catch(() => {});

    // ============== RETURN SUCCESS ==============
    return successResponse(
      res,
      "Review submitted successfully",
      {
        review: newReview,
        travelerStats: {
          rating: updatedRating,
          totalReviews: traveler.totalReviews,
        },
      },
      201
    );
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return errorResponse(res, "Invalid review data", 400, error.message);
    }

    return errorResponse(res, "Failed to submit review", 500, error.message);
  }
};

/**
 * Get all reviews for a specific traveler
 */
export const getTravelerReviews = async (req, res) => {
  try {
    const { travelerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(travelerId)) {
      return errorResponse(res, "Invalid traveler id", 400);
    }

    const traveler = await User.findById(travelerId).populate(
      "reviews.reviewer",
      "name email rating completedDeliveries"
    );

    if (!traveler) {
      return errorResponse(res, "Traveler not found", 404);
    }

    // Return traveler stats with FULL reviews array (this endpoint explicitly requests it)
    return successResponse(res, "Traveler reviews fetched", {
      travelerId: traveler._id,
      name: traveler.name,
      email: traveler.email,
      role: traveler.role,
      rating: traveler.rating,
      totalReviews: traveler.totalReviews,
      completedDeliveries: traveler.completedDeliveries,
      reviews: traveler.reviews, // Full array only in this dedicated endpoint
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch reviews", 500, error.message);
  }
};

/**
 * Get review statistics for a traveler
 * Uses optimized aggregation pipeline for efficient calculation
 */
export const getTravelerStats = async (req, res) => {
  try {
    const { travelerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(travelerId)) {
      return errorResponse(res, "Invalid traveler id", 400);
    }

    // Use aggregation pipeline for efficient calculation
    const result = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(travelerId) } },
      {
        $facet: {
          summary: [
            {
              $project: {
                rating: 1,
                totalReviews: { $size: { $ifNull: ["$reviews", []] } },
                completedDeliveries: 1,
              },
            },
          ],
          distribution: [
            { $unwind: { path: "$reviews", preserveNullAndEmptyArrays: false } },
            {
              $group: {
                _id: "$reviews.rating",
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: -1 } },
          ],
        },
      },
    ]);

    if (!result[0]?.summary?.length) {
      return errorResponse(res, "Traveler not found", 404);
    }

    const [data] = result;
    const [summary] = data.summary;

    // Map distribution counts
    const distribution = {
      fiveStar: 0,
      fourStar: 0,
      threeStar: 0,
      twoStar: 0,
      oneStar: 0,
    };

    data.distribution.forEach((item) => {
      if (item._id === 5) distribution.fiveStar = item.count;
      else if (item._id === 4) distribution.fourStar = item.count;
      else if (item._id === 3) distribution.threeStar = item.count;
      else if (item._id === 2) distribution.twoStar = item.count;
      else if (item._id === 1) distribution.oneStar = item.count;
    });

    return successResponse(res, "Traveler stats fetched", {
      rating: summary.rating,
      totalReviews: summary.totalReviews,
      completedDeliveries: summary.completedDeliveries,
      ratingDistribution: distribution,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch stats", 500, error.message);
  }
};
