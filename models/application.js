// models/Application.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const transactionSchema = new Schema({
  amount: Number,
  tx_ref: { type: String, unique: true, sparse: true },
  status: { type: String, enum: ["success", "failed", "pending"] },
  paidAt: Date,
});

const applicationSchema = new Schema(
  {
    infoRequest: {
      type: Schema.Types.ObjectId,
      ref: "InfoRequest",
      required: true,
    }, // the request being applied for
    officer: { type: Schema.Types.ObjectId, ref: "User", required: true }, // officer applying
    price: { type: Number, required: true },
    proposal: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    transaction: transactionSchema,
  },
  { timestamps: true }
);

// Prevent OverwriteModelError if this file is imported more than once
const Application =
  mongoose.models.Application || mongoose.model("Application", applicationSchema);

export default Application;
