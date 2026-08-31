/**
 * Consolidated Matching Service
 * 
 * Centralized service for all matching logic including:
 * - Geographic distance calculations
 * - Match validation
 * - Score calculations
 */

// Constants
const MAX_DETOUR_KM = 20;
const EARTH_RADIUS_KM = 6371;

/**
 * ============== DISTANCE UTILITIES ==============
 */

/**
 * Calculate the great-circle distance between two points on Earth
 * using the Haversine formula
 * 
 * @param {number} lat1 - Latitude of first point in degrees
 * @param {number} lon1 - Longitude of first point in degrees
 * @param {number} lat2 - Latitude of second point in degrees
 * @param {number} lon2 - Longitude of second point in degrees
 * @returns {number} Distance between the two points in kilometers
 * @throws {Error} If coordinates are invalid
 * 
 * @example
 * const distance = getDistance(40.7128, -74.0060, 51.5074, -0.1278);
 * console.log(distance); // ~5570 km (NYC to London)
 */
const getDistance = (lat1, lon1, lat2, lon2) => {
  // Validate input parameters
  if (
    typeof lat1 !== "number" ||
    typeof lon1 !== "number" ||
    typeof lat2 !== "number" ||
    typeof lon2 !== "number"
  ) {
    throw new Error("All coordinates must be numbers");
  }

  if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) {
    throw new Error("Latitude values must be between -90 and 90 degrees");
  }

  if (lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) {
    throw new Error("Longitude values must be between -180 and 180 degrees");
  }

  // Convert degrees to radians
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  // Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) *
      Math.sin(dLon / 2) *
      Math.cos(lat1Rad) *
      Math.cos(lat2Rad);

  const c = 2 * Math.asin(Math.sqrt(a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100;
};

/**
 * Check if two locations are within a specified radius
 * 
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @param {number} radiusKm - Radius in kilometers
 * @returns {boolean} True if distance is within radius
 */
const isWithinRadius = (lat1, lon1, lat2, lon2, radiusKm) => {
  try {
    const distance = getDistance(lat1, lon1, lat2, lon2);
    return distance <= radiusKm;
  } catch (error) {
    return false;
  }
};

/**
 * ============== MATCHING VALIDATION ==============
 */

/**
 * Check if a trip is a valid match for a package
 * A match is valid if:
 * - Pickup location is within MAX_DETOUR_KM of trip source
 * - Drop location is within MAX_DETOUR_KM of trip destination
 * 
 * @param {Object} trip - Trip document with source and destination
 * @param {Object} pkg - Package document with pickupLocation and dropLocation
 * @returns {Object} { isValid: boolean, reason: string|null, distances: { pickup: number, drop: number }|null }
 * 
 * @example
 * const validation = isMatch(trip, package);
 * if (validation.isValid) {
 *   console.log("Match found");
 * } else {
 *   console.log("Reason:", validation.reason);
 * }
 */
const isMatch = (trip, pkg) => {
  // Check if all required coordinate fields exist
  const hasPackageCoords =
    pkg?.pickupLocation?.lat !== undefined &&
    pkg?.pickupLocation?.lng !== undefined &&
    pkg?.dropLocation?.lat !== undefined &&
    pkg?.dropLocation?.lng !== undefined;

  const hasTripCoords =
    trip?.source?.lat !== undefined &&
    trip?.source?.lng !== undefined &&
    trip?.destination?.lat !== undefined &&
    trip?.destination?.lng !== undefined;

  // If coordinates missing, we can't validate
  if (!hasPackageCoords || !hasTripCoords) {
    return {
      isValid: false,
      reason: "Missing coordinates for package or trip",
      distances: null,
    };
  }

  try {
    const pickupDistance = getDistance(
      pkg.pickupLocation.lat,
      pkg.pickupLocation.lng,
      trip.source.lat,
      trip.source.lng
    );

    const dropDistance = getDistance(
      pkg.dropLocation.lat,
      pkg.dropLocation.lng,
      trip.destination.lat,
      trip.destination.lng
    );

    if (pickupDistance > MAX_DETOUR_KM) {
      return {
        isValid: false,
        reason: `Pickup location is ${pickupDistance}km away (max: ${MAX_DETOUR_KM}km)`,
        distances: { pickup: pickupDistance, drop: dropDistance },
      };
    }

    if (dropDistance > MAX_DETOUR_KM) {
      return {
        isValid: false,
        reason: `Drop location is ${dropDistance}km away (max: ${MAX_DETOUR_KM}km)`,
        distances: { pickup: pickupDistance, drop: dropDistance },
      };
    }

    return {
      isValid: true,
      reason: null,
      distances: { pickup: pickupDistance, drop: dropDistance },
    };
  } catch (error) {
    console.error("Error validating match:", error.message);
    return {
      isValid: false,
      reason: "Failed to validate geographic distance",
      distances: null,
    };
  }
};

/**
 * ============== SCORING UTILITIES ==============
 */

/**
 * Calculate trust score boost based on traveler reputation
 * 
 * @param {Object} traveler - Traveler object with rating and completedDeliveries
 * @returns {number} Trust bonus (0-45 points max)
 * 
 * Calculation:
 * - Rating: 0-5 stars × 5 = 0-25 points
 * - Completed deliveries: capped at 100, × 0.2 = 0-20 points
 * - Maximum total: 45 points (doesn't overpower distance scoring)
 * 
 * This keeps trust as a secondary factor while maintaining geographic
 * and logistic factors as primary matching criteria.
 * @private
 */
const calculateTrustScore = (traveler) => {
  if (!traveler) return 0;

  let trustScore = 0;

  // Rating weight: higher rating = higher bonus (max 25 points for 5-star rating)
  const ratingBonus = (traveler.rating || 0) * 5;
  trustScore += ratingBonus;

  // Completed deliveries bonus: rewards experienced travelers
  // Capped at 100 deliveries for 20 points (diminishing returns after that)
  const deliveryBonus = Math.min(traveler.completedDeliveries || 0, 100) * 0.2;
  trustScore += deliveryBonus;

  return Math.round(trustScore);
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
    packageLocation?.lat === undefined ||
    packageLocation?.lat === null ||
    packageLocation?.lng === undefined ||
    packageLocation?.lng === null ||
    tripLocation?.lat === undefined ||
    tripLocation?.lat === null ||
    tripLocation?.lng === undefined ||
    tripLocation?.lng === null
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
    console.error(`Error calculating ${locationType} distance:`, error.message);
    return 0;
  }
};

