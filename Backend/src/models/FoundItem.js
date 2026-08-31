import mongoose from "mongoose";

const foundItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    dateFound: {
      type: Date,
      required: true,
    },
    color: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    image: {
      type: String, // URL (future use)
    },
    status: {
      type: String,
      enum: ["found", "returned"],
      default: "found",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("FoundItem", foundItemSchema);
