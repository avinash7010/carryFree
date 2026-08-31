import LostItem from "../models/LostItem.js";
import FoundItem from "../models/FoundItem.js";
import mongoose from "mongoose";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

/**
 * @desc Match found items for a lost item
 * @route GET /api/match/lost/:id
 * @access Private
 */
export const matchLostWithFound = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return errorResponse(res, "Invalid lost item id", 400);
    }

    const lostItem = await LostItem.findById(req.params.id);

    if (!lostItem) {
      return errorResponse(res, "Lost item not found", 404);
    }

    // Only owner can see matches
    if (lostItem.createdBy.toString() !== req.user.id) {
      return errorResponse(res, "Unauthorized access", 403);
    }

    const matches = await FoundItem.find({
      category: lostItem.category,
      location: lostItem.location,
      dateFound: { $gte: lostItem.dateLost },
      status: "found",
    }).populate("createdBy", "name email role rating totalReviews completedDeliveries");

    return successResponse(res, "Matches fetched", {
      lostItem,
      matchCount: matches.length,
      matches,
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return errorResponse(res, "Invalid match request payload", 400, error.message);
    }

    return errorResponse(res, "Failed to find matches", 500, error.message);
  }
};
