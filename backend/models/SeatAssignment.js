const mongoose = require("mongoose");

const seatAssignmentSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  seatNumber: {
    type: String,
    required: true,
  },
  examDate: {
    type: Date,
    required: true,
  },
});

// Ensure unique seat assignments per room and exam date
seatAssignmentSchema.index(
  { room: 1, seatNumber: 1, examDate: 1 },
  { unique: true }
);
seatAssignmentSchema.index({ student: 1, examDate: 1 }, { unique: true });

module.exports = mongoose.model("SeatAssignment", seatAssignmentSchema);
