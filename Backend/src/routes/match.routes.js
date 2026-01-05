import express from "express";
import { matchLostWithFound } from "../controllers/match.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/lost/:id", authMiddleware, matchLostWithFound);

export default router;
