const crypto = require("crypto");
const XLSX = require("xlsx");
const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Shop = require("../models/Shop");
const { authenticate } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Create the product image directory if it does not exist
const uploadDir = path.join(__dirname, "../uploads/products");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDir);
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + extension;

    callback(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, callback) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif"
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error("Only JPG, PNG, WEBP and GIF images are allowed")
      );
    }

    callback(null, true);
  }
});

// Customer: Get products from approved shops

 // Customer: Search products in approved shops and sort by distance
router.get("/", async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    const hasLocation =
      req.query.lat !== undefined &&
      req.query.lng !== undefined &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180;

    const approvedShops = await Shop.find({
      status: "approved"
    }).select(
      "_id shopName ownerName phone address latitude longitude"
    );

    const shopById = new Map(
      approvedShops.map((shop) => [String(shop._id), shop])
    );

    const shopIds = approvedShops.map((shop) => shop._id);

    const productFilter = {
      shop: { $in: shopIds }
    };

    if (search) {
      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      productFilter.name = {
        $regex: escapedSearch,
        $options: "i"
      };
    }

    const products = await Product.find(productFilter)
      .sort({ createdAt: -1 })
      .lean();

    function distanceInKm(lat1, lon1, lat2, lon2) {
      const toRadians = (degrees) => (degrees * Math.PI) / 180;
      const earthRadiusKm = 6371;

      const dLat = toRadians(lat2 - lat1);
      const dLon = toRadians(lon2 - lon1);

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
          Math.cos(toRadians(lat2)) *
          Math.sin(dLon / 2) ** 2;

      return earthRadiusKm * 2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );
    }

    const results = products.map((product) => {
      const shop = shopById.get(String(product.shop));

      let distanceKm = null;

      if (
        hasLocation &&
        shop &&
        Number.isFinite(shop.latitude) &&
        Number.isFinite(shop.longitude)
      ) {
        distanceKm = distanceInKm(
          lat,
          lng,
          shop.latitude,
          shop.longitude
        );
      }

      return {
        ...product,
        shop: shop
          ? {
               _id: shop._id,
              shopName: shop.shopName,
              ownerName: shop.ownerName,
              phone: shop.phone,
              address: shop.address,
              latitude: shop.latitude,
              longitude: shop.longitude
            }
          : null,
        distanceKm
      };
    });

    results.sort((a, b) => {
      // Show in-stock products first
      if ((a.stock > 0) !== (b.stock > 0)) {
        return a.stock > 0 ? -1 : 1;
      }

      // If location is available, sort by nearest shop
      if (a.distanceKm !== null && b.distanceKm !== null) {
        return a.distanceKm - b.distanceKm;
      }

      if (a.distanceKm !== null) return -1;
      if (b.distanceKm !== null) return 1;

      return 0;
    });

    return res.json({
      success: true,
      locationProvided: hasLocation,
      products: results
    });
  } catch (error) {
    console.error("Customer products error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load products"
    });
  }
});


// All shopkeeper product routes require login
router.use(authenticate);


const bulkUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 201,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (file.fieldname === "productsFile") {
      return cb(
        null,
        [".xlsx", ".xls", ".csv"].includes(ext)
      );
    }

    if (file.fieldname === "images") {
      const allowedExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif",
      ];

      const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ];

      if (
        allowedExtensions.includes(ext) &&
        allowedMimeTypes.includes(file.mimetype)
      ) {
        return cb(null, true);
      }

      return cb(new Error("Invalid image file type."));
    }

    return cb(new Error("Unexpected file field."));
  },
});

