import { apiGet, apiPatch, apiPost } from "./api";

export const createPackage = (payload, token) => apiPost("/packages", payload, token);
export const createTrip = (payload, token) => apiPost("/trips", payload, token);
export const getLostItemMatches = (lostItemId, token) =>
  apiGet(`/match/lost/${lostItemId}`, token);
export const getFoundItemMatches = (foundItemId, token) =>
  apiGet(`/match/found/${foundItemId}`, token);

export const getMyPackages = (token) => apiGet("/packages/my", token);
export const getMyTrips = (token) => apiGet("/trips/my", token);
export const getMyBookings = (token, role = "") => {
  const suffix = role ? `?role=${encodeURIComponent(role)}` : "";
  return apiGet(`/bookings/my${suffix}`, token);
};

export const getPackageMatches = (packageId, token) =>
  apiGet(`/matches/packages/${packageId}`, token);

export const createBooking = (payload, token) => apiPost("/bookings", payload, token);
export const respondToBooking = (bookingId, action, token) =>
  apiPatch(`/bookings/${bookingId}/respond`, { action }, token);

export const startTransit = (bookingId, token) =>
  apiPatch(`/bookings/${bookingId}/start`, {}, token);

export const generateOtp = (bookingId, token) =>
  apiPost(`/bookings/${bookingId}/generate-otp`, {}, token);

export const verifyDelivery = (bookingId, otp, token) =>
  apiPost(`/bookings/${bookingId}/verify-delivery`, { otp }, token);

export const getMyNotifications = (token, page = 1, limit = 20) =>
  apiGet(`/notifications/my?page=${page}&limit=${limit}`, token);

export const markNotificationRead = (notificationId, token) =>
  apiPatch(`/notifications/${notificationId}/read`, {}, token);

export const markAllNotificationsRead = (token) =>
  apiPatch("/notifications/read-all", {}, token);

export const addTrackingUpdate = (bookingId, payload, token) =>
  apiPost(`/tracking/${bookingId}/update`, payload, token);

export const getTrackingHistory = (bookingId, token) =>
  apiGet(`/tracking/${bookingId}/history`, token);
