const express = require("express");
const router = express.Router();
const XLSX = require("xlsx");
const mongoose = require("mongoose");
const Result = require("../models/Result");
const Exam = require("../models/Exam");
const Question = require("../models/Question");
const Student = require("../models/Student");
const { authMiddleware } = require("../middleware/auth");

/* ── HELPER: roll number → even/odd set ── */
function getSetFromRollNo(rollNo) {
  const numeric = (rollNo || "").replace(/\D/g, "");
  const lastPart = parseInt(numeric.slice(-3) || numeric, 10);
  return isNaN(lastPart) ? "all" : lastPart % 2 === 0 ? "even" : "odd";
}

/* ── HELPER: safe ObjectId cast ── */
function toObjId(v) {
  if (!v) return v;
  if (v instanceof mongoose.Types.ObjectId) return v;
  const s = String(v).trim().replace(/^"+|"+$/g, ""); // strip any stray quotes
  return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : v;
}

/* ══════════════════════════════════════════════════════════
   GET ALL (FOR TEACHER)
   Uses aggregation $lookup so it works regardless of whether
   studentId was stored as ObjectId or string.
══════════════════════════════════════════════════════════ */
router.get("/all", async (req, res) => {
  try {
    // Step 1: get raw results
    const results = await Result.find().lean();

    // Step 2: get all students and exams as lookup maps (string key)
    const allStudents = await Student.find({}, "name rollNo section").lean();
    const allExams    = await Exam.find({}, "subject section duration showResult showQuestions").lean();

    const studentMap = {};
    allStudents.forEach(s => { studentMap[String(s._id)] = s; });

    const examMap = {};
    allExams.forEach(e => { examMap[String(e._id)] = e; });

    // Step 3: enrich each result
    const enriched = results.map(r => {
      const sid = String(r.studentId || "").trim();
      const eid = String(r.examId    || "").trim();
      return {
        ...r,
        studentId: studentMap[sid] || r.studentId,
        examId:    examMap[eid]    || r.examId,
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET BY STUDENT ── */
router.get("/student/:studentId", async (req, res) => {
  try {
    const sid = String(req.params.studentId).trim();
    // Try both ObjectId and string match
    const results = await Result.find({
      $or: [
        { studentId: mongoose.Types.ObjectId.isValid(sid) ? new mongoose.Types.ObjectId(sid) : null },
        { studentId: sid }
      ]
    }).lean();

    const allExams = await Exam.find({}, "subject section duration showResult showQuestions").lean();
    const examMap = {};
    allExams.forEach(e => { examMap[String(e._id)] = e; });

    const enriched = results.map(r => ({
      ...r,
      examId: examMap[String(r.examId)] || r.examId,
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── CHECK STATUS ── */
router.get("/status/:studentId/:examId", async (req, res) => {
  try {
    const sid = String(req.params.studentId).trim();
    const eid = String(req.params.examId).trim();

    const result = await Result.findOne({
      $or: [
        {
          studentId: mongoose.Types.ObjectId.isValid(sid) ? new mongoose.Types.ObjectId(sid) : sid,
          examId:    mongoose.Types.ObjectId.isValid(eid) ? new mongoose.Types.ObjectId(eid) : eid,
        },
        { studentId: sid, examId: eid }
      ]
    });

    if (!result) return res.json({ status: "not-started" });
    res.json({ status: result.status, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── ANALYTICS BY EXAM ── */
router.get("/analytics/:examId", async (req, res) => {
  try {
    const results = await Result.find({ examId: req.params.examId, status: "submitted" }).lean();
    if (!results.length) return res.json({ total: 0, avg: 0, highest: 0, lowest: 0, results: [] });

    const allStudents = await Student.find({}, "name rollNo section").lean();
    const studentMap = {};
    allStudents.forEach(s => { studentMap[String(s._id)] = s; });

    const enriched = results.map(r => ({
      ...r,
      studentId: studentMap[String(r.studentId)] || r.studentId,
    }));

    const scores = enriched.map(r => r.score || 0);
    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
    res.json({ total: enriched.length, avg, highest: Math.max(...scores), lowest: Math.min(...scores), results: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── EXPORT RESULTS TO EXCEL ── */
router.get("/export/:examId", async (req, res) => {
  try {
    const results = await Result.find({ examId: req.params.examId, status: "submitted" }).lean();

    const allStudents = await Student.find({}, "name rollNo section").lean();
    const studentMap  = {};
    allStudents.forEach(s => { studentMap[String(s._id)] = s; });

    const allExams = await Exam.find({}, "subject").lean();
    const examMap  = {};
    allExams.forEach(e => { examMap[String(e._id)] = e; });

    const rows = results.map(r => {
      const stu = studentMap[String(r.studentId)] || {};
      const ex  = examMap[String(r.examId)]       || {};
      return {
        Name:        stu.name    || "",
        RollNo:      stu.rollNo  || "",
        Section:     stu.section || "",
        Subject:     ex.subject  || "",
        Score:       r.score,
        Total:       r.total,
        Percentage:  r.total > 0 ? ((r.score / r.total) * 100).toFixed(2) + "%" : "0%",
        Set:         r.assignedSet,
        Violations:  r.violationCount,
        Status:      r.status,
        SubmittedAt: r.submittedAt ? new Date(r.submittedAt).toLocaleString("en-IN") : "",
      };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Results");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", `attachment; filename=results_${req.params.examId}.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── START / RESUME EXAM ── */
router.post("/start", authMiddleware, async (req, res) => {
  try {
    const studentId = toObjId(req.body.studentId);
    const examId    = toObjId(req.body.examId);
    const rollNo    = req.body.rollNo || "";

    // Find with both possible storage formats
    const existing = await Result.findOne({
      $or: [
        { studentId, examId },
        { studentId: String(req.body.studentId).trim(), examId: String(req.body.examId).trim() }
      ]
    });

    if (existing) {
      if (existing.status === "submitted")
        return res.status(403).json({ message: "Already submitted. Re-attempt not allowed." });
      return res.json({ success: true, resume: true, result: existing, assignedSet: existing.assignedSet });
    }

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const now = new Date();
    if (exam.startTime && now < exam.startTime)
      return res.status(403).json({ message: "Exam has not started yet.", startTime: exam.startTime });
    if (exam.endTime && now > exam.endTime)
      return res.status(403).json({ message: "Exam time has ended." });

    const assignedSet = getSetFromRollNo(rollNo);
    const result = new Result({
      studentId,   // stored as ObjectId
      examId,      // stored as ObjectId
      status: "in-progress",
      timeRemaining: exam.duration * 60,
      assignedSet,
      startedAt: new Date(),
    });
    await result.save();
    res.json({ success: true, resume: false, result, assignedSet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── AUTO SAVE ── */
router.post("/autosave", authMiddleware, async (req, res) => {
  try {
    const studentId = toObjId(req.body.studentId);
    const examId    = toObjId(req.body.examId);
    const { savedAnswers, markedForReview, timeRemaining } = req.body;

    const result = await Result.findOne({
      $or: [
        { studentId, examId },
        { studentId: String(req.body.studentId).trim(), examId: String(req.body.examId).trim() }
      ]
    });
    if (!result) return res.status(404).json({ message: "Session not found" });
    if (result.status === "submitted") return res.status(403).json({ message: "Already submitted" });

    if (savedAnswers) {
      for (const [qId, ans] of Object.entries(savedAnswers)) result.savedAnswers.set(qId, ans);
    }
    if (markedForReview) result.markedForReview = markedForReview;
    if (timeRemaining !== undefined) result.timeRemaining = timeRemaining;
    await result.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── SUBMIT ── */
router.post("/submit", authMiddleware, async (req, res) => {
  try {
    const studentId = toObjId(req.body.studentId);
    const examId    = toObjId(req.body.examId);

    const result = await Result.findOne({
      $or: [
        { studentId, examId },
        { studentId: String(req.body.studentId).trim(), examId: String(req.body.examId).trim() }
      ]
    });
    if (!result) return res.status(404).json({ message: "Session not found" });
    if (result.status === "submitted") return res.json({ success: true, message: "Already submitted", result });

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    let filter = { examId };
    if (result.assignedSet !== "all") {
      filter.$or = [{ setType: result.assignedSet }, { setType: "all" }];
    }
    const questions = await Question.find(filter);

    let score = 0;
    const total = questions.length * (exam.positiveMarks || 1);
    questions.forEach(q => {
      const ans = result.savedAnswers.get(String(q._id));
      if (ans === q.correctAnswer) score += exam.positiveMarks || 1;
      else if (ans) score -= exam.negativeMarks || 0;
    });

    result.score = Math.max(0, score);
    result.total = total;
    result.status = "submitted";
    result.submittedAt = new Date();
    await result.save();

    // Fetch student so we can send full enriched data — teacher UI updates instantly
    const student = await Student.findById(studentId).lean();
    const enrichedResult = {
      ...result.toObject(),
      studentId: student
        ? { _id: student._id, name: student.name, rollNo: student.rollNo, section: student.section }
        : { _id: studentId },
      examId: {
        _id: exam._id, subject: exam.subject, section: exam.section,
        duration: exam.duration, showResult: exam.showResult, showQuestions: exam.showQuestions,
      },
    };

    // Emit to teacher-specific room + global broadcast (double coverage)
    req.io.to(`teacher_${String(exam.createdBy)}`).emit("student_submitted", enrichedResult);
    req.io.emit("new_result", enrichedResult);

    const responseData = { success: true, result };
    if (!exam.showResult) {
      responseData.result = { ...result.toObject(), score: null, savedAnswers: null };
      responseData.message = "Submitted. Results will be announced later.";
    }
    res.json(responseData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── LOG VIOLATION ── */
router.post("/violation", authMiddleware, async (req, res) => {
  try {
    const studentId = toObjId(req.body.studentId);
    const examId    = toObjId(req.body.examId);

    const result = await Result.findOne({
      $or: [
        { studentId, examId },
        { studentId: String(req.body.studentId).trim(), examId: String(req.body.examId).trim() }
      ]
    });
    if (!result) return res.status(404).json({ message: "Session not found" });
    result.violations.push({ type: req.body.violationType, timestamp: new Date() });
    result.violationCount += 1;
    await result.save();
    res.json({ success: true, violationCount: result.violationCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;