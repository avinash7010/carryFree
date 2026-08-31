/**
 * API Response Selector Patterns
 * 
 * Define which user and trip fields to expose in API responses
 * Includes reputation data but excludes sensitive fields and full reviews array
 */

/**
 * User fields to expose with reputation system
 * Does NOT include: password, reviews array
 * Does include: rating, totalReviews, completedDeliveries
 */
export const USER_PUBLIC_FIELDS = "name email role rating totalReviews completedDeliveries";

/**
 * User fields for traveler context (in trips)
 * Includes role-specific reputation metrics
 */
export const USER_TRAVELER_FIELDS = "name email role rating totalReviews completedDeliveries";

/**
 * User fields for minimal listing (senders, receivers)
 */
export const USER_BASIC_FIELDS = "name email rating completedDeliveries";

/**
 * Trip fields for listing/browsing
 * Includes traveler reputation by reference
 */
export const TRIP_LIST_FIELDS = "source destination date availableCapacityKg capacityKg status";

/**
 * Trip fields for detailed response
 * Includes all booking-relevant info
 */
export const TRIP_DETAIL_FIELDS = "source destination date capacityKg availableCapacityKg status notes travelerId";

/**
 * Package fields for listing
 */
export const PACKAGE_LIST_FIELDS = "pickupLocation dropLocation expectedDate weight status paymentStatus createdAt";

/**
 * Package fields for detailed response
 */
export const PACKAGE_DETAIL_FIELDS = "pickupLocation dropLocation expectedDate weight description status paymentStatus matchedTrip createdAt";

/**
 * Booking fields with populated relationships
 * Includes trip and package with relevant data
 */
export const BOOKING_POPULATE_PATTERNS = [
  {
    path: "packageId",
    select: PACKAGE_LIST_FIELDS,
  },
  {
    path: "tripId",
    select: TRIP_LIST_FIELDS,
    populate: {
      path: "travelerId",
      select: USER_TRAVELER_FIELDS,
    },
  },
  {
    path: "senderId",
    select: USER_BASIC_FIELDS,
  },
];

/**
 * Match results with traveler reputation
 * Returns trips with traveler stats (without full reviews)
 */
export const MATCH_TRIP_FIELDS = "source destination date capacityKg availableCapacityKg status travelerId";

export const MATCH_TRAVELER_POPULATE = {
  path: "travelerId",
  select: USER_TRAVELER_FIELDS, // Includes rating, totalReviews, completedDeliveries
};

/**
 * Review context - traveler with stats but NOT full reviews array
 * (reviews are fetched separately)
 */
export const REVIEWER_FIELDS = "name email rating totalReviews completedDeliveries";

/**
 * Return traveler stats in response without exposing full reviews array
 */
export const getTravelerStatsOnly = (user) => {
  if (!user) return null;

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    rating: user.rating || 0,
    totalReviews: user.totalReviews || 0,
    completedDeliveries: user.completedDeliveries || 0,
    // Note: reviews array NOT included
  };
};

/**
 * Return trip with traveler stats (embedded)
 * Lightweight response excluding traveler's full reviews array
 */
export const getTripWithTravelerStats = (trip) => {
  if (!trip) return null;

  return {
    ...trip.toObject(),
    travelerId: trip.travelerId
      ? getTravelerStatsOnly(trip.travelerId)
      : null,
  };
};

/**
 * Return booking with populations but lightweight traveler data
 */
export const getBookingWithStats = (booking) => {
  if (!booking) return null;

  const obj = booking.toObject();

  // Lightweight traveler data in trip
  if (obj.tripId?.travelerId) {
    obj.tripId.travelerId = getTravelerStatsOnly(obj.tripId.travelerId);
  }

  // Lightweight sender data
  if (obj.senderId) {
    obj.senderId = getTravelerStatsOnly(obj.senderId);
  }

  return obj;
};
