import mongoose from "mongoose";

const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    application: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    officer: { type: Schema.Types.ObjectId, ref: "Officer", required: true },
    citizen: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const Review = mongoose.model("Review", reviewSchema);

export { Review };
