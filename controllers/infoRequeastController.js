import InfoRequest from "../models/InfoRequest.js"; // Fixed import name consistency
import ServiceCategory from "../models/serviceCategories.js";
import Application from "../models/application.js"; // Fixed import name

// CREATE Info Request
export const createInfoRequest = async (req, res) => {
  try {
    const { title, description, serviceCategory, price } = req.body;
    const user = req.user;

    // Validate required fields
    if (!title || !description || !serviceCategory || price === undefined) {
      return res.status(400).json({
        message: "Title, description, service category, and price are required",
      });
    }

    // Validate price
    if (price <= 0) {
      return res.status(400).json({ message: "Price must be greater than 0" });
    }

    // Validate serviceCategory exists (by ObjectId, not name!)
    const categoryExists = await ServiceCategory.findById(serviceCategory);
    if (!categoryExists) {
      return res.status(400).json({ message: "Invalid service category" });
    }

    // Create the info request
    // Note: requiredConnect will be auto-calculated in pre-save hook
    const infoRequest = await InfoRequest.create({
      title: title.trim(),
      description: description.trim(),
      serviceCategory,
      price,
      createdBy: user._id,
    });

    // Populate useful fields for response
    await infoRequest.populate("serviceCategory", "name");

    res.status(201).json({
      status: "success",
      message: "Info request created successfully",
      data: { infoRequest },
    });
  } catch (error) {
    console.error("Create info request error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET My Info Requests (created by logged-in user)
export const getMyInfoRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const infoRequests = await InfoRequest.find({ createdBy: userId })
      .populate("serviceCategory", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      count: infoRequests.length,
      data: { infoRequests },
    });
  } catch (error) {
    console.error("Get my info requests error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET All Info Requests (public/feed view)
export const getInfoRequests = async (req, res) => {
  try {
    const infoRequests = await InfoRequest.find({ status: { $ne: "cancelled" } })
      .populate("createdBy", "name profilePicture") // Adjust fields as needed
      .populate("serviceCategory", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      count: infoRequests.length,
      data: { infoRequests },
    });
  } catch (error) {
    console.error("Get info requests error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE Info Request
export const updateInfoRequest = async (req, res) => {
  try {
    const { infoId } = req.body; // Better to use params
    const updates = req.body; // { title?, description?, serviceCategory?, price? }

    if (!infoId) {
      return res.status(400).json({ message: "Info request ID is required" });
    }

    // Find the info request and verify ownership
    const infoRequest = await InfoRequest.findById(infoId);
    if (!infoRequest) {
      return res.status(404).json({ message: "Info request not found" });
    }

    // Optional: Only allow owner to update
    if (infoRequest.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this request" });
    }

    // Check if there are any approved applications
    const applications = await Application.find({ infoRequest: infoId });
    const hasApproved = applications.some(app => app.status === "Approved");

    if (hasApproved) {
      return res.status(400).json({
        message: "Cannot update info request because it has approved applications",
      });
    }

    // Validate serviceCategory if being updated
    if (updates.serviceCategory) {
      const categoryExists = await ServiceCategory.findById(updates.serviceCategory);
      if (!categoryExists) {
        return res.status(400).json({ message: "Invalid service category" });
      }
    }

    // Validate price if being updated
    if (updates.price !== undefined && updates.price <= 0) {
      return res.status(400).json({ message: "Price must be greater than 0" });
    }

    // Apply updates (only allowed fields)
    const allowedUpdates = ["title", "description", "serviceCategory", "price"];
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        infoRequest[field] = updates[field];
      }
    });

    // Save → triggers pre-save hook to recalculate requiredConnect
    const updatedInfo = await infoRequest.save();

    await updatedInfo.populate("serviceCategory", "name");

    res.status(200).json({
      status: "success",
      message: "Info request updated successfully",
      data: { infoRequest: updatedInfo },
    });
  } catch (error) {
    console.error("Update info request error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};