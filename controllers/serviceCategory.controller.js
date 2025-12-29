import ServiceCategory from "../models/serviceCategories.js";

/**
 * CREATE Service Category
 * POST /api/service-categories
 */
export const createServiceCategory = async (req, res) => {
  try {
    const { name, description} = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Service category name is required",
      });
    }

    const normalizedName = name.trim().toLowerCase();

    const exists = await ServiceCategory.findOne({ name: normalizedName });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Service category already exists",
      });
    }

    const category = await ServiceCategory.create({
      name: normalizedName,
      description,
    });

    return res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Create Service Category Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create service category",
    });
  }
};

/**
 * GET ALL Service Categories
 * GET /api/service-categories
 */
export const getAllServiceCategories = async (req, res) => {
  try {
    const categories = await ServiceCategory.find()
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    console.error("Get All Service Categories Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch service categories",
    });
  }
};

/**
 * GET SINGLE Service Category
 * GET /api/service-categories/:id
 */
export const getServiceCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await ServiceCategory.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Service category not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Get Service Category Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch service category",
    });
  }
};

/**
 * UPDATE Service Category
 * PUT /api/service-categories/:id
 */
export const updateServiceCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const updateData = {};

    if (name) updateData.name = name.trim().toLowerCase();
    if (description !== undefined) updateData.description = description;
    if (typeof isActive === "boolean") updateData.isActive = isActive;

    const category = await ServiceCategory.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Service category not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Update Service Category Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update service category",
    });
  }
};

/**
 * DELETE Service Category (Soft Delete)
 * DELETE /api/service-categories/:id
 */
export const deleteServiceCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await ServiceCategory.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Service category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service category disabled successfully",
    });
  } catch (error) {
    console.error("Delete Service Category Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete service category",
    });
  }
};
