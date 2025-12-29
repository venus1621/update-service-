// models/User.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import googleLibPhoneNumber from "google-libphonenumber";

const phoneUtil = googleLibPhoneNumber.PhoneNumberUtil.getInstance();

const userSchema = new mongoose.Schema(
  {
    /* -------------------- Identity -------------------- */

    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
    },

    profileImage: {
      type: String,
      default:
        "https://res.cloudinary.com/drinuph9d/image/upload/v1752830842/800px-User_icon_2.svg_vi5e9d.png",
    },

    preferredLanguage: {
      type: String,
      enum: ["Amharic", "English", "Oromo", "Tigrinya"],
      default: "Amharic",
    },

    /* -------------------- Security -------------------- */

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },

    passwordChangedAt: {
      type: Date,
    },

    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    /* -------------------- Access Control -------------------- */

    role: {
      type: String,
      enum: ["citizen", "officer", "admin", "super-admin"],
      default: "citizen",
      index: true,
    },

    permissions: {
      type: [String],
      default: [],
      select: false,
    },

    /* -------------------- Status & Lifecycle -------------------- */

    isOnline: {
      type: Boolean,
      default: false,
    },

    lastSeenAt: {
      type: Date,
    },

    active: {
      type: Boolean,
      default: true,
      select: false,
    },

    deletedAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* -------------------- Indexes -------------------- */

// Note: phoneNumber already has unique: true in schema definition
userSchema.index({ role: 1, active: 1 });

/* -------------------- Virtuals -------------------- */

// Password confirmation (not stored)
userSchema.virtual("passwordConfirm").set(function (value) {
  this._passwordConfirm = value;
});

/* -------------------- Validation -------------------- */

userSchema.pre("validate", function (next) {
  if (this.isModified("password") || this.isNew) {
    if (this.password !== this._passwordConfirm) {
      this.invalidate("passwordConfirm", "Passwords do not match");
    }
  }
  next();
});

/* -------------------- Middleware -------------------- */

// Normalize Ethiopian phone number to E.164
userSchema.pre("save", function (next) {
  if (!this.isModified("phoneNumber")) return next();

  try {
    const parsed = phoneUtil.parse(this.phoneNumber, "ET");
    if (!phoneUtil.isValidNumber(parsed)) {
      this.invalidate("phoneNumber", "Invalid phone number");
    }
    this.phoneNumber = phoneUtil.format(
      parsed,
      googleLibPhoneNumber.PhoneNumberFormat.E164
    );
    next();
  } catch {
    this.invalidate("phoneNumber", "Invalid phone number");
    next();
  }
});

// Hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);

  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000;
  }

  next();
});

// Hide inactive users automatically
userSchema.pre(/^find/, function (next) {
  this.where({ active: { $ne: false } });
  next();
});

/* -------------------- Methods -------------------- */

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changed = Math.floor(this.passwordChangedAt.getTime() / 1000);
    return jwtTimestamp < changed;
  }
  return false;
};

userSchema.methods.softDelete = function () {
  this.active = false;
  this.deletedAt = new Date();
  return this.save();
};

/* -------------------- Model -------------------- */

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
