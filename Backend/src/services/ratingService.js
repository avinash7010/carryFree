/**
 * Rating Calculation Service
 * 
 * Centralized, optimized rating calculations for user reviews
 * Supports multiple calculation strategies for different performance needs
 */

import mongoose from "mongoose";
import User from "../models/User.js";

/**
 * Update user's average rating based on their reviews array
 * 
 * Formula: rating = (sum of all ratings) / totalReviews
 * Complexity: O(n) - single pass with reduce
 * 
 * @param {Object} user - User document with reviews array
 * @returns {number} Updated average rating (0-5, rounded to 2 decimals)
 * 
 * @example
 * const rating = updateUserRating(traveler);
 * console.log(rating); // 4.67
 */
export const updateUserRating = (user) => {
  if (!user.reviews || user.reviews.length === 0) {
    user.rating = 0;
    user.totalReviews = 0;
    return 0;
  }

  // Single pass calculation: O(n)
  const totalRating = user.reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / user.reviews.length;

  // Round to 2 decimal places
  user.rating = Math.round(averageRating * 100) / 100;
  user.totalReviews = user.reviews.length;

  return user.rating;
};

/**
 * Calculate rating using MongoDB aggregation pipeline
 * 
 * Best for: Large datasets, avoiding loading full document in memory
 * Complexity: O(n) - server-side aggregation
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} { averageRating: number, reviewCount: number }
 * 
 * @example
 * const stats = await calculateRatingViaAggregation("user_id");
 * console.log(stats); // { averageRating: 4.67, reviewCount: 3 }
 */
export const calculateRatingViaAggregation = async (userId) => {
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
                2,
              ],
            },
          ],
        },
        reviewCount: { $size: "$reviews" },
      },
    },
  ]);

  return result[0] || { averageRating: 0, reviewCount: 0 };
};

/**
 * Update user rating in database without loading full document
 * 
 * Best for: Bulk operations, efficiency when full document not needed
 * Uses MongoDB update operators
 * 
 * @param {string} userId - User ID to update
 * @returns {Promise<Object>} Updated user document
 */
export const updateRatingInDatabase = async (userId) => {
  const result = await User.findByIdAndUpdate(
    userId,
    [
      {
        $set: {
          totalReviews: { $size: "$reviews" },
          rating: {
            $cond: [
              { $eq: [{ $size: "$reviews" }, 0] },
              0,
              {
                $round: [
                  { $avg: "$reviews.rating" },
                  2,
                ],
              },
            ],
          },
        },
      },
    ],
    { new: true }
  );

  return result;
};

/**
 * Get rating statistics for a user
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Rating stats including distribution
 */
export const getRatingStats = async (userId) => {
  const result = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },
    {
      $facet: {
        summary: [
          {
            $project: {
              rating: 1,
              totalReviews: { $size: "$reviews" },
              completedDeliveries: 1,
            },
          },
        ],
        distribution: [
          { $unwind: "$reviews" },
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

  const [data] = result;
  const [summary] = data.summary;
  const distribution = {};

  // Map rating counts to distribution object
  data.distribution.forEach((item) => {
    distribution[`${item._id}Stars`] = item.count;
  });

  return {
    rating: summary?.rating || 0,
    totalReviews: summary?.totalReviews || 0,
    completedDeliveries: summary?.completedDeliveries || 0,
    distribution: {
      fiveStar: distribution["5Stars"] || 0,
      fourStar: distribution["4Stars"] || 0,
      threeStar: distribution["3Stars"] || 0,
      twoStar: distribution["2Stars"] || 0,
      oneStar: distribution["1Stars"] || 0,
    },
  };
};

/**
 * Recalculate all user ratings (maintenance operation)
 * Use this for data migration or fixing corrupted ratings
 * 
 * @returns {Promise<number>} Number of users updated
 */
export const recalculateAllUserRatings = async () => {
  const result = await User.updateMany(
    {},
    [
      {
        $set: {
          totalReviews: { $size: { $ifNull: ["$reviews", []] } },
          rating: {
            $cond: [
              { $eq: [{ $size: { $ifNull: ["$reviews", []] } }, 0] },
              0,
              {
                $round: [
                  { $avg: "$reviews.rating" },
                  2,
                ],
              },
            ],
          },
        },
      },
    ]
  );

  return result.modifiedCount;
};

/**
 * Validate rating in range [0, 5]
 * 
 * @param {number} rating - Rating value to validate
 * @returns {boolean} True if valid
 */
export const isValidRating = (rating) => {
  const num = Number(rating);
  return Number.isFinite(num) && num >= 0 && num <= 5;
};

/**
 * Validate review rating in range [1, 5] (reviews require 1-5)
 * 
 * @param {number} rating - Rating value to validate
 * @returns {boolean} True if valid
 */
export const isValidReviewRating = (rating) => {
  const num = Number(rating);
  return Number.isFinite(num) && num >= 1 && num <= 5;
};
