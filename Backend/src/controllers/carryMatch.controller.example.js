/**
 * CONTROLLER USAGE EXAMPLE
 * 
 * Updated carryMatch.controller.js using consolidated matchingService
 */

import mongoose from "mongoose";
import Package from "../models/Package.js";
import Trip from "../models/Trip.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";
import {
  isMatch,
  calculateScore,
  getScoreBreakdown,
  getScoreLevel,
  MAX_DETOUR_KM,
} from "../services/matchingService.js";

/**
 * Get ranked matches for a package
 * Returns trips sorted by match score (highest first)
 */
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
      return errorResponse(
        res,
        "Not authorized to view matches for this package",
        403
      );
    }

    if (packageDoc.status === "delivered" || packageDoc.status === "cancelled") {
      return successResponse(res, "Package is closed. No active matches.", {
        package: packageDoc,
        matchCount: 0,
        matches: [],
      });
    }

    // Find candidate trips within ±3 days of expected delivery
    const startDate = new Date(packageDoc.expectedDate);
    startDate.setDate(startDate.getDate() - 3);

    const endDate = new Date(packageDoc.expectedDate);
    endDate.setDate(endDate.getDate() + 3);

    const candidateTrips = await Trip.find({
      status: "open",
      travelerId: { $ne: packageDoc.senderId },
      availableCapacityKg: { $gte: packageDoc.weight },
      date: { $gte: startDate, $lte: endDate },
    }).populate("travelerId", "name email role");

    // Validate matches and compute scores
    const rankedMatches = candidateTrips
      .map((trip) => {
        // Validate geographic distance
        const validation = isMatch(trip, packageDoc);

        // Calculate score
        const score = calculateScore(trip, packageDoc);

        return {
          trip,
          score,
          validation,
        };
      })
      .filter((match) => {
        // Filter by: valid geographic distance AND minimum score
        return match.validation.isValid && match.score >= 30;
      })
      .sort((a, b) => b.score - a.score);

    return successResponse(res, "Matches fetched", {
      package: packageDoc,
      matchCount: rankedMatches.length,
      matches: rankedMatches.map((m) => ({
        trip: m.trip,
        score: m.score,
      })),
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch matches", 500, error.message);
  }
};

/**
 * Get detailed match analysis
 * Returns matches with score breakdown and level
 */
export const getPackageMatchesDetailed = async (req, res) => {
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
      return errorResponse(
        res,
        "Not authorized to view matches for this package",
        403
      );
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
    }).populate("travelerId", "name email role");

    // Return detailed analysis
    const detailedMatches = candidateTrips
      .map((trip) => {
        const validation = isMatch(trip, packageDoc);
        const score = calculateScore(trip, packageDoc);
        const breakdown = getScoreBreakdown(trip, packageDoc);
        const level = getScoreLevel(score);

        return {
          trip,
          score,
          level,
          breakdown,
          distances: validation.distances,
          validationReason: validation.reason,
        };
      })
      .filter((m) => m.validationReason === null && m.score >= 30)
      .sort((a, b) => b.score - a.score);

    return successResponse(res, "Detailed matches fetched", {
      package: packageDoc,
      matchCount: detailedMatches.length,
      matches: detailedMatches,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch detailed matches", 500, error.message);
  }
};

/**
 * Check if a specific trip matches a package
 */
export const checkTripMatch = async (req, res) => {
  try {
    const { packageId, tripId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(packageId) ||
      !mongoose.Types.ObjectId.isValid(tripId)
    ) {
      return errorResponse(res, "Invalid package or trip id", 400);
    }

    const packageDoc = await Package.findById(packageId);
    const trip = await Trip.findById(tripId);

    if (!packageDoc || !trip) {
      return errorResponse(res, "Package or trip not found", 404);
    }

    const validation = isMatch(trip, packageDoc);
    const score = calculateScore(trip, packageDoc);
    const breakdown = getScoreBreakdown(trip, packageDoc);
    const level = getScoreLevel(score);

    return successResponse(res, "Match check completed", {
      isValid: validation.isValid,
      score,
      level,
      breakdown,
      distances: validation.distances,
      validationReason: validation.reason,
      maxDetourKm: MAX_DETOUR_KM,
    });
  } catch (error) {
    return errorResponse(res, "Failed to check trip match", 500, error.message);
  }
};
