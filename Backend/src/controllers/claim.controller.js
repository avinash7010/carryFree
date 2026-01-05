import Claim from "../models/Claim.js";
import FoundItem from "../models/FoundItem.js";
import LostItem from "../models/LostItem.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

export const createClaim = async (req, res) => {
  const { lostItemId, foundItemId, message } = req.body;

  try {
    const foundItem = await FoundItem.findById(foundItemId);

    if (!foundItem) {
      return errorResponse(res, "Found item not found", 404);
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
    return errorResponse(res, "Failed to create claim", 500, error.message);
  }
};

export const getReceivedClaims = async (req, res) => {
  try {
    const claims = await Claim.find({ finder: req.user.id })
      .populate("lostItem")
      .populate("foundItem")
      .populate("claimant", "name email")
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
    const claim = await Claim.findById(req.params.id);

    if (!claim) {
      return errorResponse(res, "Claim not found", 404);
    }

    if (claim.finder.toString() !== req.user.id) {
      return errorResponse(res, "Unauthorized action", 403);
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
    return errorResponse(
      res,
      "Failed to update claim status",
      500,
      error.message
    );
  }
};
