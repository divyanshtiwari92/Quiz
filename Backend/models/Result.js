const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam" },

  score: { type: Number, default: 0 },
  total: { type: Number, default: 0 },

  // Status tracking
  status: {
    type: String,
    enum: ["in-progress", "submitted"],
    default: "in-progress"
  },

  // Saved answers: { questionId: selectedOption }
  savedAnswers: { type: Map, of: String, default: {} },

  // Marked for review
  markedForReview: { type: [String], default: [] },

  // Time remaining when last saved (seconds)
  timeRemaining: { type: Number, default: 0 },

  // Set assigned (even/odd)
  assignedSet: { type: String, enum: ["even", "odd", "all"], default: "all" },

  // Anti-cheat violations
  violations: [{
    type: { type: String },
    timestamp: { type: Date, default: Date.now },
    count: { type: Number, default: 1 }
  }],
  violationCount: { type: Number, default: 0 },

  submittedAt: { type: Date },
  startedAt: { type: Date, default: Date.now },

}, { timestamps: true });

module.exports = mongoose.model("Result", resultSchema);
