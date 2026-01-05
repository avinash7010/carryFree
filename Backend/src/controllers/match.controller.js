import LostItem from "../models/LostItem.js";
import FoundItem from "../models/FoundItem.js";

/**
 * @desc Match found items for a lost item
 * @route GET /api/match/lost/:id
 * @access Private
 */
export const matchLostWithFound = async (req, res) => {
  try {
    const lostItem = await LostItem.findById(req.params.id);

    if (!lostItem) {
      return res.status(404).json({ message: "Lost item not found" });
    }

    // Only owner can see matches
    if (lostItem.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const matches = await FoundItem.find({
      category: lostItem.category,
      location: lostItem.location,
      dateFound: { $gte: lostItem.dateLost },
      status: "found",
    }).populate("createdBy", "name email");

    res.json({
      lostItem,
      matchCount: matches.length,
      matches,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to find matches",
      error: error.message,
    });
  }
};
