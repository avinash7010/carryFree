import express from "express";
import { matchFoundWithLost, matchLostWithFound } from "../controllers/match.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/lost/:id", authMiddleware, matchLostWithFound);
router.get("/found/:id", authMiddleware, matchFoundWithLost);

export default router;
