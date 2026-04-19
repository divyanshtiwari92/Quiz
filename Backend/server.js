const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const examRoutes = require("./routes/exam");
const questionRoutes = require("./routes/question");
const resultRoutes = require("./routes/result");
const connectDB = require("./config/db");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// ================= MIDDLEWARE =================
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));
app.use(express.json());

// Make io accessible in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ================= DB =================
connectDB();

// ================= ROUTES =================
app.use("/api/auth", authRoutes);
app.use("/api/exam", examRoutes);
app.use("/api/question", questionRoutes);
app.use("/api/result", resultRoutes);

// ================= TEST =================
app.get("/", (req, res) => res.send("🚀 CBT Server running"));

// ================= SOCKET.IO =================
io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  socket.on("join_student_room", (section) => {
    socket.join(`section_${section}`);
    console.log(`Student joined room: section_${section}`);
  });

  socket.on("join_teacher_room", (teacherId) => {
    socket.join(`teacher_${teacherId}`);
    console.log(`Teacher joined room: teacher_${teacherId}`);
  });

  socket.on("log_violation", (data) => {
    console.log("⚠️ VIOLATION:", data);
    // Broadcast to teacher
    io.to(`teacher_${data.teacherId}`).emit("student_violation", data);
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// ================= SERVER =================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
