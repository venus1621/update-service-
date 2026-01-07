// models/application.js
// Note: File name is now lowercase to avoid case-sensitivity issues on Linux/deploy platforms

import mongoose from "mongoose";

const { Schema } = mongoose;

// Embedded transaction schema (kept embedded for simplicity as per your original design)
// If you later need payment retry history, consider moving this to a separate Transaction model
const transactionSchema = new Schema({
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  tx_ref: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple nulls while enforcing uniqueness on existing values
  },
  status: {
    type: String,
    enum: ["success", "failed", "pending"],
    required: true,
    default: "pending",
  },
  paidAt: {
    type: Date,
  },
});

const applicationSchema = new Schema(
  {
    infoRequest: {
      type: Schema.Types.ObjectId,
      ref: "InfoRequest",
      required: true,
    },
    officer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    proposal: {
      type: String,
      required: true,
      trim: true,
      minlength: 10, // Optional: enforce meaningful proposals
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    transaction: {
      type: transactionSchema,
      default: null, // Explicitly null until payment is initiated
    },
  },
  {
    timestamps: true, // createdAt & updatedAt
  }
);

// Indexes for better query performance
applicationSchema.index({ infoRequest: 1 });
applicationSchema.index({ officer: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ "transaction.status": 1 });
applicationSchema.index({ "transaction.tx_ref": 1 });

// Optional but recommended: Prevent one officer from applying multiple times to the same request
applicationSchema.index({ infoRequest: 1, officer: 1 }, { unique: true });

// Prevent Mongoose OverwriteModelError in development (nodemon/hot reload)
const Application =
  mongoose.models.Application || mongoose.model("Application", applicationSchema);

export default Application;