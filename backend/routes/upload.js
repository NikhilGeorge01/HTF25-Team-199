const express = require("express");
const multer = require("multer");
const { parse } = require("csv-parse");
const User = require("../models/User");
const { auth, isAdmin } = require("../middleware/auth");

const router = express.Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv") {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

// Upload CSV route
router.post(
  "/upload-users",
  auth,
  isAdmin,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const results = [];
    const errors = [];

    // Parse CSV content
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
    });

    parser.on("readable", async () => {
      let record;
      while ((record = parser.read()) !== null) {
        try {
          // Validate required fields
          if (
            !record.username ||
            !record.password ||
            !record.role ||
            !record.fullName
          ) {
            errors.push(
              `Missing required fields for user: ${
                record.username || "unknown"
              }`
            );
            continue;
          }

          // Validate role
          if (!["student", "staff", "admin"].includes(record.role)) {
            errors.push(`Invalid role for user: ${record.username}`);
            continue;
          }

          // Create user object
          const userData = {
            username: record.username,
            password: record.password,
            role: record.role,
            fullName: record.fullName,
          };

          // Add role-specific fields
          if (record.role === "student") {
            if (!record.rollNumber || !record.branch || !record.year) {
              errors.push(
                `Missing required student fields for user: ${record.username}`
              );
              continue;
            }
            userData.rollNumber = record.rollNumber;
            userData.branch = record.branch;
            userData.year = parseInt(record.year);

            // Validate year
            if (
              isNaN(userData.year) ||
              userData.year < 1 ||
              userData.year > 4
            ) {
              errors.push(
                `Invalid year for student: ${record.username}. Year must be between 1 and 4`
              );
              continue;
            }
          }
          if (record.role === "staff" && record.staffId) {
            userData.staffId = record.staffId;
          }

          // Save user
          const user = new User(userData);
          await user.save();
          results.push(`Successfully created user: ${record.username}`);
        } catch (error) {
          errors.push(
            `Error creating user ${record.username}: ${error.message}`
          );
        }
      }
    });

    parser.on("error", (err) => {
      errors.push(`CSV parsing error: ${err.message}`);
    });

    parser.on("end", () => {
      res.json({
        success: results,
        errors: errors,
      });
    });

    // Feed the CSV content to the parser
    parser.write(req.file.buffer);
    parser.end();
  }
);

module.exports = router;
