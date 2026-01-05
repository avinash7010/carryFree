import express from "express";
import {
  createFoundItem,
  getAllFoundItems,
  getMyFoundItems,
} from "../controllers/foundItem.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

// Public
router.get("/", getAllFoundItems);

// Private
router.post("/", authMiddleware, createFoundItem);
router.get("/my", authMiddleware, getMyFoundItems);

export default router;
