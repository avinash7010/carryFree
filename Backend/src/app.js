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
import packageRoutes from "./routes/package.routes.js";
import tripRoutes from "./routes/trip.routes.js";
import carryMatchRoutes from "./routes/carryMatch.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import trackingRoutes from "./routes/tracking.routes.js";
import reviewRoutes from "./routes/review.routes.js";

dotenv.config();
connectDB();

const app = express();

const corsOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || corsOrigins.length === 0 || corsOrigins.includes(origin)) {
      return callback(null, true);
    }

    const corsError = new Error("Origin not allowed by CORS");
    corsError.status = 403;
    corsError.code = "CORS_ORIGIN_FORBIDDEN";
    return callback(corsError);
  },
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("CarryFree Backend API is running");
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "OK",
    data: {
      service: "carryfree-backend",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/lost-items", lostItemRoutes);
app.use("/api/found-items", foundItemRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/matches", carryMatchRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/reviews", reviewRoutes);

// Centralized error middleware for consistent API error shape
app.use((err, req, res, next) => {
  if (err?.code === "CORS_ORIGIN_FORBIDDEN") {
    return res.status(403).json({
      success: false,
      message: "CORS origin forbidden",
      error: err.message,
    });
  }

  if (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal server error",
      error: process.env.NODE_ENV === "production" ? null : err.stack,
    });
  }

  return next();
});

export default app;
