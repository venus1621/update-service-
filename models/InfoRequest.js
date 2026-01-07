// models/InfoRequest.js
import mongoose from "mongoose";

const infoRequestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Info request title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Info request description is required"],
      trim: true,
    },
    serviceCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceCategory",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    price: {
      type: Number,
      required: [true, "Please provide a price for the service"],
      min: [1, "Price must be a positive number"],
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "cancelled"],
      default: "pending",
    },
    requiredConnect: {
      type: Number,
      min: [1, "At least one connection is required"],
      max: [10, "A maximum of 10 connections can be requested"],
      default: 1,
    },
  },
  { timestamps: true }
);

// 🔥 Pre-save middleware to calculate requiredConnect based on price
infoRequestSchema.pre("save", function (next) {
  // Recalculate only when price changes AND requiredConnect not set manually
  if (
    (this.isNew || this.isModified("price")) &&
    !this.isModified("requiredConnect")
  ) {
    let calculated = Math.ceil(this.price / 100);
    // enforce min/max boundaries
    if (calculated < 1) calculated = 1;
    if (calculated > 10) calculated = 10;
    this.requiredConnect = calculated;
  }
  next();
});

// ✅ Indexing for performance (common query fields)
infoRequestSchema.index({ createdBy: 1, status: 1 });
infoRequestSchema.index({ serviceCategory: 1 });

 const InfoRequest = mongoose.model("InfoRequest", infoRequestSchema);

 export default InfoRequest;
