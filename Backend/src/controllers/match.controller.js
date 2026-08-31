import LostItem from "../models/LostItem.js";
import FoundItem from "../models/FoundItem.js";
import mongoose from "mongoose";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import {
  findRankedMatchesForLostItem,
  matchItemAgainstCandidates,
} from "../services/lostFoundMatching.service.js";

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

    const foundItems = await FoundItem.find({ status: "found" })
      .populate("createdBy", "name email role rating totalReviews completedDeliveries");

    const rankedMatches = findRankedMatchesForLostItem({
      lostItem,
      foundItems,
    });

    return successResponse(res, "Matches fetched", {
      lostItem,
      matchCount: rankedMatches.length,
      matches: rankedMatches,
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return errorResponse(res, "Invalid match request payload", 400, error.message);
    }

    return errorResponse(res, "Failed to find matches", 500, error.message);
  }
};

/**
 * @desc Match lost items for a found item
 * @route GET /api/match/found/:id
 * @access Private
 */
export const matchFoundWithLost = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return errorResponse(res, "Invalid found item id", 400);
    }

    const foundItem = await FoundItem.findById(req.params.id);

    if (!foundItem) {
      return errorResponse(res, "Found item not found", 404);
    }

    if (foundItem.createdBy.toString() !== req.user.id) {
      return errorResponse(res, "Unauthorized access", 403);
    }

    const lostItems = await LostItem.find({ status: "lost" })
      .populate("createdBy", "name email role rating totalReviews completedDeliveries");

    const rankedMatches = matchItemAgainstCandidates({
      sourceItem: foundItem,
      candidateItems: lostItems,
      sourceType: "found",
    });

    return successResponse(res, "Matches fetched", {
      foundItem,
      matchCount: rankedMatches.length,
      matches: rankedMatches,
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return errorResponse(res, "Invalid match request payload", 400, error.message);
    }

    return errorResponse(res, "Failed to find matches", 500, error.message);
  }
};
