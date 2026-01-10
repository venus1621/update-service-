// controllers/applicationController.js
import Application from "../models/application.js";
import InfoRequest from "../models/InfoRequest.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { initializeChapaPayment } from "../utils/chapa.js"; // Fixed path convention

// GET: Applications for a specific InfoRequest (for the requester)
export const getApplicationsByInfoRequest = async (req, res) => {
  try {
    const infoRequestId = req.params.infoRequest;
    console.log("Fetching applications for InfoRequest ID:", req.params);
    console.log(infoRequestId);
    if (!mongoose.Types.ObjectId.isValid(infoRequestId)) {
      return res.status(400).json({ message: "Invalid infoRequest ID" });
    }

    const applications = await Application.find({ infoRequest: infoRequestId })
      .populate({
        path: "officer",
        select: "name profile_image preferred_language",
        populate: {
          path: "officerData",
          select: "title department experience bio rating averageRating",
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      count: applications.length,
      data: { applications },
    });
  } catch (error) {
    console.error("Error fetching applications:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET: Applications made by the logged-in officer
export const getApplicationsByOfficer = async (req, res) => {
  try {
    const officerId = req.user._id;

    const applications = await Application.find({ officer: officerId })
      .populate({
        path: "infoRequest",
        populate: { path: "serviceCategory", select: "name" },
      })
      .populate("officer", "name profile_image")
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      count: applications.length,
      data: { applications },
    });
  } catch (error) {
    console.error("Error fetching officer applications:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// POST: Create new application (officer applies to info request)
export const createApplication = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { infoRequest: infoRequestId, proposal, price: rawPrice } = req.body;
    const price = Number(rawPrice);
    const officerId = req.user._id;

    // Validation
    if (!infoRequestId || !proposal?.trim() || isNaN(price) || price <= 0) {
      return res.status(400).json({
        message: "Valid infoRequest ID, proposal, and positive price are required",
      });
    }

    // Fetch InfoRequest with session
    const infoRequest = await InfoRequest.findById(infoRequestId).session(session);
    if (!infoRequest) {
      return res.status(404).json({ message: "Info request not found" });
    }

    if (["completed", "cancelled"].includes(infoRequest.status)) {
      return res.status(400).json({
        message: "Cannot apply to a completed or cancelled request",
      });
    }

    // Check officer role
    const officer = await User.findById(officerId).session(session);
    if (!officer || officer.role !== "officer") {
      return res.status(403).json({ message: "Only officers can apply" });
    }

    // Prevent duplicate application
    const existing = await Application.findOne({
      infoRequest: infoRequestId,
      officer: officerId,
    }).session(session);

    if (existing) {
      return res.status(400).json({ message: "You have already applied to this request" });
    }

    // Check connects balance
    if (officer.connects < infoRequest.requiredConnect) {
      return res.status(400).json({ message: "Insufficient connects to apply" });
    }

    // Deduct connects
    officer.connects -= infoRequest.requiredConnect;
    await officer.save({ session });

    // Create application
    const application = await Application.create(
      [{
        infoRequest: infoRequestId,
        officer: officerId,
        price,
        proposal: proposal.trim(),
      }],
      { session }
    );

    await session.commitTransaction();

    // Populate for response
    await application[0].populate([
      { path: "infoRequest", select: "title price requiredConnect" },
      { path: "officer", select: "name profile_image" },
    ]);

    res.status(201).json({
      status: "success",
      message: "Application submitted successfully",
      data: { application: application[0] },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Create application error:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    session.endSession();
  }
};

// PATCH: Update pending application (officer can edit price/proposal)
export const updateApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { price, proposal } = req.body;
    const officerId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: "Invalid application ID" });
    }

    const application = await Application.findById(applicationId);

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (application.officer.toString() !== officerId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (application.status !== "pending") {
      return res.status(400).json({ message: "Only pending applications can be updated" });
    }

    if (price !== undefined) application.price = Number(price);
    if (proposal?.trim()) application.proposal = proposal.trim();

    await application.save();

    res.status(200).json({
      status: "success",
      message: "Application updated successfully",
      data: { application },
    });
  } catch (error) {
    console.error("Update application error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// POST: Reject application (requester rejects)
export const rejectApplication = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { applicationId } = req.body;
    const requesterId = req.user._id;

    const application = await Application.findById(applicationId)
      .populate("infoRequest", "createdBy")
      .session(session);

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (!application.infoRequest.createdBy.equals(requesterId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (application.status !== "pending") {
      return res.status(400).json({ message: `Application is already ${application.status}` });
    }

    // Refund connects
    await User.updateOne(
      { _id: application.officer },
      { $inc: { connects: application.infoRequest.requiredConnect } },
      { session }
    );

    application.status = "rejected";
    await application.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      status: "success",
      message: "Application rejected and connects refunded",
      data: { application },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Reject application error:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    session.endSession();
  }
};

// POST: Accept application → initiate payment
export const acceptApplication = async (req, res) => {
  try {
    const { applicationId } = req.body;
    const requesterId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: "Valid applicationId required" });
    }

    const application = await Application.findById(applicationId)
      .populate("infoRequest", "createdBy status")
      .populate("officer", "name email phone_number");

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (!application.infoRequest.createdBy.equals(requesterId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (application.status !== "pending") {
      return res.status(400).json({ message: `Application is already ${application.status}` });
    }

    if (application.infoRequest.status !== "pending") {
      return res.status(400).json({ message: "Info request is no longer active" });
    }

    // Initialize Chapa payment
    const chapaResponse = await initializeChapaPayment({
      amount: application.price,
      currency: "ETB",
      applicationId: application._id,
      user: {
        name: application.officer.name,
        email: application.officer.email,
        phone_number: application.officer.phone_number,
      },
      payFor: "application", // or "service"
      title: `Payment for service application`,
    });

    // Optionally: mark as "payment-pending" or keep pending until webhook confirms
    // For now, we just return payment link

    res.status(200).json({
      status: "success",
      message: "Application accepted. Proceed with payment.",
      data: {
        paymentUrl: chapaResponse.data.checkout_url,
        tx_ref: chapaResponse.data.tx_ref,
        application,
      },
    });
  } catch (error) {
    console.error("Accept application error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export default {
  getApplicationsByInfoRequest,
  getApplicationsByOfficer,
  createApplication,
  updateApplication,
  rejectApplication,
  acceptApplication,
};