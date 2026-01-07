import mongoose from "mongoose";

const chatRoomSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    infoRequestTitle: {
      type: String,
      required: true,
    },
    category: {
      type: String, // or ObjectId if you prefer ref
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Ensure exactly two participants
chatRoomSchema.pre("save", function (next) {
  if (this.participants.length !== 2) {
    return next(new Error("Chat room must have exactly two participants"));
  }
  next();
});

// ── FIX FOR OverwriteModelError ──
// Use existing model if already compiled (safe with nodemon/hot reloads)
const ChatRoom =
  mongoose.models.ChatRoom || mongoose.model("ChatRoom", chatRoomSchema);

export default ChatRoom;