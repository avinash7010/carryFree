import FoundItem from "../models/FoundItem.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import { notifyMatchesForFoundItem } from "../services/lostFoundMatchNotification.service.js";
import { uploadImage } from "../config/cloudinary.js";

export const createFoundItem = async (req, res) => {
  try {
    const { title, description, category, location, dateFound } = req.body;

    if (!title || !description || !category || !location || !dateFound) {
      return errorResponse(
        res,
        "title, description, category, location, and dateFound are required",
        400
      );
    }

    let imageUrl = req.body.image || undefined;

    if (req.file) {
      imageUrl = await uploadImage(req.file.buffer, "carryfree/found-items");
    }

    const foundItem = await FoundItem.create({
      ...req.body,
      image: imageUrl,
      createdBy: req.user.id,
    });

    void notifyMatchesForFoundItem(foundItem);

    return successResponse(
      res,
      "Found item created successfully",
      foundItem,
      201
    );
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return errorResponse(res, "Invalid found item payload", 400, error.message);
    }

    return errorResponse(res, "Failed to create found item", 500, error.message);
  }
};

export const getAllFoundItems = async (req, res) => {
  try {
    const items = await FoundItem.find({ status: "found" })
      .populate("createdBy", "name email role rating totalReviews completedDeliveries")
      .sort({ createdAt: -1 });

    return successResponse(res, "Found items fetched", items);
  } catch (error) {
    return errorResponse(res, "Failed to fetch found items", 500, error.message);
  }
};

export const getMyFoundItems = async (req, res) => {
  try {
    const items = await FoundItem.find({ createdBy: req.user.id }).sort({
      createdAt: -1,
    });

    return successResponse(res, "Your found items fetched", items);
  } catch (error) {
    return errorResponse(
      res,
      "Failed to fetch your found items",
      500,
      error.message
    );
  }
};
