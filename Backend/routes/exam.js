const express = require("express");
const router = express.Router();
const multer = require("multer");
const XLSX = require("xlsx");
const Exam = require("../models/Exam");
const Question = require("../models/Question");
const { authMiddleware } = require("../middleware/auth");

const upload = multer({ storage: multer.memoryStorage() });

/* ══════════════════════════════════════════════════════════════
   HELPER: parse date + time from Excel cell.

   Supports all formats teachers might type:
     "2024-01-15 06:00 PM"   → 18:00  (with AM/PM column or inline)
     "2024-01-15 06:00 AM"   → 06:00
     "2024-01-15 18:00"      → 18:00  (24-hour, no AM/PM)
     "2024-01-15 06:00"      → 06:00
     OA serial number        → parsed via XLSX.SSF
     JS Date object          → used directly
══════════════════════════════════════════════════════════════ */
function parseExcelDateTime(dateVal, ampmVal) {
  if (!dateVal) return null;

  let d;

  // Case 1: JS Date object (cellDates:true)
  if (dateVal instanceof Date) {
    d = new Date(dateVal);
  }
  // Case 2: OA serial number
  else if (typeof dateVal === "number") {
    const parsed = XLSX.SSF.parse_date_code(dateVal);
    if (!parsed) return null;
    d = new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S);
  }
  // Case 3: String
  else if (typeof dateVal === "string") {
    let str = dateVal.trim();
    // Detect inline AM/PM inside the string itself
    const inlineAmPm = str.match(/\b(AM|PM)\b/i);
    if (inlineAmPm) {
      // e.g. "2024-01-15 06:00 PM"
      str = str.replace(/\s*(AM|PM)\s*/i, "").trim(); // strip AM/PM from string
      const base = new Date(str.replace(" ", "T"));
      if (isNaN(base.getTime())) return null;
      d = base;
      const isPM = inlineAmPm[1].toUpperCase() === "PM";
      const h = d.getHours();
      if (isPM && h < 12) d.setHours(h + 12);
      if (!isPM && h === 12) d.setHours(0);
      return d;
    }
    d = new Date(str.replace(" ", "T"));
    if (isNaN(d.getTime())) return null;
  } else {
    return null;
  }

  if (isNaN(d.getTime())) return null;

  // Apply separate AM/PM column if provided
  if (ampmVal) {
    const ampm = String(ampmVal).trim().toUpperCase();
    const h = d.getHours();
    if (ampm === "PM" && h < 12) d.setHours(h + 12);
    if (ampm === "AM" && h === 12) d.setHours(0);
  }

  return d;
}

/* ── CREATE EXAM (draft — no publish time check here) ── */
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const {
      subject, courseCode, duration, section, teacherId,
      positiveMarks, negativeMarks, showResult, showQuestions,
      startTime, endTime, hasSets,
    } = req.body;

    const newExam = new Exam({
      subject, courseCode, duration, section,
      createdBy: teacherId || req.user.id,
      positiveMarks: positiveMarks || 1,
      negativeMarks: negativeMarks || 0,
      showResult: showResult !== undefined ? showResult : true,
      showQuestions: showQuestions || false,
      startTime: startTime ? new Date(startTime) : null,
      endTime:   endTime   ? new Date(endTime)   : null,
      hasSets: hasSets || false,
      published: false,
    });
    await newExam.save();
    res.json({ success: true, exam: newExam });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── UPLOAD EXCEL (creates draft) ── */
