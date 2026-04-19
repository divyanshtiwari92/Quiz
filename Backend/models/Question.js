const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
  question: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: String, required: true },
  setType: {
    type: String,
    enum: ["even", "odd", "all"],
    default: "all"
  },
  marks: { type: Number, default: 1 },
});

module.exports = mongoose.model("Question", questionSchema);
