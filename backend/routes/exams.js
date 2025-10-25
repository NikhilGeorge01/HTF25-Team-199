const express = require("express");
const Exam = require("../models/Exam");
const { auth, isAdmin } = require("../middleware/auth");

const router = express.Router();

// Create new exam
router.post("/exams", auth, isAdmin, async (req, res) => {
  try {
    const exam = new Exam({
      ...req.body,
      createdBy: req.user._id,
    });
    await exam.save();
    res.status(201).json(exam);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all exams
router.get("/exams", auth, async (req, res) => {
  try {
    const exams = await Exam.find().populate("createdBy", "fullName");
    res.json(exams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get exam by ID
router.get("/exams/:id", auth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate(
      "createdBy",
      "fullName"
    );
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }
    res.json(exam);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update exam
router.put("/exams/:id", auth, isAdmin, async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }
    res.json(exam);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete exam
router.delete("/exams/:id", auth, isAdmin, async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }
    res.json({ message: "Exam deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add subject to exam schedule
router.post("/exams/:id/schedule", auth, isAdmin, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    exam.examSchedule.push(req.body);
    await exam.save();
    res.status(201).json(exam);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Remove subject from exam schedule
router.delete(
  "/exams/:examId/schedule/:scheduleId",
  auth,
  isAdmin,
  async (req, res) => {
    try {
      const exam = await Exam.findById(req.params.examId);
      if (!exam) {
        return res.status(404).json({ error: "Exam not found" });
      }

      exam.examSchedule = exam.examSchedule.filter(
        (schedule) => schedule._id.toString() !== req.params.scheduleId
      );
      await exam.save();
      res.json(exam);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

module.exports = router;
