import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "admin", "sender", "traveler", "receiver"],
      default: "user",
    },
    // Trust & Reputation System
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      validate: {
        validator: function(v) {
          return v >= 0 && v <= 5;
        },
        message: 'Rating must be between 0 and 5',
      },
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedDeliveries: {
      type: Number,
      default: 0,
      min: 0,
    },
    reviews: [
      {
        bookingId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Booking",
          default: null,
        },
        reviewer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
          validate: {
            validator: function(v) {
              return v >= 1 && v <= 5;
            },
            message: 'Review rating must be between 1 and 5',
          },
        },
        comment: {
          type: String,
          trim: true,
          default: "",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
