const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  department: { type: String, required: true },
  designation: { type: String, required: true },
});

module.exports = mongoose.model("Teacher", teacherSchema);
