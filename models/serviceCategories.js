// models/ServiceCategory.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const serviceCategorySchema = new Schema(
  {
    /* -------------------- Core Identity -------------------- */

    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },

  
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

   
    /* -------------------- Lifecycle ------------ */

    isActive: {
      type: Boolean,
      default: true,
    },

    disabledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* -------------------- Indexes -------------------- */

// Compound index for common queries
serviceCategorySchema.index({ name: 1, isActive: 1 });

/* -------------------- Middleware -------------------- */

// Hide inactive categories by default
serviceCategorySchema.pre(/^find/, function (next) {
  this.where({ isActive: { $ne: false } });
  next();
});

/* -------------------- Methods -------------------- */

serviceCategorySchema.methods.disable = function () {
  this.isActive = false;
  this.disabledAt = new Date();
  return this.save();
};

serviceCategorySchema.methods.enable = function () {
  this.isActive = true;
  this.disabledAt = null;
  return this.save();
};

/* -------------------- Model -------------------- */

const ServiceCategory =
  mongoose.models.ServiceCategory ||
  mongoose.model("ServiceCategory", serviceCategorySchema);

export default ServiceCategory;
