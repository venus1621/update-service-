import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

// Import routes
import authRoutes from "./routers/authRoute.js";
import officerRoutes from "./routers/officerRoutes.js";
import serviceCategoriesRoutes from "./routers/serviceCategoriesRoute.js";
import assignmentRoutes from "./routers/assignmentroute.js";

// Load environment variables
dotenv.config();

const app = express();

// CORS Configuration - Allow ALL origins
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/officers", officerRoutes);
app.use("/api/v1/service-categories", serviceCategoriesRoutes);
app.use("/api/v1/assignments", assignmentRoutes);

// Health check route
app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Service Category API is running",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.all("*", (req, res, next) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export default app;

