import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import TrackingUpdate from "../models/TrackingUpdate.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";

const userCanAccessBooking = (booking, user) => {
  if (!booking || !user) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  return (
    booking.senderId.toString() === user.id ||
    booking.travelerId.toString() === user.id
  );
};

export const addTrackingUpdate = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { statusText, latitude, longitude } = req.body;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return errorResponse(res, "Invalid booking id", 400);
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return errorResponse(res, "Booking not found", 404);
    }

    if (!userCanAccessBooking(booking, req.user)) {
      return errorResponse(res, "Not authorized for this booking", 403);
    }

    const update = await TrackingUpdate.create({
      bookingId,
      updatedBy: req.user.id,
      statusText: statusText || "Tracking updated",
      latitude:
        latitude === undefined || latitude === null || latitude === ""
          ? null
          : Number(latitude),
      longitude:
        longitude === undefined || longitude === null || longitude === ""
          ? null
          : Number(longitude),
    });

    return successResponse(res, "Tracking updated", update, 201);
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return errorResponse(res, "Invalid tracking payload", 400, error.message);
    }

    return errorResponse(res, "Failed to update tracking", 500, error.message);
  }
};

export const getTrackingHistory = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return errorResponse(res, "Invalid booking id", 400);
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return errorResponse(res, "Booking not found", 404);
    }

    if (!userCanAccessBooking(booking, req.user)) {
      return errorResponse(res, "Not authorized for this booking", 403);
    }

    const updates = await TrackingUpdate.find({ bookingId })
      .sort({ createdAt: -1 })
      .limit(100);

    return successResponse(res, "Tracking history fetched", updates);
  } catch (error) {
    return errorResponse(res, "Failed to fetch tracking history", 500, error.message);
  }
};

export const streamTracking = async (req, res) => {
  const { bookingId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return errorResponse(res, "Invalid booking id", 400);
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return errorResponse(res, "Booking not found", 404);
  }

  if (!userCanAccessBooking(booking, req.user)) {
    return errorResponse(res, "Not authorized for this booking", 403);
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = async () => {
    const latest = await TrackingUpdate.findOne({ bookingId }).sort({ createdAt: -1 });
    res.write(`data: ${JSON.stringify({ bookingId, latest, timestamp: Date.now() })}\n\n`);
  };

  await sendEvent();

  const interval = setInterval(async () => {
    await sendEvent();
  }, 15000);

  req.on("close", () => {
    clearInterval(interval);
    res.end();
  });
};
