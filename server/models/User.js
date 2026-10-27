
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: ["admin", "shopkeeper", "customer"],
      required: true
    },
    
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null
    },
    resetPasswordToken: {
      type: String,
      default: undefined,
      select: false
    },
    resetPasswordExpires: {
      type: Date,
      default: undefined,
      select: false
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
