import Bargain from "../models/Bargain.js";
import Application from "../models/application.js";

export const createBargain = async (req, res) => {
  const { applicationId, message, price } = req.body;
  const userId = req.user._id;

  const application = await Application.findById(applicationId);
  if (!application) {
    res.status(400).json({
      message: " There is no Application found ",
    });
  }

  const bargain = await Bargain.create({
    application: applicationId,
    proposed_price: price,
    message: message,
    createdBy: userId,
    officer: application.officer,
  });

  res.status(201).json({
    status: "success",
    message: "Bargain sent successfully",
    data: { bargain },
  });
};
