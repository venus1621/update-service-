import axios from "axios";
import mongoose from "mongoose";
import Application from "../models/application.js"; // Consistent casing with actual file name
import User from "../models/User.js"; // User is the default export in Models/User.js
import ChatRoom from "../models/ChatRoom.js"; // Fix folder casing for cross-platform

// 🔹 Initialize Chapa payment
export const initializeChapaPayment = async ({
  amount,
  currency,
  applicationId,
  user,
  payFor,
  connects, // Added for payFor === "conn"
}) => {
  const chapaSecretKey = process.env.CHAPA_SECRET_KEY;
  if (!chapaSecretKey) throw new Error("CHAPA_SECRET_KEY is not configured");

if (!amount || !currency) {
  throw new Error("amount and currency are required.");
}

if (!user?.name) {
  throw new Error("User name is required.");
}

// Build tx_ref differently depending on payFor
let txRef;
if (payFor === "app") {
  if (!applicationId)
    throw new Error("applicationId is required for application payments.");
  txRef = `app-${applicationId}-${Date.now()}`;
} else if (payFor === "conn") {
  if (!connects || isNaN(connects) || connects <= 0) {
    throw new Error("Valid connects amount is required for connect payments.");
  }
  txRef = `conn-${user._id}-${connects}-${Date.now()}`;
} else {
  throw new Error("Invalid payFor type.");
}


try {
  const response = await axios.post(
    "https://api.chapa.co/v1/transaction/initialize",
    {
      amount,
      currency,
      first_name: user.name,
      phone_number: user.phoneNumber,
      tx_ref: txRef,
      callback_url: `${process.env.SERVER_URL}/api/v1/chapa/chapa-webhook`,
      customization: {
        title: payFor === "app" ? "For Application" : "For Connects",
      },
    },
    {
      headers: {
        Authorization: `Bearer ${chapaSecretKey}`,
        "Content-Type": "application/json",
      },
    }
  );
console.log("Chapa initialization response:", response.data.data.checkout_url);
return {
  tx_ref: txRef,
  checkout_url: response.data.data.checkout_url,
};
} catch (error) {
  console.error(
    "Chapa payment initialization failed:",
    error.response?.data || error.message
  );
  throw error;
}
};

export const chapaWebhook = async (req, res) => {
  try {
    const { trx_ref, ref_id, status } = req.query;
    // Chapa sometimes sends the reference as `tx_ref` or `trx_ref` (observed in GET callbacks)

    console.log(req.query);

    if (!trx_ref) return res.status(400).json({ message: "Missing tx_ref" });

    console.log(trx_ref);
    
    // Verify with Chapa
    const verifyRes = await axios.get(
      `https://api.chapa.co/v1/transaction/verify/${trx_ref}`,
      { headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` } }
    );

    if (verifyRes.data?.status !== "success") {
      return res.status(400).json({ message: "Verification failed" });
    }

    // Chapa returns the transaction payload inside `data` property.
    // Prefer the nested `data` object but fall back to the whole response if needed.
    const paymentData = verifyRes.data?.data || verifyRes.data;
    
    const [prefix, entityId] = trx_ref.split("-");

    switch (prefix) {
      case "app":
        return handleApplicationPayment(entityId, paymentData, res);
      case "conn":
        return handleConnectPurchase(entityId, paymentData, res);
      default:
        return res.status(400).json({ message: "Unknown tx_ref format" });
    }
  } catch (err) {
    console.error("Error processing Chapa webhook:", err.response?.data || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const handleApplicationPayment = async (applicationId, paymentData, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: "Invalid applicationId" });
    }

    const application = await Application.findById(applicationId).populate({
    path: "infoRequest",
    populate: { path: "createdBy", select: "_id name phone_number" },
  });;
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (application.status === "approved") {
      return res.status(200).json({ message: "Application already approved" });
    }
    console.log(paymentData);

    application.status = "approved";

    application.transaction = {
      tx_ref: paymentData.tx_ref ,
      amount: paymentData.amount ,
     status:paymentData.status,
      paidAt: paymentData.created_at ,
     
    };

    await application.save();

    // Create chat room between applicant and infoRequest owner
    const applicantId = application.officer;
    const infoOwnerId = application.infoRequest.createdBy._id;

    let chatRoomId = null;
    if (!applicantId.equals(infoOwnerId)) { 
     
      const chatRoom = new ChatRoom({
        participants: [applicantId, infoOwnerId],
        application: application._id,
        infoRequestTitle: application.infoRequest.title,
        category: application.infoRequest.serviceCategory,
        price: application.price,
      });

      await chatRoom.save();
      chatRoomId = chatRoom._id;

      console.log(`Chat room created: ${chatRoom._id} for application ${applicationId}`);
    } else {
      console.warn("Applicant and info owner are the same user; skipping chat room creation");
    }

    return res.status(200).json({
      message: "Application payment verified and approved successfully",
      application,
      chatRoomId,
    });
  } catch (error) {
    console.error("Error in handleApplicationPayment:", error);
    return res.status(500).json({ message: "Failed to approve application", error: error.message });
  }
};

// Local connect price calculator (keeps logic in one place for webhook verification)
const connectCalculator = (connect) => {
  const oneConnect = parseFloat(process.env.ONE_CONNECT);

  if (isNaN(connect) || isNaN(oneConnect)) {
    throw new Error("Invalid input or environment value");
  }

  const amount = connect * oneConnect;
  return amount;
};

export const handleConnectPurchase = async (entityId, paymentData, res) => {
  try {
    // tx_ref format: conn-<userId>-<connects>-<timestamp>
    // entityId is userId from initial split, but we re-split for accuracy
    const txRefParts = paymentData.tx_ref.split("-");
    if (txRefParts[0] !== "conn" || txRefParts.length < 3) {
      return res.status(400).json({ message: "Invalid tx_ref format for connects" });
    }
    const userId = txRefParts[1];
    const connectsStr = txRefParts[2];
    const connects = parseInt(connectsStr, 10);
    if (isNaN(connects) || connects <= 0) {
      return res.status(400).json({ message: "Invalid connects value in tx_ref" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Idempotency check
    if (user.lastPaidTxRef === paymentData.tx_ref) {
      return res.status(200).json({ message: "Payment already processed", user });
    }

    // Verify amount matches expected calculation
    const expectedPrice = connectCalculator(connects);
    if (parseFloat(paymentData.amount) < expectedPrice) {
      return res.status(400).json({ message: "Payment amount mismatch" });
    }

    // Add connects
    user.connects += connects;
    user.lastPaidTxRef = paymentData.tx_ref;
    await user.save();

    return res.status(200).json({
      message: "Connect purchase verified and added successfully",
      user,
    });
  } catch (error) {
    console.error("Error in handleConnectPurchase:", error);
    return res.status(500).json({ message: "Failed to complete connect purchase", error: error.message });
  }
};

