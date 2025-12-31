import User from "../models/User.js";
import Officer from "../models/Officer.js";
import GovernmentInstitution from "../models/GovernmentInstitution.js";
import mongoose from "mongoose";

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

    const validRoles = ["citizen", "officer", "admin", "super-admin"];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role specified" });
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

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: users,
      meta: { total: users.length, filteredBy: { role, search } },
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch users" });
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
      return res.status(400).json({ success: false, message: "Invalid user or officer ID" });
    }

    const [user, officer] = await Promise.all([
      User.findById(id).session(session),
      Officer.findById(officerId).session(session),
    ]);

    if (!user || !user.active) {
      return res.status(404).json({ success: false, message: "User not found or inactive" });
    }

    if (!officer || !officer.isActive) {
      return res.status(404).json({ success: false, message: "Officer profile not found or inactive" });
    }

    // Prevent duplicate assignment
    if (user.role === "officer" && user.officer?.toString() === officerId) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "This user is already assigned to this officer profile" });
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

    return res.status(200).json({ success: true, message: "Officer role assigned successfully", data: updatedUser });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error:", error);
    return res.status(500).json({ success: false, message: "Failed to assign officer role" });
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
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const user = await User.findById(id);

    if (!user || !user.active) {
      return res.status(404).json({ success: false, message: "User not found or inactive" });
    }

    if (user.role !== "officer") {
      return res.status(400).json({ success: false, message: "User is not an officer" });
    }

    user.role = "citizen";
    user.officer = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Officer role revoked successfully",
      data: { userId: user._id, name: user.name, previousRole: "officer", newRole: "citizen" },
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ success: false, message: "Failed to revoke officer role" });
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
      return res.status(400).json({ success: false, message: "Invalid user or institution ID" });
    }

    const [user, institution] = await Promise.all([
      User.findById(id),
      GovernmentInstitution.findById(institutionId),
    ]);

    if (!user || !user.active) {
      return res.status(404).json({ success: false, message: "User not found or inactive" });
    }

    if (!["admin", "super-admin"].includes(user.role)) {
      return res.status(403).json({ success: false, message: "Only admins can be assigned to institutions" });
    }

    if (!institution || institution.status !== "active") {
      return res.status(404).json({ success: false, message: "Institution not found or not active" });
    }

    user.institution = institutionId;
    await user.save();

    const updatedUser = await User.findById(id)
      .populate("institution", "institutionName region contactEmail")
      .lean();

    return res.status(200).json({ success: true, message: "Institution assigned successfully", data: updatedUser });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ success: false, message: "Failed to assign institution" });
  }
};

// @desc    Create admin user
// @route   POST /api/users/create-admin
// @access  Private/Super-Admin
export const createAdmin = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      name,
      phoneNumber,
      password,
      passwordConfirm,
      role, // default to 'admin', allow 'super-admin'
      institutionId, // optional: assign institution immediately
    } = req.body;

    // Validation
    if (!name || !phoneNumber || !password || !passwordConfirm) {
      return res.status(400).json({ success: false, message: "Please provide name, phoneNumber, password, and passwordConfirm" });
    }

    if (password !== passwordConfirm) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    if (!["admin", "super-admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Role must be 'admin' or 'super-admin'" });
    }

    // Check if phone already registered
    const existingUser = await User.findOne({ phoneNumber }).session(session);
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Phone number already registered" });
    }

    // Validate institution if provided
    let institution = null;
    if (institutionId) {
      if (!mongoose.Types.ObjectId.isValid(institutionId)) {
        return res.status(400).json({ success: false, message: "Invalid institution ID" });
      }
      institution = await GovernmentInstitution.findById(institutionId);
      if (!institution || institution.status !== "active") {
        return res.status(404).json({ success: false, message: "Active institution not found" });
      }
    }

    // Create the admin user
    const adminUser = await User.create(
      [
        {
          name: name.trim(),
          phoneNumber: phoneNumber.trim(),
          password,
          passwordConfirm, // virtual field for validation
          role,
          institution: institutionId || null,
          isPhoneVerified: true, // admins are trusted, skip verification
        },
      ],
      { session }
    );

    const newAdmin = adminUser[0];

    // Remove password from output
    newAdmin.password = undefined;
    newAdmin._passwordConfirm = undefined;

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: `${role.replace("-", " ")} created successfully`,
      data: {
        userId: newAdmin._id,
        name: newAdmin.name,
        phoneNumber: newAdmin.phoneNumber,
        role: newAdmin.role,
        institution: newAdmin.institution,
        createdAt: newAdmin.createdAt,
      },
    });
  } catch (error) {
    await session.abortTransaction();

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ success: false, message: "Validation failed", errors });
    }

    console.error("Create Admin Error:", error);
    return res.status(500).json({ success: false, message: "Failed to create admin account" });
  } finally {
    session.endSession();
  }
};

// @desc    Revoke institution from admin
// @route   PATCH /api/users/:id/revoke-institution
// @access  Private/Super-Admin
export const revokeInstitutionFromAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const user = await User.findById(id);

    if (!user || !user.active) {
      return res.status(404).json({ success: false, message: "User not found or inactive" });
    }

    if (!user.institution) {
      return res.status(400).json({ success: false, message: "User has no assigned institution" });
    }

    user.institution = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Institution revoked successfully",
      data: { userId: user._id, name: user.name, role: user.role },
    });
  } catch (error) {
    console.error("Revoke Institution Error:", error);
    return res.status(500).json({ success: false, message: "Failed to revoke institution" });
  }
};
