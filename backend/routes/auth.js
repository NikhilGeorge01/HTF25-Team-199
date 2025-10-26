const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { auth, isAdmin } = require("../middleware/auth");

const router = express.Router();

// Login route
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        rollNumber: user.rollNumber,
        staffId: user.staffId,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Create new user
router.post("/users", auth, isAdmin, async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json({
      id: user._id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      rollNumber: user.rollNumber,
      staffId: user.staffId,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Admin: Get all users
router.get("/users", auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find({}, "-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
