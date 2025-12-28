import Assignment from "../models/Assignment.js";
import Officer from "../models/Officer.js";
import ServiceCategory from "../models/serviceCategories.js";

/* ======================================================
   CREATE ASSIGNMENT
   (OFFICER_CATEGORY or ADMIN_CATEGORY)
====================================================== */
export const createAssignment = async (req, res, next) => {
  try {
    const {
      officer,
      serviceCategory,
      experienceYears = 0,
      assignmentType = "OFFICER_CATEGORY",
      reason,
    } = req.body;

    if (!serviceCategory) {
      return res.status(400).json({
        status: "fail",
        message: "Service category is required.",
      });
    }

    // Validate service category
    const categoryExists = await ServiceCategory.findById(serviceCategory);
    if (!categoryExists) {
      return res.status(404).json({
        status: "fail",
        message: "Service category not found.",
      });
    }

    /* ===============================
       OFFICER ↔ CATEGORY ASSIGNMENT
    ================================ */
    if (assignmentType === "OFFICER_CATEGORY") {
      if (!officer) {
        return res.status(400).json({
          status: "fail",
          message: "Officer is required for OFFICER_CATEGORY assignment.",
        });
      }

      const officerExists = await Officer.findById(officer);
      if (!officerExists) {
        return res.status(404).json({
          status: "fail",
          message: "Officer not found.",
        });
      }

      const assignment = await Assignment.create({
        officer,
        serviceCategory,
        experienceYears,
        assignmentType,
        assignedBy: req.user._id,
        reason,
      });

      return res.status(201).json({
        status: "success",
        data: { assignment },
      });
    }

    /* ===============================
       ADMIN ↔ CATEGORY ASSIGNMENT
    ================================ */
    if (assignmentType === "ADMIN_CATEGORY") {
      // Prevent duplicate active admin-category assignment
      const existing = await Assignment.findOne({
        serviceCategory,
        assignmentType: "ADMIN_CATEGORY",
        isActive: true,
      });

      if (existing) {
        return res.status(409).json({
          status: "fail",
          message: "This service category already has an active admin assignment.",
        });
      }

      const assignment = await Assignment.create({
        serviceCategory,
        assignmentType,
        assignedBy: req.user._id,
        reason,
      });

      return res.status(201).json({
        status: "success",
        data: { assignment },
      });
    }

    return res.status(400).json({
      status: "fail",
      message: "Invalid assignment type.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        status: "fail",
        message: "Duplicate active assignment detected.",
      });
    }
    next(error);
  }
};

/* ======================================================
   GET ALL ASSIGNMENTS
====================================================== */
export const getAllAssignments = async (req, res, next) => {
  try {
    const { officer, serviceCategory, assignmentType } = req.query;

    const filter = {};
    if (officer) filter.officer = officer;
    if (serviceCategory) filter.serviceCategory = serviceCategory;
    if (assignmentType) filter.assignmentType = assignmentType;

    const assignments = await Assignment.find(filter)
      .populate("officer", "title rating verified")
      .populate("serviceCategory", "name description")
      .populate("assignedBy", "name role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      results: assignments.length,
      data: { assignments },
    });
  } catch (error) {
    next(error);
  }
};

/* ======================================================
   GET SINGLE ASSIGNMENT
====================================================== */
export const getAssignmentById = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate("officer", "title rating verified")
      .populate("serviceCategory", "name description")
      .populate("assignedBy", "name role");

    if (!assignment) {
      return res.status(404).json({
        status: "fail",
        message: "Assignment not found.",
      });
    }

    res.status(200).json({
      status: "success",
      data: { assignment },
    });
  } catch (error) {
    next(error);
  }
};

/* ======================================================
   UPDATE ASSIGNMENT (SAFE FIELDS ONLY)
====================================================== */
export const updateAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        status: "fail",
        message: "Assignment not found.",
      });
    }

    const allowedUpdates = ["experienceYears", "reason"];
    allowedUpdates.forEach((field) => {
      if (field in req.body) assignment[field] = req.body[field];
    });

    await assignment.save();

    res.status(200).json({
      status: "success",
      data: { assignment },
    });
  } catch (error) {
    next(error);
  }
};

/* ======================================================
   UNASSIGN (SOFT REMOVE)
====================================================== */
export const unassignAssignment = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        status: "fail",
        message: "Assignment not found.",
      });
    }

    if (!assignment.isActive) {
      return res.status(400).json({
        status: "fail",
        message: "Assignment is already inactive.",
      });
    }

    await assignment.unassign(reason);

    res.status(200).json({
      status: "success",
      message: "Assignment unassigned successfully.",
      data: { assignment },
    });
  } catch (error) {
    next(error);
  }
};
