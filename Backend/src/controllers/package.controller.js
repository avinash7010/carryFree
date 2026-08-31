import mongoose from "mongoose";
import Package from "../models/Package.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";

const validateLocationObject = (location, fieldName) => {
  if (!location) {
    return `${fieldName} is required`;
  }

  if (typeof location !== "object" || Array.isArray(location)) {
    return `${fieldName} must be an object`;
  }

  const { city, lat, lng } = location;

  if (!city || typeof city !== "string" || city.trim() === "") {
    return `${fieldName}.city is required and must be a non-empty string`;
  }

  if (lat === undefined || lat === null) {
    return `${fieldName}.lat is required`;
  }

  if (!Number.isFinite(lat)) {
    return `${fieldName}.lat must be a valid number`;
  }

  if (lat < -90 || lat > 90) {
    return `${fieldName}.lat must be between -90 and 90`;
  }

  if (lng === undefined || lng === null) {
    return `${fieldName}.lng is required`;
  }

  if (!Number.isFinite(lng)) {
    return `${fieldName}.lng must be a valid number`;
  }

  if (lng < -180 || lng > 180) {
    return `${fieldName}.lng must be between -180 and 180`;
  }

  return null;
};

export const createPackage = async (req, res) => {
  try {
    if (!["sender", "user", "admin"].includes(req.user.role)) {
      return errorResponse(res, "Only senders can post packages", 403);
    }

    const {
      pickupLocation,
      dropLocation,
      expectedDate,
      weight,
      description,
      receiverName,
      receiverPhone,
      paymentAmount,
    } = req.body;

    if (!pickupLocation || !dropLocation || !expectedDate || !weight) {
      return errorResponse(
        res,
        "pickupLocation, dropLocation, expectedDate and weight are required",
        400
      );
    }

    const pickupLocationError = validateLocationObject(pickupLocation, "pickupLocation");
    if (pickupLocationError) {
      return errorResponse(res, pickupLocationError, 400);
    }

    const dropLocationError = validateLocationObject(dropLocation, "dropLocation");
    if (dropLocationError) {
      return errorResponse(res, dropLocationError, 400);
    }

    const numericWeight = Number(weight);
    if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
      return errorResponse(res, "weight must be a positive number", 400);
    }

    const packageDoc = await Package.create({
      senderId: req.user.id,
      pickupLocation,
      dropLocation,
      expectedDate,
      weight: numericWeight,
      description,
      receiverName,
      receiverPhone,
      paymentAmount: Number(paymentAmount) > 0 ? Number(paymentAmount) : 0,
    });

    return successResponse(res, "Package posted successfully", packageDoc, 201);
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return errorResponse(res, "Invalid package payload", 400, error.message);
    }

    return errorResponse(res, "Failed to post package", 500, error.message);
  }
};

export const getMyPackages = async (req, res) => {
  try {
    const packages = await Package.find({ senderId: req.user.id })
      .sort({ createdAt: -1 })
      .populate({
        path: "matchedTrip",
        select: "source destination date capacityKg availableCapacityKg status travelerId",
        populate: {
          path: "travelerId",
          select: "name email role rating totalReviews completedDeliveries"
        }
      });

    return successResponse(res, "Packages fetched", packages);
  } catch (error) {
    return errorResponse(res, "Failed to fetch packages", 500, error.message);
  }
};

export const getAllPackages = async (req, res) => {
  try {
    const filters = {};

    if (req.query.status) {
      filters.status = req.query.status;
    }

    const packages = await Package.find(filters)
      .sort({ createdAt: -1 })
      .select("pickupLocation dropLocation expectedDate weight status paymentStatus createdAt matchedTrip senderId")
      .populate({
        path: "matchedTrip",
        select: "source destination date capacityKg availableCapacityKg status travelerId",
        populate: {
          path: "travelerId",
          select: "name email role rating totalReviews completedDeliveries"
        }
      })
      .populate("senderId", "name email role rating completedDeliveries");

    return successResponse(res, "Packages fetched", packages);
  } catch (error) {
    return errorResponse(res, "Failed to fetch packages", 500, error.message);
  }
};

export const updatePackageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, "Invalid package id", 400);
    }

    if (!status) {
      return errorResponse(res, "status is required", 400);
    }

    const allowedStatuses = ["pending", "matched", "in-transit", "delivered", "cancelled"];
    if (!allowedStatuses.includes(status)) {
      return errorResponse(res, "Invalid status value", 400);
    }

    const packageDoc = await Package.findById(id);
    if (!packageDoc) {
      return errorResponse(res, "Package not found", 404);
    }

    const isOwner = packageDoc.senderId.toString() === req.user.id;
    if (!isOwner && req.user.role !== "admin") {
      return errorResponse(res, "Not authorized to update this package", 403);
    }

    packageDoc.status = status;
    await packageDoc.save();

    return successResponse(res, "Package status updated", packageDoc);
  } catch (error) {
    return errorResponse(res, "Failed to update package status", 500, error.message);
  }
};
