
const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const Shop = require("../models/Shop");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Shopkeeper account registration
router.post("/register", authenticate, async (req, res) => {
  try {
    // Only admin can create shopkeeper accounts
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access only"
      });
    }

    const { name, email, password, shopId } = req.body;

    if (!name || !email || !password || !shopId) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    if (!mongoose.isValidObjectId(shopId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop ID"
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters"
      });
    }

    const shop = await Shop.findOne({
      _id: shopId,
      status: "approved"
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Approved shop not found"
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered"
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: passwordHash,
      role: "shopkeeper",
      shopId: shop._id
    });

    res.status(201).json({
      success: true,
      message: "Shopkeeper account created",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        shopId: user.shopId
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already registered"
      });
    }

    console.error("Shopkeeper registration error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to create shopkeeper account"
    });
  }
});

/* Shopkeeper: Get my shop location */
router.get("/my-shop/location", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "shopkeeper" || !req.user.shopId) {
      return res.status(403).json({
        success: false,
        message: "Shopkeeper access only"
      });
    }

    const shop = await Shop.findOne({
      _id: req.user.shopId,
      status: "approved"
    }).select("shopName address latitude longitude");

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Approved shop not found"
      });
    }

    return res.json({
      success: true,
      shop
    });
  } catch (error) {
    console.error("Get shop location error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load shop location"
    });
  }
});


/* Shopkeeper: Save my shop GPS coordinates */
router.patch("/my-shop/location", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "shopkeeper" || !req.user.shopId) {
      return res.status(403).json({
        success: false,
        message: "Shopkeeper access only"
      });
    }

    const { latitude, longitude } = req.body;

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid latitude and longitude are required"
      });
    }

    const shop = await Shop.findOneAndUpdate(
      {
        _id: req.user.shopId,
        status: "approved"
      },
      {
        $set: { latitude, longitude }
      },
      {
        new: true,
        runValidators: true
      }
    ).select("shopName address latitude longitude");

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Approved shop not found"
      });
    }

    return res.json({
      success: true,
      message: "Shop location saved successfully",
      shop
    });
  } catch (error) {
    console.error("Save shop location error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to save shop location"
    });
  }
});

module.exports = router;
