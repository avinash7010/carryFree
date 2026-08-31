import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true,
      index: true,
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    travelerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["requested", "accepted", "rejected", "in-transit", "delivered", "cancelled"],
      default: "requested",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "locked", "released", "refunded"],
      default: "pending",
    },
    lockedAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    deliveryOtpHash: {
      type: String,
      default: null,
    },
    otpGeneratedAt: {
      type: Date,
      default: null,
    },
    otpVerifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ packageId: 1, status: 1 });
bookingSchema.index({ tripId: 1, status: 1 });
bookingSchema.index(
  { packageId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["requested", "accepted", "in-transit"] },
    },
    name: "uniq_active_booking_per_package",
  }
);

export default mongoose.model("Booking", bookingSchema);
