import mongoose from "mongoose";
import Package from "../models/Package.js";
import Trip from "../models/Trip.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";
import { isMatch, calculateScore } from "../services/matchingService.js";

export const getPackageMatches = async (req, res) => {
  try {
    const { packageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(packageId)) {
      return errorResponse(res, "Invalid package id", 400);
    }

    const packageDoc = await Package.findById(packageId);
    if (!packageDoc) {
      return errorResponse(res, "Package not found", 404);
    }

    const isOwner = packageDoc.senderId.toString() === req.user.id;
    if (!isOwner && req.user.role !== "admin") {
      return errorResponse(res, "Not authorized to view matches for this package", 403);
    }

    if (packageDoc.status === "delivered" || packageDoc.status === "cancelled") {
      return successResponse(res, "Package is closed. No active matches.", {
        package: packageDoc,
        matchCount: 0,
        matches: [],
      });
    }

    const startDate = new Date(packageDoc.expectedDate);
    startDate.setDate(startDate.getDate() - 3);

    const endDate = new Date(packageDoc.expectedDate);
    endDate.setDate(endDate.getDate() + 3);

    const candidateTrips = await Trip.find({
      status: "open",
      travelerId: { $ne: packageDoc.senderId },
      availableCapacityKg: { $gte: packageDoc.weight },
      date: { $gte: startDate, $lte: endDate },
    }).populate("travelerId", "name email role rating totalReviews completedDeliveries");

    // Build response with traveler reputation stats (lightweight)
    const rankedMatches = candidateTrips
      .map((trip) => {
        const validation = isMatch(trip, packageDoc);
        const score = validation.isValid ? calculateScore(trip, packageDoc) : 0;

        return {
          trip,
          score,
          isGeographicallyValid: validation.isValid,
        };
      })
      .filter((match) => match.isGeographicallyValid && match.score >= 30)
      .map((match) => {
        // Build lightweight traveler data (no full reviews array)
        const tripData = match.trip.toObject();
        if (match.trip.travelerId) {
          tripData.travelerId = {
            _id: match.trip.travelerId._id,
            name: match.trip.travelerId.name,
            email: match.trip.travelerId.email,
            role: match.trip.travelerId.role,
            rating: match.trip.travelerId.rating || 0,
            totalReviews: match.trip.travelerId.totalReviews || 0,
            completedDeliveries: match.trip.travelerId.completedDeliveries || 0,
            // Note: reviews array NOT included
          };
        }
        return {
          trip: tripData,
          score: match.score,
        };
      })
      .sort((a, b) => b.score - a.score);

    return successResponse(res, "Matches fetched", {
      package: packageDoc,
      matchCount: rankedMatches.length,
      matches: rankedMatches,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch matches", 500, error.message);
  }
};
