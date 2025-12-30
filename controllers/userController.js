import User from "../models/User.js";
import Officer from "../models/Officer.js";
import GovernmentInstitution from "../models/GovernmentInstitution.js";
import mongoose from "mongoose";

// Standardized responses
const sendSuccess = (res, message, data = null, meta = null) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  if (meta) response.meta = meta;
  return res.status(200).json(response);
};

const sendError = (res, statusCode, message, errors = null) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

// @desc    Get users by role (with filters & search)
// @route   GET /api/users?role=citizen&search=john&limit=20
// @access  Private/Admin
export const getUsersByRole = async (req, res) => {
  try {
    const {
      role,
      search,
      isOnline,
      isPhoneVerified,
      sort = "-createdAt",
      limit = 50,
    } = req.query;

    // Only allow valid roles
    const validRoles = ["citizen", "officer", "admin", "super-admin"];
    if (role && !validRoles.includes(role)) {
      return sendError(res, 400, "Invalid role specified");
    }

    const query = { active: true };

    if (role) query.role = role;
    if (isOnline !== undefined) query.isOnline = isOnline === "true";
    if (isPhoneVerified !== undefined)
      query.isPhoneVerified = isPhoneVerified === "true";

    if (search) {
      query.$or = [
        { name: new RegExp(search, "i") },
        { phoneNumber: new RegExp(search, "i") },
      ];
    }

    const users = await User.find(query)
      .select("-password -permissions") // Hide sensitive fields
      .populate({
        path: "officer",
        select: "title tinNumber serviceCategory",
        populate: { path: "serviceCategory", select: "name" },
      })
      .populate({
        path: "institution",
        select: "institutionName region contactEmail",
      })
      .sort(sort)
      .limit(parseInt(limit))
      .lean();

    return sendSuccess(res, "Users fetched successfully", users, {
      total: users.length,
      filteredBy: { role, search },
    });
  } catch (error) {
    console.error("Get Users By Role Error:", error);
    return sendError(res, 500, "Failed to fetch users");
  }
};

// @desc    Assign officer role & link to Officer document
// @route   PATCH /api/users/:id/assign-officer
// @access  Private/Admin
export const assignOfficerRole = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { officerId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(officerId)) {
      return sendError(res, 400, "Invalid user or officer ID");
    }

    const [user, officer] = await Promise.all([
      User.findById(id).session(session),
      Officer.findById(officerId).session(session),
    ]);

    if (!user || !user.active) {
      return sendError(res, 404, "User not found or inactive");
    }

    if (!officer || !officer.isActive) {
      return sendError(res, 404, "Officer profile not found or inactive");
    }

    // Prevent duplicate assignment
    if (user.role === "officer" && user.officer?.toString() === officerId) {
      await session.abortTransaction();
      return sendError(res, 400, "This user is already assigned to this officer profile");
    }

    // Revoke previous officer role if switching
    if (user.role === "officer") {
      user.officer = null;
    }

    user.role = "officer";
    user.officer = officerId;
    await user.save({ session });

    await session.commitTransaction();

    const updatedUser = await User.findById(id)
      .populate("officer", "title tinNumber serviceCategory")
      .lean();

    return sendSuccess(res, "Officer role assigned successfully", updatedUser);
  } catch (error) {
    await session.abortTransaction();
    console.error("Assign Officer Error:", error);
    if (error.code === 11000) {
      return sendError(res, 400, "This officer profile is already assigned to another user");
    }
    return sendError(res, 500, "Failed to assign officer role");
  } finally {
    session.endSession();
  }
};

// @desc    Revoke officer role
// @route   PATCH /api/users/:id/revoke-officer
// @access  Private/Admin
export const revokeOfficerRole = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid user ID");
    }

    const user = await User.findById(id);

    if (!user || !user.active) {
      return sendError(res, 404, "User not found or inactive");
    }

    if (user.role !== "officer") {
      return sendError(res, 400, "User is not an officer");
    }

    user.role = "citizen";
    user.officer = null;
    await user.save();

    return sendSuccess(res, "Officer role revoked successfully", {
      userId: user._id,
      name: user.name,
      previousRole: "officer",
      newRole: "citizen",
    });
  } catch (error) {
    console.error("Revoke Officer Error:", error);
    return sendError(res, 500, "Failed to revoke officer role");
  }
};

// @desc    Assign institution to admin/super-admin
// @route   PATCH /api/users/:id/assign-institution
// @access  Private/Super-Admin only
export const assignInstitutionToAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { institutionId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(institutionId)) {
      return sendError(res, 400, "Invalid user or institution ID");
    }

    const [user, institution] = await Promise.all([
      User.findById(id),
      GovernmentInstitution.findById(institutionId),
    ]);

    if (!user || !user.active) {
      return sendError(res, 404, "User not found or inactive");
    }

    if (!["admin", "super-admin"].includes(user.role)) {
      return sendError(res, 403, "Only admins can be assigned to institutions");
    }

    if (!institution || institution.status !== "active") {
      return sendError(res, 404, "Institution not found or not active");
    }

    user.institution = institutionId;
    await user.save();

    const updatedUser = await User.findById(id)
      .populate("institution", "institutionName region contactEmail")
      .lean();

    return sendSuccess(res, "Institution assigned successfully", updatedUser);
  } catch (error) {
    console.error("Assign Institution Error:", error);
    return sendError(res, 500, "Failed to assign institution");
  }
};

// @desc    Revoke institution from admin
// @route   PATCH /api/users/:id/revoke-institution
// @access  Private/Super-Admin
export const revokeInstitutionFromAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid user ID");
    }

    const user = await User.findById(id);

    if (!user || !user.active) {
      return sendError(res, 404, "User not found or inactive");
    }

    if (!user.institution) {
      return sendError(res, 400, "User has no assigned institution");
    }

    user.institution = null;
    await user.save();

    return sendSuccess(res, "Institution revoked successfully", {
      userId: user._id,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error("Revoke Institution Error:", error);
    return sendError(res, 500, "Failed to revoke institution");
  }
};