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
      experienceYears,
      serviceCategories, // Expected: array of ServiceCategory ObjectIds
    } = req.body;

    // Basic required fields validation
    if (!tinNumber || !title) {
      return res.status(400).json({
        status: "fail",
        message: "TIN number and title are required.",
      });
    }

    // Optional: validate that serviceCategories is an array if provided
    if (serviceCategories && !Array.isArray(serviceCategories)) {
      return res.status(400).json({
        status: "fail",
        message: "serviceCategories must be an array of category IDs.",
      });
    }

    // Create the officer
    const officer = await Officer.create({
      tinNumber,
      title,

      // Note: serviceCategories is NOT stored on Officer model currently
      // We're only using it here to create assignments
    });

    // If serviceCategories were provided, create Assignment documents
    if (serviceCategories && serviceCategories.length > 0) {
      // Assume the creator is a super-admin/user — you may get this from req.user
      const assignedBy = req.user?._id; // Adjust based on your auth middleware

      if (!assignedBy) {
        // Fallback or error if no admin is available
        return res.status(400).json({
          status: "fail",
          message: "Assigned by (admin) is required to create assignments.",
        });
      }

      const assignments = serviceCategories.map((categoryId) => ({
        officer: officer._id,
        serviceCategory: categoryId,
        assignedBy,
        assignmentType: "OFFICER_CATEGORY",
        experienceYears: experienceYears || 0,
        // or "ADMIN_CATEGORY" if needed
        // experienceYears can be added later if required
      }));

      // Bulk create assignments (efficient)
      await Assignment.insertMany(assignments);
    }

    // Optionally populate the officer with assignments or categories before responding
    const populatedOfficer = await Officer.findById(officer._id)
      // .populate('assignments') // if you add a virtual or ref later
      .lean();

    return res.status(201).json({
      status: "success",
      data: { officer: populatedOfficer },
    });
  } catch (error) {
    // Handle unique constraint violation for tinNumber or duplicate assignments
    if (error.code === 11000) {
      if (error.keyPattern?.tinNumber) {
        return res.status(409).json({
          status: "fail",
          message: "An officer with this TIN number already exists.",
        });
      }
      if (error.keyPattern?.officer && error.keyPattern?.serviceCategory) {
        return res.status(409).json({
          status: "fail",
          message: "One or more service categories are already assigned to this officer.",
        });
      }
    }

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
