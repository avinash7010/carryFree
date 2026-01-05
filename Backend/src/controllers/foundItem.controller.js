import FoundItem from "../models/FoundItem.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

export const createFoundItem = async (req, res) => {
  try {
    const foundItem = await FoundItem.create({
      ...req.body,
      createdBy: req.user.id,
    });

    return successResponse(
      res,
      "Found item created successfully",
      foundItem,
      201
    );
  } catch (error) {
    return errorResponse(res, "Failed to create found item", 500, error.message);
  }
};

export const getAllFoundItems = async (req, res) => {
  try {
    const items = await FoundItem.find()
      .populate("createdBy", "name email")
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
