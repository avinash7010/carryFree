import mongoose from "mongoose";
import Trip from "../models/Trip.js";
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

export const createTrip = async (req, res) => {
  try {
    if (!["traveler", "user", "admin"].includes(req.user.role)) {
      return errorResponse(res, "Only travelers can post trips", 403);
    }

    const { source, destination, date, capacityKg, notes } = req.body;

    if (!source || !destination || !date || !capacityKg) {
      return errorResponse(res, "source, destination, date and capacityKg are required", 400);
    }

    const sourceError = validateLocationObject(source, "source");
    if (sourceError) {
      return errorResponse(res, sourceError, 400);
    }

    const destinationError = validateLocationObject(destination, "destination");
    if (destinationError) {
      return errorResponse(res, destinationError, 400);
    }

    const numericCapacity = Number(capacityKg);
    if (!Number.isFinite(numericCapacity) || numericCapacity <= 0) {
      return errorResponse(res, "capacityKg must be a positive number", 400);
    }

    const trip = await Trip.create({
      travelerId: req.user.id,
      source,
      destination,
      date,
      capacityKg: numericCapacity,
      availableCapacityKg: numericCapacity,
      notes,
    });

    return successResponse(res, "Trip posted successfully", trip, 201);
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return errorResponse(res, "Invalid trip payload", 400, error.message);
    }

    return errorResponse(res, "Failed to post trip", 500, error.message);
  }
};

export const getTripById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, "Invalid trip id", 400);
    }

    const trip = await Trip.findById(id)
      .select("source destination date availableCapacityKg capacityKg status travelerId notes")
      .populate("travelerId", "name email role rating totalReviews completedDeliveries");

    if (!trip) {
      return errorResponse(res, "Trip not found", 404);
    }

    return successResponse(res, "Trip fetched", trip);
  } catch (error) {
    return errorResponse(res, "Failed to fetch trip", 500, error.message);
  }
};

export const getMyTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ travelerId: req.user.id })
      .sort({ createdAt: -1 })
      .populate("travelerId", "name email role rating totalReviews completedDeliveries");
    return successResponse(res, "Trips fetched", trips);
  } catch (error) {
    return errorResponse(res, "Failed to fetch trips", 500, error.message);
  }
};

export const getOpenTrips = async (req, res) => {
  try {
    const minCapacity = req.query.minCapacity ? Number(req.query.minCapacity) : 0;
    const date = req.query.date ? new Date(req.query.date) : null;

    const filters = {
      status: "open",
      availableCapacityKg: { $gte: Number.isFinite(minCapacity) ? minCapacity : 0 },
    };

    if (date && !Number.isNaN(date.getTime())) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      filters.date = { $gte: start, $lte: end };
    }

    const trips = await Trip.find(filters)
      .sort({ date: 1 })
      .select("source destination date availableCapacityKg capacityKg status travelerId")
      .populate("travelerId", "name email role rating totalReviews completedDeliveries");

    return successResponse(res, "Open trips fetched", trips);
  } catch (error) {
    return errorResponse(res, "Failed to fetch trips", 500, error.message);
  }
};
