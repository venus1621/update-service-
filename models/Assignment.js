// models/Assignment.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const assignmentSchema = new Schema(
  {
    /* -------------------- Core Relationship -------------------- */

    officer: {
      type: Schema.Types.ObjectId,
      ref: "Officer",
      required: true,
      index: true,
    },

    serviceCategory: {
      type: Schema.Types.ObjectId,
      ref: "ServiceCategory",
      required: true,
      index: true,
    },

    experienceYears: {
      type: Number,
      min: 0,
      default: 0,
    },

    /* -------------------- Governance -------------------- */

    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",// super-admin
      required: true,
    },

    assignmentType: {
      type: String,
      enum: ["OFFICER_CATEGORY", "ADMIN_CATEGORY"],
      default: "OFFICER_CATEGORY",
      index: true,
    },

    /* -------------------- Lifecycle -------------------- */

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    assignedAt: {
      type: Date,
      default: Date.now,
    },

    unassignedAt: {
      type: Date,
    },

    reason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* -------------------- Indexes -------------------- */

// Prevent duplicate active assignments
assignmentSchema.index(
  { officer: 1, serviceCategory: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

// Query optimization
assignmentSchema.index({ assignedBy: 1 });
assignmentSchema.index({ assignmentType: 1, createdAt: -1 });

/* -------------------- Middleware -------------------- */

// Hide inactive assignments by default
assignmentSchema.pre(/^find/, function (next) {
  this.where({ isActive: { $ne: false } });
  next();
});

/* -------------------- Methods -------------------- */

assignmentSchema.methods.unassign = function (reason) {
  this.isActive = false;
  this.unassignedAt = new Date();
  if (reason) this.reason = reason;
  return this.save();
};

/* -------------------- Model -------------------- */

const Assignment =
  mongoose.models.Assignment ||
  mongoose.model("Assignment", assignmentSchema);

export default Assignment;
