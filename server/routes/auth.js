
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");

const router = express.Router();

router.post("/admin-login", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    const password = req.body.password;

    if (
      !email ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({
      email,
      role: "admin"
    }).select("+password");

    if (
      !user ||
      !(await bcrypt.compare(password, user.password))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      success: true,
      message: "Admin login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Admin login error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to log in"
    });
  }
});

router.post("/shopkeeper-login", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    const password = req.body.password;

    if (!email || typeof password !== "string" || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({
      email,
      role: "shopkeeper"
    }).select("+password");

    if (
      !user ||
      !(await bcrypt.compare(password, user.password))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    if (!user.shopId) {
      return res.status(403).json({
        success: false,
        message: "No shop is linked to this account"
      });
    }

    const shop = await require("../models/Shop").findOne({
      _id: user.shopId,
      status: "approved"
    });

    if (!shop) {
      return res.status(403).json({
        success: false,
        message: "Your shop is not currently approved"
      });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
        shopId: user.shopId.toString()
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({
      success: true,
      message: "Shopkeeper login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        shopId: user.shopId
      },
      shop: {
        id: shop._id,
        shopName: shop.shopName
      }
    });
  } catch (error) {
    console.error("Shopkeeper login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to log in"
    });
  }
});


router.post("/customer-register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = req.body.password;

    if (!name || !email || typeof password !== "string" || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required"
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters"
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "customer"
    });

    return res.status(201).json({
      success: true,
      message: "Customer registered successfully",
      customer: {
        id: customer._id.toString(),
        name: customer.name,
        email: customer.email,
        role: customer.role
      }
    });
  } catch (error) {
    console.error("Customer registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to register customer"
    });
  }
});

router.post("/customer-login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = req.body.password;

    if (!email || typeof password !== "string" || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const customer = await User.findOne({
      email,
      role: "customer"
    }).select("+password");

    if (
      !customer ||
      !(await bcrypt.compare(password, customer.password))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      {
        userId: customer._id.toString(),
        role: customer.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({
      success: true,
      message: "Customer login successful",
      token,
      customer: {
        id: customer._id.toString(),
        name: customer.name,
        email: customer.email,
        role: customer.role
      }
    });
  } catch (error) {
    console.error("Customer login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to log in"
    });
  }
});


router.post("/forgot-password", (req, res) => {
  return res.status(410).json({
    success: false,
    message:
      "Email password reset is disabled. Please contact the administrator to reset your password."
  });
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (
      typeof token !== "string" ||
      !token ||
      typeof newPassword !== "string" ||
      newPassword.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid token and a password of at least 8 characters are required"
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      role: "shopkeeper",
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Reset link is invalid or expired. Please request a new one."
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.json({
      success: true,
      message: "Password reset successful. Please log in with your new password."
    });
  } catch (error) {
    console.error("Reset password error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to reset password"
    });
  }
});


module.exports = router;
