import { ChatRoom } from "../models/ChatRoom"; // Adjust the path based on your project structure

// Controller to get all chat rooms for the authenticated user
export const getUserChatRooms = async (req, res) => {
  try {
    const userId = req.user._id; // Assuming user is authenticated and req.user is set (e.g., via middleware)
    // Find all active chat rooms where the user is a participant
    const chatRooms = await ChatRoom.find({
      participants: userId,
      isActive: true,
    })
      .populate({
        path: "participants",
        select: "name  profile_image", // Populate relevant user fields (adjust as needed, e.g., name, profile picture)
      })
      .populate({
        path: "application",
        select: "title status", // Populate relevant application fields if needed (adjust as per your Application model)
      })
      .sort({ updatedAt: -1 }); // Sort by most recently updated first

    // Optional: Format the response to highlight the other participant
    const formattedChatRooms = chatRooms.map((room) => {
      const otherParticipant = room.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );
      return {
        ...room.toObject(),
        otherParticipant, // Add the other participant's details for easier frontend handling
      };
    });

    res.status(200).json({
      success: true,
      chatRooms: formattedChatRooms,
    });
  } catch (error) {
    console.error("Error fetching user chat rooms:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chat rooms",
      error: error.message,
    });
  }
};