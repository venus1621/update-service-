// controllers/governmentInstitutionController.js
import GovernmentInstitution from "../models/GovernmentInstitution.js";
import mongoose from "mongoose";

// Standardized responses
const sendSuccess = (res, message, data = null) => {
  return res.status(200).json({
    success: true,
    message,
    data,
  });
};

const sendError = (res, statusCode, message, errors = null) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

// @desc    Create a new government institution (Admin only)
// @route   POST /api/government-institutions
// @access  Private (Admin)
export const createGovernmentInstitution = async (req, res) => {
  try {
    const allowedFields = {
      institutionName: req.body.institutionName?.trim(),
      region: req.body.region?.trim(),
      city: req.body.city?.trim(),
      address: req.body.address?.trim(),
      contactEmail: req.body.contactEmail?.toLowerCase().trim(),
      contactPhone: req.body.contactPhone?.trim(),
      websiteUrl: req.body.websiteUrl?.trim(),
      serviceCategories: req.body.serviceCategories,
      establishedYear: req.body.establishedYear,
      remarks: req.body.remarks?.trim(),
      status: req.body.status || "active",
    };

    // Remove undefined keys
    Object.keys(allowedFields).forEach(
      (key) => allowedFields[key] === undefined && delete allowedFields[key]
    );

    const institution = await GovernmentInstitution.create(allowedFields);

    return res.status(201).json({
      success: true,
      message: "Government institution created successfully",
      data: institution,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return sendError(res, 400, "Validation failed", errors);
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const value = error.keyValue[field];
      return sendError(res, 409, `An institution with this ${field} '${value}' already exists.`);
    }

    console.error("Create Institution Error:", error);
    return sendError(res, 500, "Failed to create institution");
  }
};

// @desc    Get all government institutions with filters & search (No pagination)
// @route   GET /api/government-institutions
// @access  Public
export const getGovernmentInstitutions = async (req, res) => {
  try {
    const { region, city, status, search, serviceCategory } = req.query;

    const query = { status: { $ne: "suspended" } }; // Hide suspended by default

    if (region) query.region = new RegExp(region, "i");
    if (city) query.city = new RegExp(city, "i");
    if (status && ["active", "inactive"].includes(status)) query.status = status;

    if (serviceCategory) {
      if (mongoose.Types.ObjectId.isValid(serviceCategory)) {
        query.serviceCategories = new mongoose.Types.ObjectId(serviceCategory);
      } else {
        return sendError(res, 400, "Invalid service category ID");
      }
    }

    if (search) {
      query.$or = [
        { institutionName: new RegExp(search, "i") },
        { address: new RegExp(search, "i") },
        { remarks: new RegExp(search, "i") },
        { contactEmail: new RegExp(search, "i") },
      ];
    }

    const institutions = await GovernmentInstitution.find(query)
      .populate("serviceCategories")
      .sort({ institutionName: 1 })
      .lean();

    return sendSuccess(res, "Institutions fetched successfully", institutions);
  } catch (error) {
    console.error("Get Institutions Error:", error);
    return sendError(res, 500, "Failed to fetch institutions");
  }
};

// @desc    Get single institution by ID
// @route   GET /api/government-institutions/:id
// @access  Public
export const getGovernmentInstitutionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid institution ID");
    }

    const institution = await GovernmentInstitution.findById(id)
      .populate("serviceCategories")
      .lean();

    if (!institution || institution.status === "suspended") {
      return sendError(res, 404, "Institution not found");
    }

    return sendSuccess(res, "Institution fetched successfully", institution);
  } catch (error) {
    console.error("Get Institution By ID Error:", error);
    return sendError(res, 500, "Server error");
  }
};

// @desc    Update institution (Admin only)
// @route   PATCH /api/government-institutions/:id
// @access  Private (Admin)
export const updateGovernmentInstitution = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid institution ID");
    }

    const updates = { ...req.body };
    delete updates.createdAt;
    delete updates.updatedAt;

    const institution = await GovernmentInstitution.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate("serviceCategories")
      .lean();

    if (!institution) {
      return sendError(res, 404, "Institution not found");
    }

    return sendSuccess(res, "Institution updated successfully", institution);
  } catch (error) {
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return sendError(res, 400, "Validation failed", errors);
    }

    if (error.code === 11000) {
      return sendError(res, 409, "Duplicate field value not allowed");
    }

    console.error("Update Institution Error:", error);
    return sendError(res, 500, "Failed to update institution");
  }
};

// @desc    Suspend institution (Admin only)
// @route   PATCH /api/government-institutions/:id/suspend
// @access  Private (Admin)
export const suspendGovernmentInstitution = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid institution ID");
    }

    const institution = await GovernmentInstitution.findByIdAndUpdate(
      id,
      { status: "suspended" },
      { new: true }
    );

    if (!institution) {
      return sendError(res, 404, "Institution not found");
    }

    return sendSuccess(res, "Institution suspended successfully", institution);
  } catch (error) {
    console.error("Suspend Institution Error:", error);
    return sendError(res, 500, "Failed to suspend institution");
  }
};

// @desc    Reactivate institution (Admin only)
// @route   PATCH /api/government-institutions/:id/reactivate
// @access  Private (Admin)
export const reactivateGovernmentInstitution = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid institution ID");
    }

    const institution = await GovernmentInstitution.findByIdAndUpdate(
      id,
      { status: "active" },
      { new: true }
    );

    if (!institution) {
      return sendError(res, 404, "Institution not found");
    }

    return sendSuccess(res, "Institution reactivated successfully", institution);
  } catch (error) {
    console.error("Reactivate Institution Error:", error);
    return sendError(res, 500, "Failed to reactivate institution");
  }
};