const mongoose = require("mongoose");

const examSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  examSchedule: [
    {
      date: {
        type: Date,
        required: true,
      },
      subjectCode: {
        type: String,
        required: true,
      },
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

// Validate that endDate is after startDate
examSchema.pre("save", function (next) {
  if (this.endDate < this.startDate) {
    next(new Error("End date must be after start date"));
  }
  next();
});

// Validate that all exam dates fall within the start and end dates
examSchema.pre("save", function (next) {
  const isValid = this.examSchedule.every(
    (schedule) =>
      schedule.date >= this.startDate && schedule.date <= this.endDate
  );
  if (!isValid) {
    next(new Error("All exam dates must be within the start and end dates"));
  }
  next();
});

module.exports = mongoose.model("Exam", examSchema, "exams");
