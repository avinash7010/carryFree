import crypto from "crypto";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Package from "../models/Package.js";
import Trip from "../models/Trip.js";
import User from "../models/User.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";
import { notifyUsers } from "../services/notification.service.js";

const hashOtp = (otp) =>
  crypto.createHash("sha256").update(String(otp)).digest("hex");

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const OTP_EXPIRY_MINUTES = 10;

const isOtpExpired = (generatedAt) => {
  if (!generatedAt) {
    return true;
  }

  const ageMs = Date.now() - new Date(generatedAt).getTime();
  return ageMs > OTP_EXPIRY_MINUTES * 60 * 1000;
};

export const createBooking = async (req, res) => {
  try {
    const { packageId, tripId } = req.body;

    if (!packageId || !tripId) {
      return errorResponse(res, "packageId and tripId are required", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(packageId) || !mongoose.Types.ObjectId.isValid(tripId)) {
      return errorResponse(res, "Invalid packageId or tripId", 400);
    }

    const packageDoc = await Package.findById(packageId);
    const trip = await Trip.findById(tripId);

    if (!packageDoc || !trip) {
      return errorResponse(res, "Package or trip not found", 404);
    }

    if (packageDoc.senderId.toString() !== req.user.id) {
      return errorResponse(res, "Only package owner can book a traveler", 403);
    }

    if (packageDoc.senderId.toString() === trip.travelerId.toString()) {
      return errorResponse(res, "You cannot book your own trip", 400);
    }

    if (!["pending", "matched"].includes(packageDoc.status)) {
      return errorResponse(res, "Package is not available for booking", 400);
    }

    if (trip.status !== "open") {
      return errorResponse(res, "Trip is not open for booking", 400);
    }

    if (trip.availableCapacityKg < packageDoc.weight) {
      return errorResponse(res, "Trip does not have enough available capacity", 400);
    }

    const existingActiveBooking = await Booking.findOne({
      packageId,
      status: { $in: ["requested", "accepted", "in-transit"] },
    });

    if (existingActiveBooking) {
      return errorResponse(res, "An active booking already exists for this package", 400);
    }

    const lockedAmount = packageDoc.paymentAmount > 0 ? packageDoc.paymentAmount : packageDoc.weight * 50;

    const booking = await Booking.create({
      packageId,
      tripId,
      senderId: packageDoc.senderId,
      travelerId: trip.travelerId,
      status: "requested",
      paymentStatus: "locked",
      lockedAmount,
    });

    try {
      packageDoc.status = "matched";
      packageDoc.matchedTrip = trip._id;
      packageDoc.paymentStatus = "locked";
      packageDoc.paymentAmount = lockedAmount;
      await packageDoc.save();
    } catch (updateError) {
      await Booking.findByIdAndDelete(booking._id);
      throw updateError;
    }

    await notifyUsers([
      {
        userId: booking.travelerId,
        type: "booking_requested",
        title: "New booking request",
        message: "A sender has requested your trip for package delivery.",
        metadata: { bookingId: booking._id, packageId: packageDoc._id, tripId: trip._id },
      },
      {
        userId: booking.senderId,
        type: "payment_locked",
        title: "Payment locked",
        message: "Your payment is locked until delivery verification is complete.",
        metadata: { bookingId: booking._id, amount: lockedAmount },
      },
    ]);

    return successResponse(res, "Booking request created and payment locked", booking, 201);
  } catch (error) {
    if (error?.code === 11000) {
      return errorResponse(res, "An active booking already exists for this package", 409);
    }

    return errorResponse(res, "Failed to create booking", 500, error.message);
  }
};

export const respondToBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, "Invalid booking id", 400);
    }

    if (!["accept", "reject"].includes(action)) {
      return errorResponse(res, "action must be accept or reject", 400);
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return errorResponse(res, "Booking not found", 404);
    }

    if (booking.travelerId.toString() !== req.user.id) {
      return errorResponse(res, "Only assigned traveler can respond to booking", 403);
    }

    if (booking.status !== "requested") {
      return errorResponse(res, "Only requested bookings can be responded to", 400);
    }

    const packageDoc = await Package.findById(booking.packageId);
    const trip = await Trip.findById(booking.tripId);

    if (!packageDoc || !trip) {
      return errorResponse(res, "Package or trip not found", 404);
    }

    if (action === "reject") {
      const rejectedBooking = await Booking.findOneAndUpdate(
        { _id: id, status: "requested" },
        { $set: { status: "rejected", paymentStatus: "refunded" } },
        { new: true }
      );

      if (!rejectedBooking) {
        return errorResponse(res, "Booking is no longer in requested state", 400);
      }

      packageDoc.status = "pending";
      packageDoc.matchedTrip = null;
      packageDoc.paymentStatus = "refunded";
      await packageDoc.save();

      await notifyUsers([
        {
          userId: booking.senderId,
          type: "booking_rejected",
          title: "Booking rejected",
          message: "The traveler rejected your booking. Payment has been refunded.",
          metadata: { bookingId: rejectedBooking._id },
        },
      ]);

      return successResponse(res, "Booking rejected and payment refunded", rejectedBooking);
    }

    if (!["open", "booked"].includes(trip.status)) {
      return errorResponse(res, "Trip is no longer available", 400);
    }

    if (packageDoc.status !== "matched") {
      return errorResponse(res, "Package is no longer in a matchable state", 400);
    }

    if (trip.availableCapacityKg < packageDoc.weight) {
      return errorResponse(res, "Trip no longer has enough capacity", 400);
    }

    const reservedTrip = await Trip.findOneAndUpdate(
      {
        _id: trip._id,
        status: { $in: ["open", "booked"] },
        availableCapacityKg: { $gte: packageDoc.weight },
      },
      { $inc: { availableCapacityKg: -packageDoc.weight } },
      { new: true }
    );

    if (!reservedTrip) {
      return errorResponse(res, "Trip no longer has enough capacity", 400);
    }

    const acceptedBooking = await Booking.findOneAndUpdate(
      { _id: id, status: "requested" },
      { $set: { status: "accepted" } },
      { new: true }
    );

    if (!acceptedBooking) {
      await Trip.findByIdAndUpdate(trip._id, {
        $inc: { availableCapacityKg: packageDoc.weight },
      });
      return errorResponse(res, "Booking is no longer in requested state", 400);
    }

    if (reservedTrip.availableCapacityKg === 0 && reservedTrip.status !== "booked") {
      await Trip.findByIdAndUpdate(reservedTrip._id, { status: "booked" });
    }

    await notifyUsers([
      {
        userId: acceptedBooking.senderId,
        type: "booking_accepted",
        title: "Booking accepted",
        message: "Traveler accepted your booking request.",
        metadata: { bookingId: acceptedBooking._id },
      },
      {
        userId: acceptedBooking.travelerId,
        type: "booking_confirmed",
        title: "Booking confirmed",
        message: "Booking is confirmed. Start transit when pickup is done.",
        metadata: { bookingId: acceptedBooking._id },
      },
    ]);

    return successResponse(res, "Booking accepted", acceptedBooking);
  } catch (error) {
    return errorResponse(res, "Failed to update booking", 500, error.message);
  }
};

