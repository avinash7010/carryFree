import express from "express";
import {
  createLostItem,
  getAllLostItems,
  getMyLostItems,
} from "../controllers/lostItem.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

// Public
router.get("/", getAllLostItems);

// Private
router.post("/", authMiddleware, createLostItem);
router.get("/my", authMiddleware, getMyLostItems);

export default router;
