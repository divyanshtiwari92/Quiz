const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const { JWT_SECRET } = require("../middleware/auth");

/* ================= STUDENT LOGIN ================= */
router.post("/student/login", async (req, res) => {
  try {
    const { rollNo, password } = req.body;
    const student = await Student.findOne({ rollNo });
    if (!student) return res.status(401).json({ message: "Student not found" });
    if (student.password !== password) return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: student._id, role: "student", rollNo: student.rollNo },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      success: true,
      role: "student",
      token,
      user: {
        id: student._id,
        name: student.name,
        rollNo: student.rollNo,
        section: student.section,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= TEACHER LOGIN ================= */
router.post("/teacher/login", async (req, res) => {
  try {
    const { employeeId, password } = req.body;
    const teacher = await Teacher.findOne({ employeeId });
    if (!teacher) return res.status(401).json({ message: "Teacher not found" });
    if (teacher.password !== password) return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: teacher._id, role: "teacher", employeeId: teacher.employeeId },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      success: true,
      role: "teacher",
      token,
      user: {
        id: teacher._id,
        name: teacher.name,
        employeeId: teacher.employeeId,
        department: teacher.department,
        designation: teacher.designation,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
