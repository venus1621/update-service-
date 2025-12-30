import mongoose from "mongoose";

const { Schema } = mongoose;

const governmentInstitutionSchema = new Schema(
  {
    // Official government name
    institutionName: {
      type: String,
      required: [true, "Institution name is required"],
      trim: true,
      index: true,
    },

    // Location details
    region: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    city: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    // Official contact information
    contactEmail: {
      type: String,
      required: [true, "Official contact email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
      index: true,
    },

    contactPhone: {
      type: String,
      trim: true,
    },

    // Digital presence
    websiteUrl: {
      type: String,
      trim: true,
    },

    // Services offered by this institution
    serviceCategories: [
      {
        type: Schema.Types.ObjectId,
        ref: "ServiceCategory",
      },
    ],

    // Operational status
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
      index: true,
    },

    // Ownership / authority metadata
    establishedYear: {
      type: Number,
    },

    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "GovernmentInstitution",
  governmentInstitutionSchema
);
