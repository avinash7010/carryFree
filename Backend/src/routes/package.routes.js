import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  createPackage,
  getAllPackages,
  getMyPackages,
  updatePackageStatus,
} from "../controllers/package.controller.js";

const router = express.Router();

router.get("/", getAllPackages);
router.get("/my", authMiddleware, getMyPackages);
router.post("/", authMiddleware, createPackage);
router.patch("/:id/status", authMiddleware, updatePackageStatus);

export default router;
