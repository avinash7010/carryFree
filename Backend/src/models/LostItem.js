import mongoose from "mongoose";

const lostItemSchema = new mongoose.Schema(
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
    dateLost: {
      type: Date,
      required: true,
    },
    image: {
      type: String, // URL (future: Cloudinary)
    },
    status: {
      type: String,
      enum: ["lost", "found"],
      default: "lost",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("LostItem", lostItemSchema);
