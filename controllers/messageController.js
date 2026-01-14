import mongoose from "mongoose";
import  Message  from "../models/Message.js";
import  ChatRoom  from "../models/ChatRoom.js";

export const sendMessage = async (req, res) => {
  try {
    const { chatRoomId, content, receiverId } = req.body;
    const senderId = req.user._id;

    if (
      !mongoose.Types.ObjectId.isValid(chatRoomId) ||
      !mongssoose.Types.ObjectId.isValid(receiverId)
    ) {
      return res
        .status(400)
        .json({ message: "Valid chatRoomId and receiverId are required" });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Message content is required" });
    }

    const chatRoom = await ChatRoom.findById(chatRoomId).populate(
      "participants"
    );
    if (!chatRoom || !chatRoom.isActive) {
      return res
        .status(404)
        .json({ message: "Chat room not found or inactive" });
    }

    // Verify sender and receiver are participants
    if (
      !chatRoom.participants.some((p) => p._id.equals(senderId)) ||
      !chatRoom.participants.some((p) => p._id.equals(receiverId))
    ) {
      return res
        .status(403)
        .json({ message: "You are not authorized in this chat room" });
    }

    const message = new Message({
      chatRoom: chatRoomId,
      sender: senderId,
      receiver: receiverId,
      content: content.trim(),
    });

    await message.save();

    // Populate for response
    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name")
      .populate("receiver", "name")
      .populate("chatRoom", "participants application");

    return res.status(201).json({
      message: "Message sent successfully",
      message: populatedMessage,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
export const getMessages = async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const { page = 1, limit = 30 } = req.query;

    console.log("dasd");
    if (!chatRoomId) {
      return res.status(400).json({ message: "Chat room ID is required" });
    }

    // Pagination setup
    const skip = (page - 1) * limit;

    // Fetch messages
    const messages = await Message.find({ chatRoom: chatRoomId })
      .populate("sender", "name _id")
      .populate("receiver", "name _id")
      .sort({ createdAt: -1 }) // latest first

      .limit(parseInt(limit));

    // Mark undelivered messages as delivered
    const undeliveredIds = messages
      .filter((msg) => !msg.isDelivered && msg.receiver.equals(req.user._id))
      .map((msg) => msg._id);

    if (undeliveredIds.length > 0) {
      await Message.updateMany(
        { _id: { $in: undeliveredIds } },
        { $set: { isDelivered: true } }
      );
    }

    const totalMessages = await Message.countDocuments({
      chatRoom: chatRoomId,
    });

    return res.status(200).json({
      status: "success",
      page: parseInt(page),
      totalPages: Math.ceil(totalMessages / limit),
      totalMessages,
      messages,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve messages",
      error: error.message,
    });
  }
};

// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4Y2Q0M2EwMDY4YmIyNDY5NTg4YzA3MyIsImlhdCI6MTc2MDk4NTIxMSwiZXhwIjoxNzY4NzYxMjExfQ.67fX1Sf6qMryupDsN7qu5tobilhcz5gKvJyvFuxXMpM