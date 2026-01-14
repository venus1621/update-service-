import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

// Import routes
import authRoutes from "./routers/authRoute.js";
import officerRoutes from "./routers/officerRoutes.js";
import serviceCategoriesRoutes from "./routers/serviceCategoriesRoute.js";
import governmentInstitutionRoutes from "./routers/governmentInstitutionRoutes.js";
import infoRequestRoutes from "./routers/infoRequestRoute.js";
import applicationRoutes from "./routers/applicationRoute.js";
import user from "./routers/userRoutes.js";
import bargainRoute from "./routers/bargainRoute.js";
import chapaRouter from "./routers/chapa.js";
// Load environment variables
dotenv.config();

const app = express();

// CORS Configuration - Allow ALL origins
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", user);
app.use("/api/v1/officers", officerRoutes);
app.use("/api/v1/infoRequest", infoRequestRoutes);
app.use("/api/v1/application", applicationRoutes);
app.use("/api/v1/service-categories", serviceCategoriesRoutes);
app.use("/api/v1/government-institutions", governmentInstitutionRoutes);
app.use("/api/v1/bargain", bargainRoute);
app.use("/api/v1/chapa", chapaRouter);

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

