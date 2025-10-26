const express = require("express");
const Room = require("../models/Room");
const { auth, isAdmin } = require("../middleware/auth");

const router = express.Router();

// Admin: Create room
router.post("/rooms", auth, isAdmin, async (req, res) => {
  try {
    const room = new Room(req.body);
    await room.save();
    res.status(201).json(room);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all rooms
router.get("/rooms", auth, async (req, res) => {
  try {
    const rooms = await Room.find().populate("invigilator", "fullName staffId");
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update room
router.put("/rooms/:id", auth, isAdmin, async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    res.json(room);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Admin: Delete room
router.delete("/rooms/:id", auth, isAdmin, async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    res.json({ message: "Room deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
