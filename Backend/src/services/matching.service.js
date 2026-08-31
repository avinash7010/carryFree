import { getDistance } from "../utils/distance.js";

// Maximum acceptable detour distance in kilometers
const MAX_DETOUR_KM = 20;

const STOP_WORDS = new Set([
  "road",
  "rd",
  "street",
  "st",
  "avenue",
  "ave",
  "lane",
  "ln",
  "near",
  "to",
  "from",
  "the",
]);

const LOCATION_ALIASES = {
  bengaluru: "bangalore",
  bengalore: "bangalore",
  bombay: "mumbai",
  delhi: "new delhi",
  madras: "chennai",
  calcutta: "kolkata",
};

const normalize = (value = "") =>
  value
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=+_`~()]/g, " ")
    .replace(/\s+/g, " ");

const canonicalize = (value = "") =>
  normalize(value)
    .split(" ")
    .map((token) => LOCATION_ALIASES[token] || token)
    .join(" ");

const tokenize = (value = "") =>
  canonicalize(value)
    .split(" ")
    .filter((token) => token && !STOP_WORDS.has(token));

const levenshteinDistance = (a, b) => {
  if (!a) {
    return b.length;
  }

  if (!b) {
    return a.length;
  }

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j < cols; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
};

const levenshteinSimilarity = (a, b) => {
  if (!a || !b) {
    return 0;
  }

  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) {
    return 1;
  }

  return 1 - levenshteinDistance(a, b) / maxLen;
};

const clamp01 = (value) => Math.max(0, Math.min(1, value));

const toCoords = (value) => {
  if (!value) {
    return null;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    Number.isFinite(Number(value.lat)) &&
    Number.isFinite(Number(value.lng))
  ) {
    return { lat: Number(value.lat), lng: Number(value.lng) };
  }

  if (Array.isArray(value) && value.length === 2) {
    const [lat, lng] = value;
    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      return { lat: Number(lat), lng: Number(lng) };
    }
  }

  return null;
};

const geoDistanceKm = (a, b) => {
  const left = toCoords(a);
  const right = toCoords(b);

  if (!left || !right) {
    return null;
  }

  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(right.lat - left.lat);
  const dLng = toRad(right.lng - left.lng);

  const lat1 = toRad(left.lat);
  const lat2 = toRad(right.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const geoSimilarity = (a, b) => {
  const distance = geoDistanceKm(a, b);
  if (distance === null) {
    return null;
  }

  if (distance <= 5) {
    return 1;
  }

  if (distance >= 120) {
    return 0;
  }

  return clamp01(1 - (distance - 5) / 115);
};

const diceCoefficient = (a, b) => {
  if (!a || !b) {
    return 0;
  }

  if (a === b) {
    return 1;
  }

  const bigrams = (text) => {
    const grams = [];
    for (let i = 0; i < text.length - 1; i += 1) {
      grams.push(text.slice(i, i + 2));
    }
    return grams;
  };

  const aGrams = bigrams(a);
  const bGrams = bigrams(b);

  if (aGrams.length === 0 || bGrams.length === 0) {
    return 0;
  }

  const counts = new Map();
  for (const gram of aGrams) {
    counts.set(gram, (counts.get(gram) || 0) + 1);
  }

  let overlap = 0;
  for (const gram of bGrams) {
    const available = counts.get(gram) || 0;
    if (available > 0) {
      overlap += 1;
      counts.set(gram, available - 1);
    }
  }

  return (2 * overlap) / (aGrams.length + bGrams.length);
};

/**
 * Validate if package pickup/drop locations are within acceptable distance
 * from trip source/destination using geographic coordinates
 * 
 * @param {Object} packageDoc - Package document with pickup/drop locations
 * @param {Object} trip - Trip document with source/destination
 * @returns {Object} { isValid: boolean, reason: string }
 */
const validateGeographicDistance = (packageDoc, trip) => {
  // Check if all required coordinate fields exist
  const hasPackageCoords =
    packageDoc?.pickupLocation?.lat !== undefined &&
    packageDoc?.pickupLocation?.lng !== undefined &&
    packageDoc?.dropLocation?.lat !== undefined &&
    packageDoc?.dropLocation?.lng !== undefined;

  const hasTripCoords =
    trip?.source?.lat !== undefined &&
    trip?.source?.lng !== undefined &&
    trip?.destination?.lat !== undefined &&
    trip?.destination?.lng !== undefined;

  // If coordinates available, validate geographic distance
  if (hasPackageCoords && hasTripCoords) {
    try {
      const pickupDistance = getDistance(
        packageDoc.pickupLocation.lat,
        packageDoc.pickupLocation.lng,
        trip.source.lat,
        trip.source.lng
      );

      const dropoffDistance = getDistance(
        packageDoc.dropLocation.lat,
        packageDoc.dropLocation.lng,
        trip.destination.lat,
        trip.destination.lng
      );

      if (pickupDistance > MAX_DETOUR_KM) {
        return {
          isValid: false,
          reason: `Pickup location is ${pickupDistance}km away (max: ${MAX_DETOUR_KM}km)`,
        };
      }

      if (dropoffDistance > MAX_DETOUR_KM) {
        return {
          isValid: false,
          reason: `Drop location is ${dropoffDistance}km away (max: ${MAX_DETOUR_KM}km)`,
        };
      }

      return { isValid: true, reason: null };
    } catch (error) {
      // Fall back to string matching if distance calculation fails
      return { isValid: true, reason: null };
    }
  }

  // If no coordinates available, allow validation to pass
  // (existing string-based matching will handle it)
  return { isValid: true, reason: null };
};

const jaccard = (leftTokens, rightTokens) => {
  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return 0;
  }

  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);

  const intersectionSize = [...leftSet].filter((token) => rightSet.has(token)).length;
  const unionSize = new Set([...leftSet, ...rightSet]).size;

  return unionSize === 0 ? 0 : intersectionSize / unionSize;
};

export const getLocationSimilarity = (a, b) => {
  const left = canonicalize(a);
  const right = canonicalize(b);

  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  if (left.includes(right) || right.includes(left)) {
    return 0.88;
  }

  const tokenSimilarity = jaccard(tokenize(left), tokenize(right));
  const textSimilarity = diceCoefficient(left, right);
  const editSimilarity = levenshteinSimilarity(left, right);
  const composite = tokenSimilarity * 0.45 + textSimilarity * 0.35 + editSimilarity * 0.2;

  return clamp01(Math.max(composite, tokenSimilarity * 0.85));
};

export const getDateScore = (packageDate, tripDate, maxDaysWindow = 4) => {
  if (!packageDate || !tripDate) {
    return 0;
  }

  const oneDayMs = 1000 * 60 * 60 * 24;
  const diffDays = Math.abs(new Date(packageDate) - new Date(tripDate)) / oneDayMs;

  if (Number.isNaN(diffDays)) {
    return 0;
  }

  if (diffDays > maxDaysWindow) {
    return 0;
  }

  if (diffDays <= 0.25) {
    return 1;
  }

  if (diffDays <= 1) {
    return 0.72;
  }

  if (diffDays <= 2) {
    return 0.42;
  }

  return 0.18;
};

export const getCapacityScore = (weight, availableCapacityKg) => {
  if (!Number.isFinite(Number(weight)) || !Number.isFinite(Number(availableCapacityKg))) {
    return 0;
  }

  const safeWeight = Number(weight);
  const safeCapacity = Number(availableCapacityKg);

  if (safeCapacity < safeWeight || safeWeight <= 0) {
    return 0;
  }

  const headroomRatio = safeCapacity / Math.max(safeWeight, 0.1);

  if (headroomRatio <= 1.05) {
    return 0.4;
  }

  if (headroomRatio <= 1.2) {
    return 0.6;
  }

  if (headroomRatio <= 2) {
    return 0.82;
  }

  if (headroomRatio <= 3.5) {
    return 0.93;
  }

  return 1;
};

const getConfidence = (score) => {
  if (score >= 80) {
    return "High";
  }

  if (score >= 55) {
    return "Medium";
  }

  return "Low";
};

const toPercent = (value) => Math.round(clamp01(value) * 100);

export const scoreTripForPackage = (packageDoc, trip) => {
  // Geographic distance validation - early filter
  const geoValidation = validateGeographicDistance(packageDoc, trip);
  if (!geoValidation.isValid) {
    return {
      score: 0,
      confidence: "Low",
      explanation: [geoValidation.reason, "Geographic distance exceeds acceptable detour limit."],
      breakdown: {
        locationScore: 0,
        dateScore: 0,
        capacityScore: 0,
      },
      reasons: {
        route: 0,
        date: 0,
        capacity: 0,
        pickupSimilarity: 0,
        dropSimilarity: 0,
        reverseRouteRisk: 0,
        geographicDistance: geoValidation.reason,
      },
    };
  }

  const packagePickup = packageDoc?.pickupLocation?.city || packageDoc?.pickupLocation || "";
  const packageDrop = packageDoc?.dropLocation?.city || packageDoc?.dropLocation || "";
  const tripSource = trip?.source?.city || trip?.source || "";
  const tripDestination = trip?.destination?.city || trip?.destination || "";

  const pickupSimilarity = getLocationSimilarity(packagePickup, tripSource);
  const dropSimilarity = getLocationSimilarity(packageDrop, tripDestination);

  const reversePickupSimilarity = getLocationSimilarity(packagePickup, tripDestination);
  const reverseDropSimilarity = getLocationSimilarity(packageDrop, tripSource);
  const reverseStrength = (reversePickupSimilarity + reverseDropSimilarity) / 2;

  const pickupGeo = geoSimilarity(packageDoc?.pickupCoords, trip?.sourceCoords);
  const dropGeo = geoSimilarity(packageDoc?.dropCoords, trip?.destinationCoords);
  const geoBoostParts = [pickupGeo, dropGeo].filter((value) => value !== null);
  const geoBoost =
    geoBoostParts.length > 0
      ? geoBoostParts.reduce((sum, value) => sum + value, 0) / geoBoostParts.length
      : null;

  let locationScore = (pickupSimilarity + dropSimilarity) / 2;
  if (geoBoost !== null) {
    locationScore = locationScore * 0.75 + geoBoost * 0.25;
  }

  // Strong penalty when reverse route appears more plausible than forward route.
  const directionPenalty = reverseStrength > locationScore ? 0.6 : reverseStrength * 0.32;
  const routeScore = clamp01(locationScore - directionPenalty);

  const dateScore = getDateScore(packageDoc?.expectedDate, trip?.date);
  const capacityScore = getCapacityScore(packageDoc?.weight, trip?.availableCapacityKg);

  const sameUserTrip =
    packageDoc?.senderId && trip?.travelerId
      ? String(packageDoc.senderId) === String(trip.travelerId)
      : false;

  if (sameUserTrip) {
    return {
      score: 0,
      confidence: "Low",
      explanation: ["Trip belongs to the same user as the package sender."],
      breakdown: {
        locationScore: 0,
        dateScore: 0,
        capacityScore: 0,
      },
      reasons: {
        route: 0,
        date: 0,
        capacity: 0,
        pickupSimilarity: 0,
        dropSimilarity: 0,
        reverseRouteRisk: 0,
      },
    };
  }

  if (capacityScore === 0) {
    const pickupSimilarity = getLocationSimilarity(packagePickup, tripSource);
    const dropSimilarity = getLocationSimilarity(packageDrop, tripDestination);

    return {
      score: 10,
      confidence: "Low",
      explanation: [
        "Trip has insufficient available capacity for this package.",
        "Capacity mismatch strongly reduces match viability.",
      ],
      breakdown: {
        locationScore: toPercent((pickupSimilarity + dropSimilarity) / 2),
        dateScore: toPercent(dateScore),
        capacityScore: 0,
      },
      reasons: {
        route: toPercent((pickupSimilarity + dropSimilarity) / 2),
        date: toPercent(dateScore),
        capacity: 0,
        pickupSimilarity: toPercent(pickupSimilarity),
        dropSimilarity: toPercent(dropSimilarity),
        reverseRouteRisk: 0,
      },
    };
  }

  let weighted = routeScore * 0.54 + dateScore * 0.31 + capacityScore * 0.15;
  if (!packagePickup || !packageDrop || !tripSource || !tripDestination) {
    weighted *= 0.45;
  }

  if (reverseStrength >= 0.8) {
    weighted *= 0.7;
  }

  if (dateScore <= 0.2) {
    weighted *= 0.65;
  }

  const score = Math.round(clamp01(weighted) * 100);

  const explanation = [];
  if (routeScore >= 0.8) {
    explanation.push("Pickup and drop align strongly with the trip route.");
  } else if (routeScore >= 0.5) {
    explanation.push("Route alignment is partial; one endpoint is weaker.");
  } else {
    explanation.push("Route alignment is weak or appears directionally reversed.");
  }

  if (dateScore >= 0.95) {
    explanation.push("Trip date is an exact or near-exact match.");
  } else if (dateScore >= 0.4) {
    explanation.push("Trip date is close, but not exact.");
  } else {
    explanation.push("Trip date has low proximity to expected date.");
  }

  if (capacityScore === 0) {
    explanation.push("Trip does not have enough available capacity.");
  } else if (capacityScore < 0.65) {
    explanation.push("Capacity is tight; limited headroom remains.");
  } else {
    explanation.push("Trip has sufficient carrying capacity.");
  }

  return {
    score,
    confidence: getConfidence(score),
    explanation,
    breakdown: {
      locationScore: toPercent(routeScore),
      dateScore: toPercent(dateScore),
      capacityScore: toPercent(capacityScore),
    },
    reasons: {
      route: toPercent(routeScore),
      date: toPercent(dateScore),
      capacity: toPercent(capacityScore),
      pickupSimilarity: toPercent(pickupSimilarity),
      dropSimilarity: toPercent(dropSimilarity),
      reverseRouteRisk: toPercent(reverseStrength),
    },
  };
};
