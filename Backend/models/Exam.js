const mongoose = require("mongoose");

const examSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  courseCode: { type: String, default: "" },
  duration: { type: Number, required: true },
  section: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
  positiveMarks: { type: Number, default: 1 },
  negativeMarks: { type: Number, default: 0 },
  startTime: { type: Date, default: null },
  endTime: { type: Date, default: null },
  showResult: { type: Boolean, default: true },
  showQuestions: { type: Boolean, default: false }, // allow students to view questions after result
  hasSets: { type: Boolean, default: false },
  published: { type: Boolean, default: false }, // draft until teacher publishes
}, { timestamps: true });

module.exports = mongoose.model("Exam", examSchema);
