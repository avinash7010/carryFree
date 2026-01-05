import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

// Routes
import authRoutes from "./routes/auth.routes.js";
import protectedRoutes from "./routes/protected.routes.js";
import lostItemRoutes from "./routes/lostItem.routes.js";
import foundItemRoutes from "./routes/foundItem.routes.js";
import matchRoutes from "./routes/match.routes.js";
import claimRoutes from "./routes/claim.routes.js";

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("CarryFree Backend API is running");
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/lost-items", lostItemRoutes);
app.use("/api/found-items", foundItemRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/claims", claimRoutes);

export default app;
