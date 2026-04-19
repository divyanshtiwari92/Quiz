# 🎓 CBT Examination Portal v2.0

A production-ready Computer Based Testing (CBT) system built with MERN stack, Socket.IO, and Tailwind CSS.

---

## 📁 Project Structure

```
cbt-system/
├── Backend/
│   ├── config/db.js
│   ├── middleware/auth.js
│   ├── models/
│   │   ├── Exam.js
│   │   ├── Question.js
│   │   ├── Result.js
│   │   ├── Student.js
│   │   └── Teacher.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── exam.js
│   │   ├── question.js
│   │   └── result.js
│   ├── server.js
│   ├── .env
│   └── package.json
│
└── Frontend/
    ├── public/index.html
    ├── src/
    │   ├── context/SocketContext.js
    │   ├── pages/
    │   │   ├── Login.js
    │   │   ├── StudentDashboard.js
    │   │   ├── TeacherDashboard.js
    │   │   └── AttemptQuiz.js
    │   ├── utils/api.js
    │   ├── App.js
    │   ├── index.js
    │   └── index.css
    ├── tailwind.config.js
    ├── postcss.config.js
    └── package.json
```

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- npm or yarn

---

### 1️⃣ Backend Setup

```bash
cd Backend
npm install
```

Edit `.env`:
```env
MONGO_URI=mongodb://localhost:27017/cbt_portal
PORT=5000
JWT_SECRET=your_super_secret_key_here
CLIENT_URL=http://localhost:3000
```

Start the server:
```bash
npm run dev     # development (nodemon)
npm start       # production
```

---

### 2️⃣ Frontend Setup

```bash
cd Frontend
npm install
```

Create `.env` (optional — defaults to localhost):
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

Start the app:
```bash
npm start
```

App runs at: **http://localhost:3000**

---

### 3️⃣ Seed Initial Data (MongoDB Shell or Compass)

Insert a Teacher:
```js
db.teachers.insertOne({
  employeeId: "SKIT001",
  name: "Dr. Ravi Sharma",
  password: "teacher123",
  department: "Computer Science",
  designation: "Associate Professor"
})
```

Insert a Student:
```js
db.students.insertOne({
  rollNo: "24ESKCX033",
  name: "Rahul Meena",
  section: "4CS-DS-A-G1",
  password: "student123"
})
```

---

## ✨ Feature Overview

### ⚡ Real-Time (Socket.IO)
- Exam created → instantly appears on student dashboard
- Student submits → teacher notified live
- Violations → real-time alert to teacher

### 📊 Excel-Based Quiz Creation
- Download template (3 sheets: Metadata, Set A, Set B)
- Upload → parsed, validated, stored automatically

### 🔀 Even/Odd Question Sets
- Roll number numeric part extracted (e.g. 24ESKCX**033** → 33)
- Odd number → Set B questions; Even → Set A
- Student cannot access wrong set

### ⏱️ Time-Based Exam Control
- Set StartTime / EndTime per exam
- Students blocked before start / after end
- Countdown timer with color warnings (amber < 5min, red < 1min)
- Auto-submit on timeout

### 🔒 Attempt Restriction
- One attempt per student per exam
- In-progress → resume with saved answers + remaining time
- Submitted → blocked with message

### 💾 Auto-Save + Resume
- Saves every 15 seconds + on every answer click
- Resume after refresh/reconnect restores answers and timer

### 🔐 Anti-Cheat Features
| Feature | Action |
|---|---|
| Tab switch | Warning + violation log |
| Window blur | Warning + violation log |
| Fullscreen exit | Warning + violation log |
| Right click | Blocked |
| Ctrl+C/A/V/U/S | Blocked |
| F12 / DevTools shortcut | Blocked |
| 3 violations | Auto-submit |

### 📋 Question Palette
- Color-coded: Green (answered), Grey (unanswered), Violet (marked for review)
- Click any number to jump to question
- Mobile-responsive drawer

### 📈 Teacher Analytics
- Total attempts, average, highest, lowest score
- Per-exam analytics view
- Export results to Excel (.xlsx)

### 🔐 JWT Security
- All protected routes require Bearer token
- Token stored in localStorage
- 8-hour expiry

---

## 🌐 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/student/login` | Student login |
| POST | `/api/auth/teacher/login` | Teacher login |
| GET | `/api/exam` | Get all exams |
| POST | `/api/exam/create` | Create exam (auth) |
| POST | `/api/exam/upload-excel` | Upload Excel exam (auth) |
| GET | `/api/exam/excel-template` | Download template |
| GET | `/api/question/:examId?setType=even` | Get questions |
| POST | `/api/question/add` | Add question (auth) |
| POST | `/api/result/start` | Start/resume exam (auth) |
| POST | `/api/result/autosave` | Auto save answers (auth) |
| POST | `/api/result/submit` | Submit exam (auth) |
| POST | `/api/result/violation` | Log violation (auth) |
| GET | `/api/result/all` | All results (teacher) |
| GET | `/api/result/analytics/:examId` | Exam analytics |
| GET | `/api/result/export/:examId` | Export Excel |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router v7, Tailwind CSS v3 |
| Backend | Express.js, Node.js |
| Database | MongoDB, Mongoose |
| Real-Time | Socket.IO |
| Auth | JWT (jsonwebtoken) |
| Excel | xlsx (SheetJS) |
| File Upload | Multer |

---

## ⚠️ Production Checklist

- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Use MongoDB Atlas for cloud database
- [ ] Set `CLIENT_URL` to your deployed frontend URL
- [ ] Deploy backend to Railway / Render / EC2
- [ ] Deploy frontend to Vercel / Netlify
- [ ] Update `REACT_APP_API_URL` and `REACT_APP_SOCKET_URL` in frontend `.env`
- [ ] Enable HTTPS (required for Fullscreen API in production)
- [ ] Hash passwords using bcrypt (currently plain text for demo)

---

## 📝 Notes

- **Password hashing**: Currently passwords are stored as plain text for academic demo purposes. In production, use `bcrypt`.
- **Fullscreen API**: Requires HTTPS in production browsers.
- **Socket.IO CORS**: Update `CLIENT_URL` in `.env` to match your frontend domain.

---

*CBT Examination Portal v2.0 — SKIT Jaipur Academic Project*
