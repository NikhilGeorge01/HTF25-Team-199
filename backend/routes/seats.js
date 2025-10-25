const express = require("express");
const SeatAssignment = require("../models/SeatAssignment");
const { auth, isAdmin } = require("../middleware/auth");

const router = express.Router();

// Admin: Create seat assignment
router.post("/seats", auth, isAdmin, async (req, res) => {
  try {
    const seatAssignment = new SeatAssignment(req.body);
    await seatAssignment.save();
    res.status(201).json(seatAssignment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get seat assignments (filtered by role)
router.get("/seats", auth, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === "student") {
      query.student = req.user._id;
    } else if (req.user.role === "staff") {
      // Staff can see assignments for rooms they're invigilating
      const rooms = await Room.find({ invigilator: req.user._id });
      query.room = { $in: rooms.map((r) => r._id) };
    }

    const seats = await SeatAssignment.find(query)
      .populate("room", "name examName examDate")
      .populate("student", "fullName rollNumber");

    res.json(seats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update seat assignment
router.put("/seats/:id", auth, isAdmin, async (req, res) => {
  try {
    const seat = await SeatAssignment.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!seat) {
      return res.status(404).json({ error: "Seat assignment not found" });
    }
    res.json(seat);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Admin: Delete seat assignment
router.delete("/seats/:id", auth, isAdmin, async (req, res) => {
  try {
    const seat = await SeatAssignment.findByIdAndDelete(req.params.id);
    if (!seat) {
      return res.status(404).json({ error: "Seat assignment not found" });
    }
    res.json({ message: "Seat assignment deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get seat assignments by room
router.get("/seats/room/:roomId", auth, async (req, res) => {
  try {
    const seats = await SeatAssignment.find({
      room: req.params.roomId,
    }).populate("student", "fullName rollNumber");
    res.json(seats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
