import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { getPackageMatches } from "../controllers/carryMatch.controller.js";

const router = express.Router();

router.get("/packages/:packageId", authMiddleware, getPackageMatches);

export default router;