/**
 * Calculate match score between a trip and a package
 * 
 * @param {Object} trip - Trip document with source, destination, date, availableCapacityKg
 * @param {Object} pkg - Package document with pickupLocation, dropLocation, expectedDate, weight
 * @returns {number} Total match score (0-100+)
 * 
 * Scoring factors:
 * - Pickup distance: 0-25 points
 * - Drop distance: 0-25 points
 * - Capacity match: 0-20 points
 * - Date match: 0-30 points
 * Total: 0-100+ points
 * 
 * @example
 * const score = calculateScore(trip, package);
 * if (score >= 70) console.log("Strong match");
 */
const calculateScore = (trip, pkg) => {
  let score = 0;

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

  // Add bonus if trip has sufficient capacity
  if (trip?.availableCapacityKg >= pkg?.weight) {
    score += 20;
  }

  // Add bonus if trip date matches package expected date (same day)
  if (isSameDay(trip?.date, pkg?.expectedDate)) {
    score += 30;
  }


  // Add trust factor: reward reliable travelers with high ratings & experience
  const traveler = trip?.travelerId;
  if (traveler) {
    const trustBonus = calculateTrustScore(traveler);
    score += trustBonus;
  }

  return Math.max(0, Math.round(score));
};

/**
 * Get score breakdown for debugging or display
 * 
 * @param {Object} trip - Trip document
 * @param {Object} pkg - Package document
 * @returns {Object} Score breakdown with component scores
 * 
 * @example
 * const breakdown = getScoreBreakdown(trip, package);
 * // { pickupScore: 25, dropScore: 18, capacityBonus: 20, dateBonus: 30, total: 93 }
 */
const getScoreBreakdown = (trip, pkg) => {
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


  // Include trust score in breakdown
  const traveler = trip?.travelerId;
  const trustBonus = traveler ? calculateTrustScore(traveler) : 0;

  const total = Math.max(
    0,
    Math.round(pickupScore + dropScore + capacityBonus + dateBonus + trustBonus)
  );

  return {
    pickupScore: Math.round(pickupScore),
    dropScore: Math.round(dropScore),
    capacityBonus,
    dateBonus,
    trustBonus,
    total,
  };
};

/**
 * Get score level interpretation
 * 
 * @param {number} score - Score value
 * @returns {Object} { level: string, description: string }
 */
const getScoreLevel = (score) => {
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

/**
 * ============== EXPORTS ==============
 */

export {
  // Distance utilities
  getDistance,
  isWithinRadius,
  // Match validation
  isMatch,
  // Scoring utilities
  calculateScore,
  getScoreBreakdown,
  getScoreLevel,
  // Constants (for external reference if needed)
  MAX_DETOUR_KM,
  EARTH_RADIUS_KM,
};
