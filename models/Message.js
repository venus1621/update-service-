import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chatRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isDelivered: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Prevent self-messages
messageSchema.pre("save", function (next) {
  if (this.sender.equals(this.receiver)) {
    return next(new Error("Sender and receiver cannot be the same"));
  }
  next();
});
// Index for faster queries
messageSchema.index({ chatRoom: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;
