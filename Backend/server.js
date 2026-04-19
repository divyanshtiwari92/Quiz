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

// ================= ALLOWED ORIGINS =================
const allowedOrigins = [
  "http://localhost:3000",
  "https://quiz-vert-six-98.vercel.app"
];

// ================= SOCKET.IO =================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// ================= MIDDLEWARE =================
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

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

// ================= TEST ROUTE =================
app.get("/", (req, res) => {
  res.send("🚀 CBT Server running");
});

// ================= SOCKET EVENTS =================
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

    io.to(`teacher_${data.teacherId}`).emit("student_violation", data);
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// ================= SERVER =================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});