
const express = require("express");
const crypto = require("crypto");
const User = require("../models/User");
const mongoose = require("mongoose");
const Shop = require("../models/Shop");
const {
  authenticate,
  requireAdmin
} = require("../middleware/auth");

const router = express.Router();

// All routes below require admin login
router.use(authenticate, requireAdmin);

// GET: List shops, optionally filter by status
router.get("/shops", async (req, res) => {
  try {
    const allowedStatuses = [
      "pending",
      "approved",
      "rejected"
    ];

    const filter = {};

    if (req.query.status) {
      if (!allowedStatuses.includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid shop status"
        });
      }

      filter.status = req.query.status;
    }

    const shops = await Shop.find(filter)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: shops.length,
      shops
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to fetch shops"
    });
  }
});

// PATCH: Approve or reject a shop
router.patch("/shops/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop ID"
      });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved or rejected"
      });
    }

    const shop = await Shop.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found"
      });
    }

    res.json({
      success: true,
      message: `Shop ${status} successfully`,
      shop
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to update shop status"
    });
  }
});


 // POST: Generate a one-time password reset code for a shopkeeper

 // POST: Generate a one-time password reset code for a shopkeeper
router.post("/shops/:id/reset-password-code", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop ID"
      });
    }

    // 1. Find the shop using the Shop ID from the frontend
    const shop = await Shop.findOne({
      _id: id,
      status: "approved"
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Approved shop not found"
      });
    }

    // 2. Find the shopkeeper linked to this shop
    const shopkeeper = await User.findOne({
      shopId: shop._id,
      role: "shopkeeper"
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!shopkeeper) {
      return res.status(404).json({
        success: false,
        message: "Shopkeeper account not found for this shop"
      });
    }

    // 3. Generate a secure, one-time reset code
    const rawToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    shopkeeper.resetPasswordToken = hashedToken;
    shopkeeper.resetPasswordExpires =
      new Date(Date.now() + 15 * 60 * 1000);

    await shopkeeper.save();

    console.log("Admin-assisted reset initiated:", {
      adminId: req.user.userId,
      shopkeeperId: shopkeeper._id.toString()
    });

    return res.json({
      success: true,
      message: "Reset code generated. It expires in 15 minutes.",
      resetCode: rawToken,
      expiresInMinutes: 15
    });
  } catch (error) {
    console.error("Admin reset-code error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to generate reset code"
    });
  }
});


module.exports = router;
