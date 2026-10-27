require("dotenv").config();
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const bcrypt = require("bcryptjs");
const path = require("path");
const Shop = require("./models/Shop");
const User = require("./models/User");
const shopkeeperRoutes = require("./routes/shopkeeper");
const productRoutes = require("./routes/products");

const app = express();

app.use(cors());
app.use(express.json());
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/shopkeeper", shopkeeperRoutes);
app.use("/api/products", productRoutes);

// GET: Fetch all registered shops


app.post("/api/shops", async (req, res) => {
  let createdShop = null;

  try {
    const {
      shopName,
      ownerName,
      phone,
      address,
      email,
      password
    } = req.body || {};

    // Validate and clean input
    const cleanShopName =
      typeof shopName === "string" ? shopName.trim() : "";

    const cleanOwnerName =
      typeof ownerName === "string" ? ownerName.trim() : "";

    const cleanPhone =
      typeof phone === "string" ? phone.trim() : "";

    const cleanAddress =
      typeof address === "string" ? address.trim() : "";

    const cleanEmail =
      typeof email === "string"
        ? email.trim().toLowerCase()
        : "";

    if (
      !cleanShopName ||
      !cleanOwnerName ||
      !cleanPhone ||
      !cleanAddress ||
      !cleanEmail ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all fields"
      });
    }

    // Validate phone
    if (!/^\d{10}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must contain 10 digits"
      });
    }

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address"
      });
    }

    // Validate password
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters"
      });
    }

    // Check duplicate email
    const existingUser = await User.findOne({
      email: cleanEmail
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered"
      });
    }

    // Create shop as pending
    createdShop = await Shop.create({
      shopName: cleanShopName,
      ownerName: cleanOwnerName,
      phone: cleanPhone,
      address: cleanAddress,
      status: "pending"
    });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create linked shopkeeper account
    const user = await User.create({
      name: cleanOwnerName,
      email: cleanEmail,
      password: hashedPassword,
      role: "shopkeeper",
      shopId: createdShop._id
    });

    return res.status(201).json({
      success: true,
      message:
        "Shop registered successfully. Please wait for admin approval.",
      shop: {
        id: createdShop._id,
        shopName: createdShop.shopName,
        status: createdShop.status
      },
      shopkeeper: {
        id: user._id,
        email: user.email
      }
    });
  } catch (error) {
    // Remove incomplete shop if registration fails
    if (createdShop) {
      await Shop.findByIdAndDelete(createdShop._id).catch(() => {});
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered"
      });
    }

    console.error("Shop registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Shop registration failed"
    });
  }
});



app.get("/api/shops", async (req, res) => {
  try {
    const shops = await Shop.find({ status: "approved" });

    res.json(shops);
  } catch (error) {
    console.error("Fetch shops error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load shops"
    });
  }
});


// // POST: Register a new shop
// app.post("/api/shops", async (req, res) => {
//   try {
//     const {
//       shopName,
//       ownerName,
//       phone,
//       address
//     } = req.body;

//     if (
//       !shopName?.trim() ||
//       !ownerName?.trim() ||
//       !phone?.trim() ||
//       !address?.trim()
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Please fill in all fields"
//       });
//     }

//     if (!/^[0-9]{10}$/.test(phone.trim())) {
//       return res.status(400).json({
//         success: false,
//         message: "Enter a valid 10-digit phone number"
//       });
//     }

//     const shop = await Shop.create({
//       shopName,
//       ownerName,
//       phone,
//       address
//     });

//     res.status(201).json({
//       success: true,
//       message: "Shop registered successfully",
//       shop
//     });
//   } catch (error) {
//     console.error("Shop registration error:", error);

//     res.status(500).json({
//       success: false,
//       message: "Unable to register shop"
//     });
//   }
// });

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "LocalShop API is working!",
    database:
      mongoose.connection.readyState === 1
        ? "Connected"
        : "Not connected"
  });
});

// Start server after connecting to MongoDB
async function startServer() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI
    );

    console.log("MongoDB connected successfully");

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error.message
    );
    process.exit(1);
  }
}

startServer();
