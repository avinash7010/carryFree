import mongoose from "mongoose";

const packageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiverName: {
      type: String,
      trim: true,
      default: "",
    },
    receiverPhone: {
      type: String,
      trim: true,
      default: "",
    },
    pickupLocation: {
      city: {
        type: String,
        required: true,
        trim: true,
      },
      lat: {
        type: Number,
        required: true,
        min: -90,
        max: 90,
        validate: {
          validator: function(v) {
            return v >= -90 && v <= 90;
          },
          message: 'Latitude must be between -90 and 90',
        },
      },
      lng: {
        type: Number,
        required: true,
        min: -180,
        max: 180,
        validate: {
          validator: function(v) {
            return v >= -180 && v <= 180;
          },
          message: 'Longitude must be between -180 and 180',
        },
      },
    },
    dropLocation: {
      city: {
        type: String,
        required: true,
        trim: true,
      },
      lat: {
        type: Number,
        required: true,
        min: -90,
        max: 90,
        validate: {
          validator: function(v) {
            return v >= -90 && v <= 90;
          },
          message: 'Latitude must be between -90 and 90',
        },
      },
      lng: {
        type: Number,
        required: true,
        min: -180,
        max: 180,
        validate: {
          validator: function(v) {
            return v >= -180 && v <= 180;
          },
          message: 'Longitude must be between -180 and 180',
        },
      },
    },
    expectedDate: {
      type: Date,
      required: true,
      index: true,
    },
    weight: {
      type: Number,
      required: true,
      min: 0.1,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "matched", "in-transit", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },
    matchedTrip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ["unlocked", "locked", "released", "refunded"],
      default: "unlocked",
    },
    paymentAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    deliveryOtpHash: {
      type: String,
      default: null,
    },
    deliveryVerifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Package", packageSchema);
