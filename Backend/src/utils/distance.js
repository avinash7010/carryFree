/**
 * Calculate the great-circle distance between two points on Earth
 * using the Haversine formula
 * 
 * @param {number} lat1 - Latitude of first point in degrees
 * @param {number} lon1 - Longitude of first point in degrees
 * @param {number} lat2 - Latitude of second point in degrees
 * @param {number} lon2 - Longitude of second point in degrees
 * @returns {number} Distance between the two points in kilometers
 * 
 * @example
 * const distance = getDistance(40.7128, -74.0060, 51.5074, -0.1278);
 * console.log(distance); // ~5570 km (NYC to London)
 */
export const getDistance = (lat1, lon1, lat2, lon2) => {
  // Earth's radius in kilometers
  const R = 6371;

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
  const distance = R * c;

  // Return distance rounded to 2 decimal places
  return Math.round(distance * 100) / 100;
};

/**
 * Convert degrees to radians
 * 
 * @param {number} degrees - Value in degrees
 * @returns {number} Value in radians
 * @private
 */
const toRadians = (degrees) => {
  return (degrees * Math.PI) / 180;
};

/**
 * Check if two locations are within a specified radius
 * 
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @param {number} radiusKm - Radius in kilometers
 * @returns {boolean} True if distance is within radius, false otherwise
 */
export const isWithinRadius = (lat1, lon1, lat2, lon2, radiusKm) => {
  const distance = getDistance(lat1, lon1, lat2, lon2);
  return distance <= radiusKm;
};
