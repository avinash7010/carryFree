import express from "express";
import {
  createClaim,
  getMyClaims,
  getReceivedClaims,
  updateClaimStatus,
} from "../controllers/claim.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, createClaim);
router.get("/my", authMiddleware, getMyClaims);
router.get("/received", authMiddleware, getReceivedClaims);
router.patch("/:id", authMiddleware, updateClaimStatus);

export default router;
