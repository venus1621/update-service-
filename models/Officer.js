// models/Officer.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const officerSchema = new Schema(
  {
    /* -------------------- Identity -------------------- */

    tinNumber: {
      type: String,
      required: [true, "TIN number is required"],
      unique: true,
      trim: true,
      index: true,
    },

    institution: {
      type: String,
      required: [true, "Institution is required"],
      trim: true,
    },
    title: {
      type: String,
      required: [true, "Officer title is required"],
      trim: true,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    experienceYears: {
      type: Number,
      min: 0,
      default: 0,
    },

    serviceCategory: {
      type: Schema.Types.ObjectId,
      ref: "ServiceCategory",
      required: true,
      index: true,
    },

    priceMin: {
      type: Number,
      min: 0,
    },

    priceMax: {
      type: Number,
      min: 0,
      validate: {
        validator: function (value) {
          if (this.priceMin == null) return true;
          return value >= this.priceMin;
        },
        message: "priceMax must be greater than or equal to priceMin",
      },
    },

    /* -------------------- Reputation -------------------- */

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      set: (v) => Math.round(v * 10) / 10, // one decimal
    },

    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    Specializations: {
      type: String,
      trim: true,
    },

    /* -------------------- Verification -------------------- */

    verified: {
      type: Boolean,
      default: false,
      index: true,
    },

    /* -------------------- Lifecycle -------------------- */

    isActive: {
      type: Boolean,
      default: true,
      select: false,
    },

    suspendedAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* -------------------- Indexes -------------------- */

officerSchema.index({ department: 1, verified: 1 });
officerSchema.index({ rating: -1 });

/* -------------------- Virtuals -------------------- */

officerSchema.virtual("priceRange").get(function () {
  if (this.priceMin == null || this.priceMax == null) return null;
  return `${this.priceMin} - ${this.priceMax}`;
});

/* -------------------- Middleware -------------------- */

// Hide inactive officers by default
officerSchema.pre(/^find/, function (next) {
  this.where({ isActive: { $ne: false } });
  next();
});

/* -------------------- Methods -------------------- */

officerSchema.methods.verify = function (adminId) {
  this.verified = true;
  this.verifiedAt = new Date();
  this.verifiedBy = adminId;
  return this.save();
};

officerSchema.methods.suspend = function () {
  this.isActive = false;
  this.suspendedAt = new Date();
  return this.save();
};

/* -------------------- Model -------------------- */

const Officer =
  mongoose.models.Officer || mongoose.model("Officer", officerSchema);

export default Officer;
