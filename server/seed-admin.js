
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function seedAdmin() {
  try {
    if (
      !process.env.ADMIN_EMAIL ||
      !process.env.ADMIN_PASSWORD ||
      !process.env.JWT_SECRET ||
      process.env.JWT_SECRET.length < 32
    ) {
      throw new Error(
        "Set ADMIN_EMAIL, ADMIN_PASSWORD and a JWT_SECRET of at least 32 characters in .env"
      );
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const email = process.env.ADMIN_EMAIL.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(
      process.env.ADMIN_PASSWORD,
      12
    );

    await User.findOneAndUpdate(
      { email },
      {
        $set: {
          name: process.env.ADMIN_NAME || "LocalShop Admin",
          password: passwordHash,
          role: "admin"
        }
      },
      {
        upsert: true,
        runValidators: true
      }
    );

    console.log("Admin account created/updated successfully.");
  } catch (error) {
    console.error("Admin setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedAdmin();
