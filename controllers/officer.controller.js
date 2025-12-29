import Officer from "../models/Officer.js";

/* ======================================================
   UTILS
====================================================== */

/**
 * Remove forbidden fields from update payload
 * (required fields must NEVER be changed)
 */
const FORBIDDEN_UPDATE_FIELDS = [
  "tinNumber",      // immutable identifier
  "verified",       // admin-only
  "verifiedAt",     // admin-only
  "verifiedBy",     // admin-only
  "rating",         // calculated field
  "reviewCount",    // calculated field
  "isActive",       // admin-only (use suspend method)
  "suspendedAt",    // system-managed
  "createdAt",      // system-managed
  "updatedAt",      // system-managed
];

const sanitizeUpdatePayload = (payload) => {
  const sanitized = { ...payload };
  FORBIDDEN_UPDATE_FIELDS.forEach((field) => {
    delete sanitized[field];
  });
  return sanitized;
};

/* ======================================================
   CREATE OFFICER
====================================================== */
/**
 * Required fields:
 * - tinNumber
 * - title
 */
export const createOfficer = async (req, res, next) => {
  try {
    const {
      tinNumber,
      title,
      bio,
      priceMin,
      priceMax,
      isAvailable,
    } = req.body;

    if (!tinNumber || !title) {
      return res.status(400).json({
        status: "fail",
        message: "TIN number and title are required.",
      });
    }

    const officer = await Officer.create({
      tinNumber,
      title,
      bio,
      priceMin,
      priceMax,
      isAvailable,
    });

    return res.status(201).json({
      status: "success",
      data: { officer },
    });
  } catch (error) {
    next(error);
  }
};

/* ======================================================
   GET ALL OFFICERS
====================================================== */
export const getAllOfficers = async (req, res, next) => {
  try {
    const officers = await Officer.find().sort({
      verified: -1,
      rating: -1,
      createdAt: -1,
    });

    res.status(200).json({
      status: "success",
      results: officers.length,
      data: { officers },
    });
  } catch (error) {
    next(error);
  }
};

/* ======================================================
   GET SINGLE OFFICER
====================================================== */
export const getOfficerById = async (req, res, next) => {
  try {
    const officer = await Officer.findById(req.params.id);

    if (!officer) {
      return res.status(404).json({
        status: "fail",
        message: "Officer not found.",
      });
    }

    res.status(200).json({
      status: "success",
      data: { officer },
    });
  } catch (error) {
    next(error);
  }
};

/* ======================================================
   UPDATE OFFICER (SAFE UPDATE)
   ❌ Required fields cannot be changed
====================================================== */
export const updateOfficer = async (req, res, next) => {
  try {
    const officer = await Officer.findById(req.params.id);

    if (!officer) {
      return res.status(404).json({
        status: "fail",
        message: "Officer not found.",
      });
    }

    const sanitizedPayload = sanitizeUpdatePayload(req.body);

    Object.keys(sanitizedPayload).forEach((key) => {
      officer[key] = sanitizedPayload[key];
    });

    await officer.save();

    res.status(200).json({
      status: "success",
      data: { officer },
    });
  } catch (error) {
    next(error);
  }
};

/* ======================================================
   VERIFY OFFICER (ADMIN)
====================================================== */
export const verifyOfficer = async (req, res, next) => {
  try {
    const officer = await Officer.findById(req.params.id);

    if (!officer) {
      return res.status(404).json({
        status: "fail",
        message: "Officer not found.",
      });
    }

    await officer.verify(req.user._id);

    res.status(200).json({
      status: "success",
      message: "Officer verified successfully.",
      data: { officer },
    });
  } catch (error) {
    next(error);
  }
};

/* ======================================================
   SUSPEND OFFICER (ADMIN)
====================================================== */
export const suspendOfficer = async (req, res, next) => {
  try {
    const officer = await Officer.findById(req.params.id);

    if (!officer) {
      return res.status(404).json({
        status: "fail",
        message: "Officer not found.",
      });
    }

    await officer.suspend();

    res.status(200).json({
      status: "success",
      message: "Officer suspended successfully.",
      data: { officer },
    });
  } catch (error) {
    next(error);
  }
};
