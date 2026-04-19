const express = require("express");
const router = express.Router();
const Question = require("../models/Question");
const { authMiddleware } = require("../middleware/auth");

/* ================= ADD QUESTION ================= */
router.post("/add", authMiddleware, async (req, res) => {
  try {
    const { examId, question, options, correctAnswer, setType } = req.body;
    const newQuestion = new Question({
      examId, question, options, correctAnswer,
      setType: setType || "all",
    });
    await newQuestion.save();
    res.json({ success: true, question: newQuestion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= GET QUESTIONS BY EXAM (filtered by set) ================= */
router.get("/:examId", async (req, res) => {
  try {
    const { setType } = req.query;
    let filter = { examId: req.params.examId };
    if (setType && setType !== "all") {
      filter.$or = [{ setType }, { setType: "all" }];
    }
    const questions = await Question.find(filter);
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= UPDATE QUESTION ================= */
router.put("/update/:id", authMiddleware, async (req, res) => {
  try {
    const { question, options, correctAnswer, setType } = req.body;
    const updated = await Question.findByIdAndUpdate(
      req.params.id,
      { question, options, correctAnswer, setType },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Question not found" });
    res.json({ success: true, question: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= DELETE QUESTION ================= */
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Question deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

/* ================= GET QUESTIONS WITH ANSWERS (for review) ================= */
router.get("/review/:examId/:studentId", async (req, res) => {
  try {
    const Result = require("../models/Result");
    const Exam = require("../models/Exam");

    const result = await Result.findOne({ studentId: req.params.studentId, examId: req.params.examId, status: "submitted" });
    if (!result) return res.status(403).json({ message: "No submitted result found" });

    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    if (!exam.showQuestions) return res.status(403).json({ message: "Teacher has not enabled question review for this exam" });

    let filter = { examId: req.params.examId };
    if (result.assignedSet !== "all") {
      filter.$or = [{ setType: result.assignedSet }, { setType: "all" }];
    }
    const questions = await Question.find(filter);

    // Attach student's answer to each question
    const withAnswers = questions.map(q => ({
      ...q.toObject(),
      studentAnswer: result.savedAnswers?.get(String(q._id)) || null,
    }));

    res.json({ questions: withAnswers, assignedSet: result.assignedSet, exam });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
