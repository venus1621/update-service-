import mongoose from "mongoose";

const { Schema } = mongoose;

const bargainSchema = new Schema(
  {
    application: { type: Schema.Types.ObjectId, ref: "Application", required: true },
    proposed_price: { type: Number, required: true },
    message: { type: String },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending"
    },
    createdBy: {  
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    officer: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const Bargain = mongoose.model("Bargain", bargainSchema);

export { Bargain };
