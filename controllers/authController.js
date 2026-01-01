import jwt from "jsonwebtoken";
import util from "util";
import User from "../models/User.js";

/* ======================================================
   HELPER FUNCTIONS
====================================================== */

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "fallback-secret-change-me", {
    expiresIn: process.env.JWT_EXPIRES_IN || "90d",
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Default to 90 days if JWT_COOKIE_EXPIRES_IN is not set
  const cookieExpiresIn = process.env.JWT_COOKIE_EXPIRES_IN || 90;

  const cookieOptions = {
    expires: new Date(Date.now() + cookieExpiresIn * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  res.cookie("jwt", token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: { user },
  });
};

/* ======================================================
   AUTH CONTROLLERS
====================================================== */

/**
 * SIGNUP
 * Phone + Password
 */
export const signup = async (req, res, next) => {
  try {
    const { name, phoneNumber, password, passwordConfirm } = req.body;

    // Validate required fields
    if (!name || !phoneNumber || !password || !passwordConfirm) {
      return res.status(400).json({
        status: "fail",
        message: "Name, phone number, password, and password confirmation are required.",
      });
    }

    const newUser = await User.create({
      name,
      phoneNumber,
      password,
      passwordConfirm,
    });

    createSendToken(newUser, 201, res);
  } catch (error) {
    next(error);
  }
};

/**
 * LOGIN
 * Phone + Password
 */
export const login = async (req, res, next) => {
  try {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
      return res.status(400).json({
        status: "fail",
        message: "Phone number and password are required.",
      });
    }

    const user = await User.findOne({ phoneNumber })
      .select("+password")
      .populate("institution");

    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        status: "fail",
        message: "Incorrect phone number or password.",
      });
    }

    createSendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * LOGOUT
 */
export const logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ status: "success" });
};

/**
 * PROTECT ROUTES (JWT)
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        status: "fail",
        message: "You are not logged in.",
      });
    }

    const decoded = await util.promisify(jwt.verify)(
      token,
      process.env.JWT_SECRET
    );

    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return res.status(401).json({
        status: "fail",
        message: "User no longer exists.",
      });
    }

    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        status: "fail",
        message: "Password recently changed. Please log in again.",
      });
    }

    req.user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * ROLE-BASED ACCESS CONTROL
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "fail",
        message: "You do not have permission to perform this action.",
      });
    }
    next();
  };
};

/**
 * GET CURRENT USER
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found.",
      });
    }

    res.status(200).json({
      status: "success",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UPDATE PASSWORD (LOGGED-IN USER)
 */
export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, passwordConfirm } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword || !passwordConfirm) {
      return res.status(400).json({
        status: "fail",
        message: "Current password, new password, and password confirmation are required.",
      });
    }

    const user = await User.findById(req.user.id).select("+password");

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found.",
      });
    }

    if (!(await user.correctPassword(currentPassword, user.password))) {
      return res.status(401).json({
        status: "fail",
        message: "Current password is incorrect.",
      });
    }

    user.password = newPassword;
    user.passwordConfirm = passwordConfirm;
    await user.save();

    createSendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};
