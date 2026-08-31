import Claim from "../models/Claim.js";
import FoundItem from "../models/FoundItem.js";
import LostItem from "../models/LostItem.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";

export const createClaim = async (req, res) => {
  const { lostItemId, foundItemId, message } = req.body;

  try {
    if (!lostItemId || !foundItemId || !message) {
      return errorResponse(res, "lostItemId, foundItemId, and message are required", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(lostItemId) || !mongoose.Types.ObjectId.isValid(foundItemId)) {
      return errorResponse(res, "Invalid lostItemId or foundItemId", 400);
    }

    const lostItem = await LostItem.findById(lostItemId);
    const foundItem = await FoundItem.findById(foundItemId);

    if (!lostItem) {
      return errorResponse(res, "Lost item not found", 404);
    }

    if (!foundItem) {
      return errorResponse(res, "Found item not found", 404);
    }

    if (lostItem.createdBy.toString() !== req.user.id) {
      return errorResponse(res, "You can only claim against your own lost item", 403);
    }

    if (lostItem.status !== "lost") {
      return errorResponse(res, "This lost item is no longer open for claims", 400);
    }

    if (foundItem.status !== "found") {
      return errorResponse(res, "This found item is no longer open for claims", 400);
    }

    if (foundItem.createdBy.toString() === req.user.id) {
      return errorResponse(res, "You cannot claim your own found item", 400);
    }

    const existingClaim = await Claim.findOne({
      lostItem: lostItemId,
      foundItem: foundItemId,
      status: "pending",
    });

    if (existingClaim) {
      return errorResponse(res, "Claim already exists", 400);
    }

    const claim = await Claim.create({
      lostItem: lostItemId,
      foundItem: foundItemId,
      claimant: req.user.id,
      finder: foundItem.createdBy,
      message,
    });

    return successResponse(
      res,
      "Claim request sent successfully",
      claim,
      201
    );
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return errorResponse(res, "Invalid claim payload", 400, error.message);
    }

    return errorResponse(res, "Failed to create claim", 500, error.message);
  }
};

export const getReceivedClaims = async (req, res) => {
  try {
    const claims = await Claim.find({ finder: req.user.id })
      .populate("lostItem")
      .populate("foundItem")
      .populate("claimant", "name email role rating totalReviews completedDeliveries")
      .sort({ createdAt: -1 });

    return successResponse(res, "Received claims fetched", claims);
  } catch (error) {
    return errorResponse(
      res,
      "Failed to fetch received claims",
      500,
      error.message
    );
  }
};

export const updateClaimStatus = async (req, res) => {
  const { status } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return errorResponse(res, "Invalid status value", 400);
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return errorResponse(res, "Invalid claim id", 400);
    }

    const claim = await Claim.findById(req.params.id);

    if (!claim) {
      return errorResponse(res, "Claim not found", 404);
    }

    if (claim.finder.toString() !== req.user.id) {
      return errorResponse(res, "Unauthorized action", 403);
    }

    if (claim.status !== "pending") {
      return errorResponse(res, "Claim is already finalized", 400);
    }

    claim.status = status;
    await claim.save();

    if (status === "approved") {
      await LostItem.findByIdAndUpdate(claim.lostItem, { status: "claimed" });
      await FoundItem.findByIdAndUpdate(claim.foundItem, {
        status: "returned",
      });
    }

    return successResponse(res, `Claim ${status} successfully`, claim);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return errorResponse(res, "Invalid claim status update payload", 400, error.message);
    }

    return errorResponse(
      res,
      "Failed to update claim status",
      500,
      error.message
    );
  }
};
