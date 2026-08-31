import { getDistance } from "../utils/distance.js";

/**
 * Calculate match score between a trip and a package based on multiple factors
 * 
 * @param {Object} trip - Trip document with source, destination, date, availableCapacityKg
 * @param {Object} pkg - Package document with pickupLocation, dropLocation, expectedDate, weight
 * @returns {number} Total match score (0-100+)
 * 
 * @example
 * const score = calculateScore(trip, package);
 * if (score >= 70) console.log("Strong match");
 */
export const calculateScore = (trip, pkg) => {
  let score = 0;

  // ============== DISTANCE SCORING ==============
  // Calculate pickup location distance score
  const pickupScore = calculateDistanceScore(
    pkg?.pickupLocation,
    trip?.source,
    "pickup"
  );
  score += pickupScore;

  // Calculate drop location distance score
  const dropScore = calculateDistanceScore(
    pkg?.dropLocation,
    trip?.destination,
    "drop"
  );
  score += dropScore;

  // ============== CAPACITY BONUS ==============
  // Add bonus if trip has sufficient capacity
  if (trip?.availableCapacityKg >= pkg?.weight) {
    score += 20;
  }

  // ============== DATE BONUS ==============
  // Add bonus if trip date matches package expected date (same day)
  if (isSameDay(trip?.date, pkg?.expectedDate)) {
    score += 30;
  }

  return Math.max(0, Math.round(score));
};

/**
 * Calculate distance-based score for a location pair
 * Closer distance = higher score, capped at 25 points
 * 
 * @param {Object} packageLocation - Package location with lat, lng, city
 * @param {Object} tripLocation - Trip location with lat, lng, city
 * @param {string} locationType - "pickup" or "drop" (for error context)
 * @returns {number} Distance score (0-25)
 * @private
 */
const calculateDistanceScore = (packageLocation, tripLocation, locationType) => {
  // Validate coordinates exist
  if (
    !packageLocation?.lat ||
    !packageLocation?.lng ||
    !tripLocation?.lat ||
    !tripLocation?.lng
  ) {
    return 0;
  }

  try {
    const distance = getDistance(
      packageLocation.lat,
      packageLocation.lng,
      tripLocation.lat,
      tripLocation.lng
    );

    // Scoring algorithm:
    // 0-2 km: 25 points (perfect)
    // 2-5 km: 20-25 points
    // 5-10 km: 15-20 points
    // 10-20 km: 5-15 points
    // 20+ km: 0-5 points

    if (distance <= 2) {
      return 25;
    }

    if (distance <= 5) {
      return 20 + (5 - distance) * 1; // 20-25
    }

    if (distance <= 10) {
      return 15 + Math.max(0, (10 - distance) * 1); // 15-20
    }

    if (distance <= 20) {
      return Math.max(5, (20 - distance) * 0.5); // 5-15
    }

    return Math.max(0, Math.min(5, (50 - distance) * 0.1)); // 0-5 for very far distances
  } catch (error) {
    // Fallback: return 0 if distance calculation fails
    console.error(`Error calculating ${locationType} distance:`, error.message);
    return 0;
  }
};

/**
 * Check if two dates are on the same calendar day
 * 
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {boolean} True if both dates fall on the same day
 * @private
 */
const isSameDay = (date1, date2) => {
  if (!date1 || !date2) {
    return false;
  }

  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  } catch (error) {
    return false;
  }
};

/**
 * Get score breakdown/details for debugging or display
 * 
 * @param {Object} trip - Trip document
 * @param {Object} pkg - Package document
 * @returns {Object} Score breakdown with component scores
 * 
 * @example
 * const breakdown = getScoreBreakdown(trip, package);
 * console.log(breakdown);
 * // {
 * //   pickupScore: 25,
 * //   dropScore: 18,
 * //   capacityBonus: 20,
 * //   dateBonus: 30,
 * //   total: 93
 * // }
 */
export const getScoreBreakdown = (trip, pkg) => {
  const pickupScore = calculateDistanceScore(
    pkg?.pickupLocation,
    trip?.source,
    "pickup"
  );

  const dropScore = calculateDistanceScore(
    pkg?.dropLocation,
    trip?.destination,
    "drop"
  );

  const capacityBonus = trip?.availableCapacityKg >= pkg?.weight ? 20 : 0;
  const dateBonus = isSameDay(trip?.date, pkg?.expectedDate) ? 30 : 0;

  const total = Math.max(0, Math.round(pickupScore + dropScore + capacityBonus + dateBonus));

  return {
    pickupScore: Math.round(pickupScore),
    dropScore: Math.round(dropScore),
    capacityBonus,
    dateBonus,
    total,
  };
};

/**
 * Score interpretation helper
 * 
 * @param {number} score - Score value
 * @returns {Object} { level: string, description: string }
 */
export const getScoreLevel = (score) => {
  if (score >= 90) {
    return { level: "Excellent", description: "Strong match, high priority" };
  }

  if (score >= 70) {
    return { level: "Good", description: "Solid match, recommended" };
  }

  if (score >= 50) {
    return { level: "Fair", description: "Acceptable match, consider others" };
  }

  if (score >= 30) {
    return { level: "Poor", description: "Weak match, lower priority" };
  }

  return { level: "Not Viable", description: "Insufficient match" };
};
