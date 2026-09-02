import LostItem from "../models/LostItem.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import { notifyMatchesForLostItem } from "../services/lostFoundMatchNotification.service.js";
import { uploadImage } from "../config/cloudinary.js";

export const createLostItem = async (req, res) => {
  try {
    const { title, description, category, location, dateLost } = req.body;

    if (!title || !description || !category || !location || !dateLost) {
      return errorResponse(
        res,
        "title, description, category, location, and dateLost are required",
        400
      );
    }

    let imageUrl = req.body.image || undefined;

    if (req.file) {
      imageUrl = await uploadImage(req.file.buffer, "carryfree/lost-items");
    }

    const lostItem = await LostItem.create({
      ...req.body,
      image: imageUrl,
      createdBy: req.user.id,
    });

    void notifyMatchesForLostItem(lostItem);

    return successResponse(
      res,
      "Lost item created successfully",
      lostItem,
      201
    );
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return errorResponse(res, "Invalid lost item payload", 400, error.message);
    }

    return errorResponse(res, "Failed to create lost item", 500, error.message);
  }
};

export const getAllLostItems = async (req, res) => {
  try {
    const items = await LostItem.find({ status: "lost" })
      .populate("createdBy", "name email role rating totalReviews completedDeliveries")
      .sort({ createdAt: -1 });

    return successResponse(res, "Lost items fetched", items);
  } catch (error) {
    return errorResponse(res, "Failed to fetch lost items", 500, error.message);
  }
};

export const getMyLostItems = async (req, res) => {
  try {
    const items = await LostItem.find({ createdBy: req.user.id }).sort({
      createdAt: -1,
    });

    return successResponse(res, "Your lost items fetched", items);
  } catch (error) {
    return errorResponse(res, "Failed to fetch your lost items", 500, error.message);
  }
};
