import mongoose from "mongoose";
import User from "../models/User.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";

/**
 * Get public profile for any user by ID
 * Returns safe fields only: name, role, rating, totalReviews, completedDeliveries, createdAt
 */
export const getPublicProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, "Invalid user id", 400);
    }

    const user = await User.findById(id)
      .select("name role rating totalReviews completedDeliveries createdAt");

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(res, "Profile fetched", {
      id: user._id,
      name: user.name,
      role: user.role,
      rating: user.rating,
      totalReviews: user.totalReviews,
      completedDeliveries: user.completedDeliveries,
      createdAt: user.createdAt,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch profile", 500, error.message);
  }
};

/**
 * Get authenticated user's own profile
 * Uses req.user.id from verified JWT — never trusts frontend-supplied ID
 * Returns additional field: email
 */
export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return errorResponse(res, "Invalid user id", 400);
    }

    const user = await User.findById(userId)
      .select("name email role rating totalReviews completedDeliveries createdAt updatedAt");

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(res, "Profile fetched", {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      rating: user.rating,
      totalReviews: user.totalReviews,
      completedDeliveries: user.completedDeliveries,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch profile", 500, error.message);
  }
};
