import LostItem from "../models/LostItem.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

export const createLostItem = async (req, res) => {
  try {
    const lostItem = await LostItem.create({
      ...req.body,
      createdBy: req.user.id,
    });

    return successResponse(
      res,
      "Lost item created successfully",
      lostItem,
      201
    );
  } catch (error) {
    return errorResponse(res, "Failed to create lost item", 500, error.message);
  }
};

export const getAllLostItems = async (req, res) => {
  try {
    const items = await LostItem.find()
      .populate("createdBy", "name email")
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
