const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "staff", "student"],
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  // For students
  rollNumber: {
    type: String,
    sparse: true,
  },
  branch: {
    type: String,
    sparse: true,
  },
  year: {
    type: Number,
    sparse: true,
    min: 1,
    max: 4,
  },
  // For staff
  staffId: {
    type: String,
    sparse: true,
  },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema, "exam_users");
