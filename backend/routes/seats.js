const express = require("express");
const SeatAssignment = require("../models/SeatAssignment");
const Room = require("../models/Room");
const User = require("../models/User");
const Exam = require("../models/Exam");
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

// Manual seat assignment
router.put("/seats/manual-assign", auth, isAdmin, async (req, res) => {
  try {
    const { examId, roomId, studentId, seatNumber } = req.body;

    // Validate input
    if (!examId || !roomId || !studentId || !seatNumber) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Get room details to check capacity
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Get exam details
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    // Get student details
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ error: "Student not found" });
    }

    // Check if seat number is valid (assuming format A-01, B-15 etc)
    const seatRegex = /^[A-Z]-\d{2}$/;
    if (!seatRegex.test(seatNumber)) {
      return res.status(400).json({ error: "Invalid seat number format" });
    }

    // Check if seat is already taken
    const existingSeat = await SeatAssignment.findOne({
      exam: examId,
      room: roomId,
      seatNumber: seatNumber
    });
    if (existingSeat) {
      return res.status(400).json({ error: "Seat already taken" });
    }

    // Check if student is already assigned for this exam
    const existingAssignment = await SeatAssignment.findOne({
      exam: examId,
      student: studentId
    });
    if (existingAssignment) {
      return res.status(400).json({ error: "Student already assigned to a seat for this exam" });
    }

    // Create or update seat assignment
    const seatAssignment = await SeatAssignment.findOneAndUpdate(
      { exam: examId, student: studentId },
      {
        room: roomId,
        exam: examId,
        student: studentId,
        seatNumber: seatNumber,
        examDate: exam.startDate,
        assignmentMode: 'manual'
      },
      { upsert: true, new: true, runValidators: true }
    ).populate('student', 'fullName rollNumber branch');

    res.json(seatAssignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual clear seat assignment
router.put("/seats/manual-clear", auth, isAdmin, async (req, res) => {
  try {
    const { examId, roomId, seatNumber } = req.body;

    // Find and delete the seat assignment
    const seatAssignment = await SeatAssignment.findOneAndDelete({
      exam: examId,
      room: roomId,
      seatNumber: seatNumber
    });

    if (!seatAssignment) {
      return res.status(404).json({ error: "Seat assignment not found" });
    }

    res.json({ message: "Seat assignment cleared successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get seat assignments by room with detailed information
router.get("/seats/room/:roomId/seating", auth, async (req, res) => {
  try {
    const { examId } = req.query;
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    const seats = await SeatAssignment.find({
      room: req.params.roomId,
      exam: examId
    }).populate("student", "fullName rollNumber branch")
      .populate("exam", "name startDate");

    const response = {
      roomId: room._id,
      roomNumber: room.name,
      capacity: room.capacity,
      exam: {
        examId: exam._id,
        subject: exam.name,
        date: exam.startDate,
        time: exam.startDate.toLocaleTimeString()
      },
      students: seats.map(seat => ({
        seatNumber: seat.seatNumber,
        rollNo: seat.student.rollNumber,
        name: seat.student.fullName,
        branch: seat.student.branch
      }))
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auto-assign seats with branch consideration
router.post("/seats/auto-assign/:examId", auth, isAdmin, async (req, res) => {
  try {
    const { mode = 'mixed' } = req.query; // mode can be 'mixed' or 'branchwise'
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    const rooms = await Room.find({ examName: exam.name });
    if (!rooms.length) {
      return res.status(400).json({ error: "No rooms assigned for this exam" });
    }

    // Get all students
    const students = await User.find({ role: 'student' }).sort('branch');
    
    // Clear existing assignments for this exam
    await SeatAssignment.deleteMany({ exam: exam._id });

    let assignments = [];
    let currentRoomIndex = 0;
    let currentSeatIndex = 0;

    if (mode === 'mixed') {
      // Mix students of different branches
      const branchGroups = {};
      students.forEach(student => {
        if (!branchGroups[student.branch]) {
          branchGroups[student.branch] = [];
        }
        branchGroups[student.branch].push(student);
      });

      // Distribute students evenly
      while (Object.values(branchGroups).some(group => group.length > 0)) {
        for (const branch in branchGroups) {
          if (branchGroups[branch].length > 0) {
            const student = branchGroups[branch].shift();
            const room = rooms[currentRoomIndex];
            const seatNumber = `${String.fromCharCode(65 + Math.floor(currentSeatIndex / 10))}-${String(currentSeatIndex % 10).padStart(2, '0')}`;
            
            assignments.push({
              room: room._id,
              exam: exam._id,
              student: student._id,
              seatNumber,
              examDate: exam.startDate,
              assignmentMode: 'auto-mixed'
            });

            currentSeatIndex++;
            if (currentSeatIndex >= rooms[currentRoomIndex].capacity) {
              currentSeatIndex = 0;
              currentRoomIndex++;
              if (currentRoomIndex >= rooms.length) {
                return res.status(400).json({ error: "Not enough seats for all students" });
              }
            }
          }
        }
      }
    } else {
      // Branch-wise seating
      for (const student of students) {
        const room = rooms[currentRoomIndex];
        const seatNumber = `${String.fromCharCode(65 + Math.floor(currentSeatIndex / 10))}-${String(currentSeatIndex % 10).padStart(2, '0')}`;
        
        assignments.push({
          room: room._id,
          exam: exam._id,
          student: student._id,
          seatNumber,
          examDate: exam.startDate,
          assignmentMode: 'auto-branchwise'
        });

        currentSeatIndex++;
        if (currentSeatIndex >= rooms[currentRoomIndex].capacity) {
          currentSeatIndex = 0;
          currentRoomIndex++;
          if (currentRoomIndex >= rooms.length) {
            return res.status(400).json({ error: "Not enough seats for all students" });
          }
        }
      }
    }

    // Save all assignments
    await SeatAssignment.insertMany(assignments);

    res.json({
      message: "Seat assignments completed successfully",
      totalAssignments: assignments.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get room-wise seating chart
router.get("/seats/room/:roomId", auth, async (req, res) => {
  try {
    const seats = await SeatAssignment.find({
      room: req.params.roomId,
    }).populate("student", "fullName rollNumber branch");
    res.json(seats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