export const markInTransit = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, "Invalid booking id", 400);
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return errorResponse(res, "Booking not found", 404);
    }

    if (booking.travelerId.toString() !== req.user.id) {
      return errorResponse(res, "Only assigned traveler can start transit", 403);
    }

    const inTransitBooking = await Booking.findOneAndUpdate(
      { _id: id, status: "accepted" },
      { $set: { status: "in-transit" } },
      { new: true }
    );

    if (!inTransitBooking) {
      return errorResponse(res, "Only accepted bookings can move to in-transit", 400);
    }

    await Package.findByIdAndUpdate(inTransitBooking.packageId, { status: "in-transit" });

    await notifyUsers([
      {
        userId: inTransitBooking.senderId,
        type: "in_transit",
        title: "Package in transit",
        message: "Traveler has started transit for your package.",
        metadata: { bookingId: inTransitBooking._id },
      },
    ]);

    return successResponse(res, "Booking marked as in-transit", inTransitBooking);
  } catch (error) {
    return errorResponse(res, "Failed to mark in-transit", 500, error.message);
  }
};

export const generateDeliveryOtp = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, "Invalid booking id", 400);
    }

    const booking = await Booking.findById(id).populate("packageId");
    if (!booking) {
      return errorResponse(res, "Booking not found", 404);
    }

    if (booking.senderId.toString() !== req.user.id && req.user.role !== "admin") {
      return errorResponse(res, "Only sender can generate OTP", 403);
    }

    if (booking.status !== "in-transit") {
      return errorResponse(res, "OTP can only be generated for in-transit bookings", 400);
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    booking.deliveryOtpHash = otpHash;
    booking.otpGeneratedAt = new Date();
    await booking.save();

    await Package.findByIdAndUpdate(booking.packageId._id, {
      deliveryOtpHash: otpHash,
    });

    const response = {
      bookingId: booking._id,
      otpGeneratedAt: booking.otpGeneratedAt,
    };

    if (process.env.NODE_ENV !== "production") {
      response.demoOtp = otp;
    }

    await notifyUsers([
      {
        userId: booking.travelerId,
        type: "otp_generated",
        title: "Delivery OTP ready",
        message: "Sender has generated delivery OTP. Verify on handoff.",
        metadata: { bookingId: booking._id },
      },
    ]);

    return successResponse(res, "Delivery OTP generated", response);
  } catch (error) {
    return errorResponse(res, "Failed to generate OTP", 500, error.message);
  }
};

