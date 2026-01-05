import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

// test route (NO AUTH)
router.get("/", (req, res) => {
  res.send("Protected base route working");
});

// protected route
router.get("/me", authMiddleware, (req, res) => {
  res.json({
    message: "Protected route accessed",
    user: req.user,
  });
});

export default router;
