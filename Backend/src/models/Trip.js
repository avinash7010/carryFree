import mongoose from "mongoose";

const tripSchema = new mongoose.Schema(
  {
    travelerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    source: {
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
    destination: {
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
    date: {
      type: Date,
      required: true,
      index: true,
    },
    capacityKg: {
      type: Number,
      required: true,
      min: 0.1,
    },
    availableCapacityKg: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["open", "booked", "completed", "cancelled"],
      default: "open",
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Trip", tripSchema);
