import Officer from "../models/Officer.js";
import mongoose from "mongoose";

/* =========================================================
   CREATE OFFICER (Only required fields allowed)
   ========================================================= */
export const createOfficer = async (req, res) => {
  try {
    const { tinNumber, title, serviceCategory, institution } = req.body;

    // Only allow the explicitly permitted fields during creation
    const allowedFields = {
      tinNumber,
      title,
      institution,
      serviceCategory,
    };

    // Log for debugging (fixed typo)
    console.log("Service Category ID:", serviceCategory);
    console.log("institution ", institution);
    // Let Mongoose handle validation (required fields, types, uniqueness, etc.)
    const officer = await Officer.create(allowedFields);

    res.status(201).json({
      success: true,
      message: "Officer created successfully",
      data: officer,
    });
  } catch (error) {
    // Handle Mongoose validation errors more gracefully
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }

    // Handle duplicate TIN (unique index violation)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "An officer with this TIN number already exists",
      });
    }

    // Generic error (don't expose internal details in production)
    res.status(500).json({
      success: false,
      message: "Failed to create officer",
      // Optionally include error.message only in development
      // error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
/* =========================================================
   GET ALL OFFICERS (Active only - middleware handles this)
   ========================================================= */
export const getAllOfficers = async (req, res) => {
  try {
    const officers = await Officer.find()
      .populate("serviceCategory")
      .populate("institution")
      .sort({ rating: -1 });

    res.status(200).json({
      success: true,
      count: officers.length,
      data: officers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   GET SINGLE OFFICER
   ========================================================= */
export const getOfficerById = async (req, res) => {
  try {
    const officer = await Officer.findById(req.params.id)
      .populate("serviceCategory", "name")
      .populate("institution");

    if (!officer) {
      return res.status(404).json({
        success: false,
        message: "Officer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: officer,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Invalid officer ID",
    });
  }
};

/* =========================================================
   UPDATE OFFICER (Officer can update OPTIONAL fields only)
   ========================================================= */
export const updateOfficer = async (req, res) => {
  try {
    const allowedFields = ["bio", "experienceYears", "priceMin", "priceMax"];

    const updates = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }

    const officer = await Officer.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!officer) {
      return res.status(404).json({
        success: false,
        message: "Officer not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Officer updated successfully",
      data: officer,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   SUPER ADMIN UPDATE (Can update EVERYTHING)
   ========================================================= */
export const superAdminUpdateOfficer = async (req, res) => {
  try {
    const officer = await Officer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!officer) {
      return res.status(404).json({
        success: false,
        message: "Officer not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Officer updated by super admin",
      data: officer,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   VERIFY OFFICER (Admin action)
   ========================================================= */
export const verifyOfficer = async (req, res) => {
  try {
    const officer = await Officer.findById(req.params.id);

    if (!officer) {
      return res.status(404).json({
        success: false,
        message: "Officer not found",
      });
    }

    await officer.verify(req.user.id);

    res.status(200).json({
      success: true,
      message: "Officer verified successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   SUSPEND OFFICER
   ========================================================= */
export const suspendOfficer = async (req, res) => {
  try {
    const officer = await Officer.findById(req.params.id);

    if (!officer) {
      return res.status(404).json({
        success: false,
        message: "Officer not found",
      });
    }

    await officer.suspend();

    res.status(200).json({
      success: true,
      message: "Officer suspended successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   DELETE OFFICER (Hard delete - Super Admin)
   ========================================================= */
export const deleteOfficer = async (req, res) => {
  try {
    const officer = await Officer.findByIdAndDelete(req.params.id);

    if (!officer) {
      return res.status(404).json({
        success: false,
        message: "Officer not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Officer deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