router.post(
  "/bulk-upload",
  (req, res, next) => {
    bulkUpload.fields([
      { name: "productsFile", maxCount: 1 },
      { name: "images", maxCount: 200 },
    ])(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          success: false,
          message:
            error.code === "LIMIT_FILE_SIZE"
              ? "Each uploaded file must be 10 MB or less."
              : error.message || "File upload failed.",
        });
      }

      next();
    });
  },
  async (req, res) => {
    const savedFiles = [];

    try {
      const spreadsheet = req.files?.productsFile?.[0];
      const imageFiles = req.files?.images || [];

      if (!spreadsheet) {
        return res.status(400).json({
          success: false,
          message: "Please select an Excel or CSV file.",
        });
      }

      const workbook = XLSX.read(spreadsheet.buffer, {
        type: "buffer",
      });

      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        return res.status(400).json({
          success: false,
          message: "The spreadsheet has no worksheet.",
        });
      }

      const rows = XLSX.utils.sheet_to_json(
        workbook.Sheets[sheetName],
        { defval: "" }
      );

      if (!rows.length) {
        return res.status(400).json({
          success: false,
          message: "No products found in the spreadsheet.",
        });
      }

      if (rows.length > 5000) {
        return res.status(400).json({
          success: false,
          message: "Maximum 5000 products per upload.",
        });
      }

      // Match spreadsheet imageFile values to uploaded filenames.
      const imageMap = new Map();

      for (const file of imageFiles) {
        const key = path.basename(file.originalname).toLowerCase();

        if (imageMap.has(key)) {
          return res.status(400).json({
            success: false,
            message: `Duplicate image filename: ${file.originalname}`,
          });
        }

        imageMap.set(key, file);
      }

      const errors = [];
      const prepared = [];

      rows.forEach((row, index) => {
        const rowNumber = index + 2;

        const name = String(row.name ?? "").trim();
        const description = String(row.description ?? "").trim();
        const priceText = String(row.price ?? "").trim();
        const stockText = String(row.stock ?? "").trim();
        const imageFile = String(row.imageFile ?? "").trim();

        const price = Number(priceText);
        const stock = Number(stockText);

        if (!name) {
          errors.push(`Row ${rowNumber}: name is required.`);
          return;
        }

        if (
          !priceText ||
          !Number.isFinite(price) ||
          price < 0
        ) {
          errors.push(`Row ${rowNumber}: invalid price.`);
          return;
        }

        if (
          !stockText ||
          !Number.isInteger(stock) ||
          stock < 0
        ) {
          errors.push(`Row ${rowNumber}: invalid stock.`);
          return;
        }

        if (
          imageFile &&
          !imageMap.has(
            path.basename(imageFile).toLowerCase()
          )
        ) {
          errors.push(
            `Row ${rowNumber}: image "${imageFile}" was not uploaded.`
          );
          return;
        }

        prepared.push({
          name,
          description,
          price,
          stock,
          imageFile,
        });
      });

      if (errors.length) {
        return res.status(400).json({
          success: false,
          message: "Correct the spreadsheet errors and try again.",
          errors: errors.slice(0, 50),
          totalErrors: errors.length,
        });
      }

      // Save images using the existing LocalShop image directory.
      const imagePaths = new Map();

      for (const [key, file] of imageMap) {
        const extension = path.extname(file.originalname).toLowerCase();
        const filename = `${crypto.randomUUID()}${extension}`;
        const destination = path.join(uploadDir, filename);

        await fs.promises.writeFile(destination, file.buffer);
        savedFiles.push(destination);

        imagePaths.set(key, `/uploads/products/${filename}`);
      }

      // Always associate products with the authenticated shop.
      const documents = prepared.map((item) => ({
        name: item.name,
        description: item.description,
        price: item.price,
        stock: item.stock,
        image: item.imageFile
          ? imagePaths.get(
              path.basename(item.imageFile).toLowerCase()
            ) || ""
          : "",
        shop: req.user.shopId,
      }));

      const products = await Product.insertMany(documents, {
        ordered: true,
      });

      return res.status(201).json({
        success: true,
        message: "Bulk upload completed successfully.",
        imported: products.length,
        products,
      });
    } catch (error) {
      // Remove files saved by this request if the database save fails.
      await Promise.all(
        savedFiles.map((filePath) =>
          fs.promises.unlink(filePath).catch(() => {})
        )
      );

      console.error("Bulk product upload error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to import products.",
      });
    }
  }
);


// Allow approved shopkeepers only
router.use(async (req, res, next) => {
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
    });

    if (!shop) {
      return res.status(403).json({
        success: false,
        message: "Your shop is not approved"
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to verify shop"
    });
  }
});

// Upload a local product image
router.post("/upload-image", (req, res) => {
  upload.single("image")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "Image size must be 5 MB or less"
            : error.message || "Image upload failed"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image"
      });
    }

    res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      image: `/uploads/products/${req.file.filename}`
    });
  });
});

// Get products belonging to the logged-in shopkeeper
router.get("/my-products", async (req, res) => {
  try {
    const products = await Product.find({
      shop: req.user.shopId
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to fetch products"
    });
  }
});

// Add a product
router.post("/", async (req, res) => {
  try {
    const {
      name,
      description = "",
      image = "",
      price,
      stock
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(stock) ||
      stock < 0 ||
      typeof description !== "string" ||
      typeof image !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a product name, valid price and whole-number stock"
      });
    }

    const product = await Product.create({
      name: name.trim(),
      description: description.trim(),
      image: image.trim(),
      price,
      stock,
      shop: req.user.shopId
    });

    res.status(201).json({
      success: true,
      message: "Product added successfully",
      product
    });
  } catch (error) {
    console.error("Add product error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to add product"
    });
  }
});

// Update a product belonging to this shop
router.patch("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const allowed = [
      "name",
      "description",
      "image",
      "price",
      "stock"
    ];

    const updates = {};

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updates[key] = req.body[key];
      }
    }

    if (
      Object.keys(updates).length === 0 ||
      (updates.name !== undefined &&
        (typeof updates.name !== "string" || !updates.name.trim())) ||
      (updates.description !== undefined &&
        typeof updates.description !== "string") ||
      (updates.image !== undefined &&
        typeof updates.image !== "string") ||
      (updates.price !== undefined &&
        (typeof updates.price !== "number" ||
          !Number.isFinite(updates.price) ||
          updates.price < 0)) ||
      (updates.stock !== undefined &&
        (!Number.isInteger(updates.stock) || updates.stock < 0))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product details"
      });
    }

    if (updates.name !== undefined) {
      updates.name = updates.name.trim();
    }

    if (updates.description !== undefined) {
      updates.description = updates.description.trim();
    }

    if (updates.image !== undefined) {
      updates.image = updates.image.trim();
    }

    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        shop: req.user.shopId
      },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found in your shop"
      });
    }

    res.json({
      success: true,
      message: "Product updated successfully",
      product
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to update product"
    });
  }
});

// Delete a product belonging to this shop
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      shop: req.user.shopId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found in your shop"
      });
    }

    res.json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to delete product"
    });
  }
});

module.exports = router;