router.post("/upload-excel", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });

    const metaSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!metaSheet) return res.status(400).json({ message: "Sheet 1 (Quiz_Metadata) is missing" });

    const metaRows = XLSX.utils.sheet_to_json(metaSheet, { raw: false, dateNF: "yyyy-mm-dd hh:mm" });
    if (!metaRows.length) return res.status(400).json({ message: "Metadata sheet is empty" });

    const meta = metaRows[0];
    if (!meta.QuizName || !meta.Duration)
      return res.status(400).json({ message: "Missing QuizName or Duration in Sheet 1" });

    // Also read raw for serial-number dates
    const metaRowsRaw = XLSX.utils.sheet_to_json(metaSheet, { raw: true });
    const metaRaw = metaRowsRaw[0] || {};

    // Parse start/end with optional separate AM/PM columns
    const startTime = parseExcelDateTime(metaRaw.StartTime, metaRaw.StartAMPM || meta.StartAMPM);
    const endTime   = parseExcelDateTime(metaRaw.EndTime,   metaRaw.EndAMPM   || meta.EndAMPM);

    const hasSets = workbook.SheetNames.length >= 3;

    const newExam = new Exam({
      subject:       meta.QuizName,
      courseCode:    meta.CourseCode || "",
      duration:      Number(meta.Duration),
      section:       meta.Section || req.body.section || "General",
      createdBy:     req.user.id,
      positiveMarks: Number(meta.PositiveMarks) || 1,
      negativeMarks: Number(meta.NegativeMarks) || 0,
      showResult:    meta.ShowResult === "true" || meta.ShowResult === "TRUE" ||
                     meta.ShowResult === true   || Number(meta.ShowResult) === 1,
      showQuestions: false,
      startTime,
      endTime,
      hasSets,
      published: false,
    });
    await newExam.save();

    const parseQSheet = (sheetName, defaultSetType) => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) return [];
      const rows = XLSX.utils.sheet_to_json(sheet, { raw: false });
      return rows
        .filter(r => r.Question)
        .map(r => ({
          examId: newExam._id,
          question: String(r.Question).trim(),
          options: [r.Option1, r.Option2, r.Option3, r.Option4]
            .map(o => (o !== undefined && o !== null ? String(o).trim() : ""))
            .filter(Boolean),
          correctAnswer: String(r.CorrectAnswer).trim(),
          setType: defaultSetType,
        }));
    };

    const questionsA = parseQSheet(workbook.SheetNames[1], hasSets ? "even" : "all");
    const questionsB = hasSets ? parseQSheet(workbook.SheetNames[2], "odd") : [];
    const allQ = [...questionsA, ...questionsB];
    if (allQ.length) await Question.insertMany(allQ);

    res.json({ success: true, exam: newExam, questionCount: allQ.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── PUBLISH (with time validation) ── */
router.patch("/:id/publish", authMiddleware, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const now = new Date();

    // Block if endTime is already in the past
    if (exam.endTime && new Date(exam.endTime) <= now) {
      return res.status(400).json({
        message: `Cannot publish: End time (${new Date(exam.endTime).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}) has already passed. Please update the end time first.`,
        code: "END_TIME_PASSED",
      });
    }

    // Warn (but allow) if startTime is in the past — exam will appear as "Live" immediately
    const startPassed = exam.startTime && new Date(exam.startTime) <= now;

    exam.published = true;
    await exam.save();

    req.io.to(`section_${exam.section}`).emit("exam_published", exam);

    res.json({
      success: true,
      exam,
      warning: startPassed
        ? `Note: Start time (${new Date(exam.startTime).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}) has already passed. Students can attempt the quiz immediately.`
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── UNPUBLISH ── */
router.patch("/:id/unpublish", authMiddleware, async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, { published: false }, { new: true });
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    req.io.to(`section_${exam.section}`).emit("exam_unpublished", exam._id);
    res.json({ success: true, exam });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── UPDATE EXAM SETTINGS ── */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const {
      subject, courseCode, duration, section,
      positiveMarks, negativeMarks, showResult, showQuestions,
      startTime, endTime,
    } = req.body;

    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      {
        subject, courseCode, duration, section,
        positiveMarks, negativeMarks, showResult, showQuestions,
        startTime: startTime ? new Date(startTime) : null,
        endTime:   endTime   ? new Date(endTime)   : null,
      },
      { new: true }
    );
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    res.json({ success: true, exam });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── DELETE EXAM + all its questions ── */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    await Question.deleteMany({ examId: req.params.id });
    req.io.to(`section_${exam.section}`).emit("exam_deleted", req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── DOWNLOAD EXCEL TEMPLATE (with AM/PM columns) ── */
router.get("/excel-template", (req, res) => {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb,
    XLSX.utils.json_to_sheet([{
      QuizName:     "Sample Quiz",
      CourseCode:   "CS401",
      Duration:     60,
      Section:      "4CS-DS-A-G1",
      PositiveMarks: 1,
      NegativeMarks: 0.25,
      ShowResult:   "true",
      StartTime:    "2024-01-15 06:00",
      StartAMPM:    "PM",
      EndTime:      "2024-01-15 07:00",
      EndAMPM:      "PM",
    }]),
    "Quiz_Metadata"
  );

  XLSX.utils.book_append_sheet(wb,
    XLSX.utils.json_to_sheet([
      { Question: "What is 2+2?",      Option1:"3", Option2:"4", Option3:"5", Option4:"6",       CorrectAnswer:"4"     },
      { Question: "Capital of India?", Option1:"Mumbai", Option2:"Delhi", Option3:"Kolkata", Option4:"Chennai", CorrectAnswer:"Delhi" },
    ]),
    "Questions_Set_A_Even"
  );

  XLSX.utils.book_append_sheet(wb,
    XLSX.utils.json_to_sheet([
      { Question: "What is 3+3?",  Option1:"5", Option2:"6", Option3:"7", Option4:"8",       CorrectAnswer:"6"       },
      { Question: "Largest planet?", Option1:"Earth", Option2:"Mars", Option3:"Jupiter", Option4:"Saturn", CorrectAnswer:"Jupiter" },
    ]),
    "Questions_Set_B_Odd"
  );

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Disposition", "attachment; filename=quiz_template.xlsx");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buffer);
});

/* ── GET ALL EXAMS ── */
router.get("/", async (req, res) => {
  try {
    const filter = req.query.role === "teacher" ? {} : { published: true };
    const exams = await Exam.find(filter).populate("createdBy", "name employeeId");
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET SINGLE EXAM ── */
router.get("/:id", async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate("createdBy", "name");
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