export const verifyDeliveryOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, "Invalid booking id", 400);
    }

    if (!otp) {
      return errorResponse(res, "otp is required", 400);
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return errorResponse(res, "Booking not found", 404);
    }

    const isPartyAllowed =
      booking.senderId.toString() === req.user.id ||
      booking.travelerId.toString() === req.user.id ||
      req.user.role === "admin";

    if (!isPartyAllowed) {
      return errorResponse(res, "Not authorized to verify delivery", 403);
    }

    if (booking.status !== "in-transit") {
      return errorResponse(res, "Only in-transit bookings can be verified", 400);
    }

    if (!booking.deliveryOtpHash) {
      return errorResponse(res, "No delivery OTP generated for this booking", 400);
    }

    if (isOtpExpired(booking.otpGeneratedAt)) {
      return errorResponse(res, "OTP expired. Please generate a new OTP.", 400);
    }

    const otpHash = hashOtp(otp);
    if (otpHash !== booking.deliveryOtpHash) {
      return errorResponse(res, "Invalid OTP", 400);
    }

    const verifiedAt = new Date();
    const deliveredBooking = await Booking.findOneAndUpdate(
      {
        _id: id,
        status: "in-transit",
        deliveryOtpHash: otpHash,
      },
      {
        $set: {
          status: "delivered",
          paymentStatus: "released",
          otpVerifiedAt: verifiedAt,
          deliveryOtpHash: null,
        },
      },
      { new: true }
    );

    if (!deliveredBooking) {
      return errorResponse(res, "Booking could not be verified in current state", 400);
    }

    // ============== INCREMENT TRAVELER'S COMPLETED DELIVERIES ==============
    // Only increment once per booking (idempotent: status changes from in-transit to delivered)
    await User.findByIdAndUpdate(
      deliveredBooking.travelerId,
      { $inc: { completedDeliveries: 1 } },
      { new: true }
    );

    await Package.findByIdAndUpdate(deliveredBooking.packageId, {
      status: "delivered",
      paymentStatus: "released",
      deliveryVerifiedAt: verifiedAt,
      deliveryOtpHash: null,
    });

    const activeTripBookings = await Booking.countDocuments({
      tripId: deliveredBooking.tripId,
      status: { $in: ["requested", "accepted", "in-transit"] },
    });

    if (activeTripBookings === 0) {
      await Trip.findByIdAndUpdate(deliveredBooking.tripId, { status: "completed" });
    }

    await notifyUsers([
      {
        userId: deliveredBooking.senderId,
        type: "delivered",
        title: "Delivery completed",
        message: "Delivery verified successfully and payment released.",
        metadata: { bookingId: deliveredBooking._id },
      },
      {
        userId: deliveredBooking.travelerId,
        type: "payment_released",
        title: "Payment released",
        message: "Delivery verified. Simulated payment is now released.",
        metadata: { bookingId: deliveredBooking._id },
      },
    ]);

    return successResponse(res, "Delivery verified and payment released", deliveredBooking);
  } catch (error) {
    return errorResponse(res, "Failed to verify delivery", 500, error.message);
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const role = req.query.role;

    const filters = {};
    if (role === "traveler") {
      filters.travelerId = req.user.id;
    } else if (role === "sender") {
      filters.senderId = req.user.id;
    } else {
      filters.$or = [{ travelerId: req.user.id }, { senderId: req.user.id }];
    }

    const bookings = await Booking.find(filters)
      .sort({ createdAt: -1 })
      .populate("packageId", "pickupLocation dropLocation weight status")
      .populate({
        path: "tripId",
        select: "source destination date status travelerId",
        populate: {
          path: "travelerId",
          select: "name email role rating totalReviews completedDeliveries",
        },
      })
      .populate("senderId", "name email rating completedDeliveries");

    return successResponse(res, "Bookings fetched", bookings);
  } catch (error) {
    return errorResponse(res, "Failed to fetch bookings", 500, error.message);
  }
};
