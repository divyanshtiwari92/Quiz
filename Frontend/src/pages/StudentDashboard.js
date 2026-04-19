import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { API, authFetch } from "../utils/api";
import { useSocket } from "../context/SocketContext";
import ViewQuestions from "./ViewQuestions";

function fmtDateTime(val) {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
}

function CountdownBadge({ startTime }) {
  const [left, setLeft] = useState("");
  useEffect(() => {
    const calc = () => {
      const diff = new Date(startTime) - new Date();
      if (diff <= 0) { setLeft(""); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLeft(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [startTime]);
  if (!left) return null;
  return <span className="badge bg-amber-100 text-amber-700">🕐 Starts in {left}</span>;
}

function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [toast, setToast] = useState(null);
  const [viewQExam, setViewQExam] = useState(null); // ViewQuestions modal
  const navigate = useNavigate();
  const { socket } = useSocket();

  const showToast = (msg, type = "info") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const fetchData = useCallback(async (u) => {
    try {
      const [eRes, rRes] = await Promise.all([
        authFetch(`${API}/exam`),  // only published exams returned by default
        authFetch(`${API}/result/student/${u.id}`),
      ]);
      const eD = await eRes.json();
      const rD = await rRes.json();
      if (Array.isArray(eD)) setExams(eD);
      if (Array.isArray(rD)) setResults(rD);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user"));
    const role = localStorage.getItem("role");
    if (!u || role !== "student") { navigate("/"); return; }
    setUser(u);
    fetchData(u);
  }, [navigate, fetchData]);

  // Poll for result updates every 10 seconds as fallback (covers cases where socket misses)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchData(user);
    }, 10000);
    return () => clearInterval(interval);
  }, [user, fetchData]);

  useEffect(() => {
    if (!socket || !user) return;
    socket.emit("join_student_room", user.section);

    socket.on("exam_published", (exam) => {
      if (exam.section === user.section) {
        setExams(prev => prev.find(e => e._id === exam._id) ? prev.map(e => e._id === exam._id ? exam : e) : [exam, ...prev]);
        showToast(`📢 New quiz available: ${exam.subject}`, "success");
      }
    });
    socket.on("exam_unpublished", (examId) => {
      setExams(prev => prev.filter(e => e._id !== examId));
    });
    socket.on("exam_deleted", (examId) => {
      setExams(prev => prev.filter(e => e._id !== examId));
    });

    return () => {
      socket.off("exam_published");
      socket.off("exam_unpublished");
      socket.off("exam_deleted");
    };
  }, [socket, user]);

  const handleLogout = () => { localStorage.clear(); navigate("/"); };

  if (!user) return null;

  const now = new Date();

  // Maps for quick lookup
  const examMap = {};
  exams.forEach(e => { examMap[e._id] = e; });

  const resultMap = {};
  results.forEach(r => { resultMap[String(r.examId?._id || r.examId)] = r; });

  const submittedIds = results.filter(r => r.status === "submitted").map(r => String(r.examId?._id || r.examId));
  const inProgressIds = results.filter(r => r.status === "in-progress").map(r => String(r.examId?._id || r.examId));

  // Only section exams, not ended
  const sectionExams = exams.filter(e =>
    e.section === user.section &&
    !(e.endTime && new Date(e.endTime) < now)
  );

  const availableExams = sectionExams.filter(e => !submittedIds.includes(String(e._id)));
  const completedResults = results.filter(r => r.status === "submitted");

  const totalScore = completedResults.reduce((s, r) => s + (r.score || 0), 0);
  const totalPossible = completedResults.reduce((s, r) => s + (r.total || 0), 0);
  const avgPct = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : null;

  const handleStart = (exam) => {
    if (exam.startTime && new Date(exam.startTime) > now) {
      showToast("⏳ This quiz hasn't started yet.", "warn"); return;
    }
    navigate(`/quiz/${exam._id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 slide-in px-5 py-3 rounded-2xl shadow-lg text-sm font-medium border max-w-sm ${
          toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
          toast.type === "warn"   ? "bg-amber-50 border-amber-200 text-amber-800" :
          "bg-blue-50 border-blue-200 text-blue-800"}`}>{toast.msg}</div>
      )}

      {/* ViewQuestions modal */}
      {viewQExam && <ViewQuestions exam={viewQExam} onClose={() => setViewQExam(null)} />}

      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex justify-between items-center px-6 py-3">
          <span className="text-xl font-bold text-brand-600">📘 Quiz Portal</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:block">👋 {user.name}</span>
            <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-red-200 transition-all">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Available",  value: availableExams.filter(e => !e.startTime || new Date(e.startTime) <= now).length, icon: "📋" },
            { label: "Upcoming",   value: availableExams.filter(e => e.startTime && new Date(e.startTime) > now).length, icon: "🕐" },
            { label: "Completed",  value: completedResults.length, icon: "✅" },
            { label: "Avg Score",  value: avgPct !== null ? `${avgPct}%` : "—", icon: "📊" },
          ].map(s => (
            <div key={s.label} className="card p-5">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Profile + Available Exams */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile */}
          <div className="card p-6">
            <p className="label mb-4">My Profile</p>
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-2xl font-bold mb-3 shadow-lg">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <p className="font-bold text-slate-800">{user.name}</p>
              <p className="text-sm text-brand-500 font-mono mt-0.5">{user.rollNo}</p>
            </div>
            <div className="space-y-2 text-sm border-t border-slate-100 pt-4">
              <div className="flex justify-between"><span className="text-slate-400">Section</span><span className="font-medium text-slate-700">{user.section}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Roll No</span><span className="font-mono text-slate-700 text-xs">{user.rollNo}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Role</span><span className="badge bg-brand-100 text-brand-700">Student</span></div>
            </div>
          </div>

          {/* Available Exams */}
          <div className="md:col-span-2 card p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="label">Available Quizzes</p>
              <span className="badge bg-slate-100 text-slate-600">{availableExams.length} pending</span>
            </div>

            {availableExams.length > 0 ? (
              <div className="space-y-3">
                {availableExams.map(exam => {
                  const isUpcoming = exam.startTime && new Date(exam.startTime) > now;
                  const isResume = inProgressIds.includes(String(exam._id));
                  return (
                    <div key={exam._id}
                      onClick={() => handleStart(exam)}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all group ${
                        isUpcoming
                          ? "border-amber-100 bg-amber-50/40 cursor-default opacity-80"
                          : "border-slate-100 hover:border-brand-200 hover:bg-brand-50/50 cursor-pointer"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className={`font-semibold text-sm truncate ${isUpcoming?"text-slate-600":"text-slate-800 group-hover:text-brand-700"}`}>{exam.subject}</p>
                          {isResume && <span className="badge bg-amber-100 text-amber-700">↩ Resume</span>}
                          {isUpcoming
                            ? <CountdownBadge startTime={exam.startTime} />
                            : <span className="badge bg-emerald-100 text-emerald-700 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-dot inline-block"/>Live</span>
                          }
                        </div>
                        <p className="text-xs text-slate-400">
                          ⏱ {exam.duration} min{exam.courseCode ? ` · ${exam.courseCode}` : ""}{exam.negativeMarks > 0 ? ` · −${exam.negativeMarks} negative` : ""}
                          {exam.endTime ? ` · Closes ${fmtDateTime(exam.endTime)}` : ""}
                        </p>
                      </div>
                      {!isUpcoming && (
                        <svg className="w-4 h-4 text-slate-300 group-hover:text-brand-500 shrink-0 ml-3 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="text-5xl mb-3">🎉</span>
                <p className="font-semibold text-slate-600">All done!</p>
                <p className="text-sm text-slate-400 mt-1">No pending quizzes for your section</p>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {completedResults.length > 0 && (
          <div className="card p-6">
            <p className="label mb-4">My Results</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedResults.map((r, i) => {
                const exam = examMap[String(r.examId?._id || r.examId)];
                const pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
                const pass = pct >= 40;
                const canReview = exam?.showQuestions;
                const hasScore = r.score !== null && r.score !== undefined;

                return (
                  <div key={i} className="border border-slate-100 rounded-2xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-slate-800 text-sm leading-tight flex-1 mr-2">{exam?.subject || r.examId?.subject || "Quiz"}</p>
                      {hasScore && <span className={`badge shrink-0 ${pass ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>{pass ? "Pass" : "Fail"}</span>}
                    </div>

                    {hasScore ? (
                      <>
                        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                          <span>Score</span>
                          <span className="font-semibold text-slate-600">{r.score}/{r.total}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                          <div className={`h-2 rounded-full ${pass ? "bg-emerald-500" : "bg-red-400"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className={`text-right text-xs font-bold mb-3 ${pass ? "text-emerald-600" : "text-red-500"}`}>{pct}%</p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 mt-2 mb-3">Results will be announced by your teacher</p>
                    )}

                    {/* View Questions button — only if teacher enabled it */}
                    {exam && (
                      <button
                        onClick={() => canReview ? setViewQExam(exam) : showToast("Teacher has not enabled question review for this quiz.", "warn")}
                        className={`w-full text-xs font-semibold py-2 rounded-xl transition-all ${
                          canReview
                            ? "bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200"
                            : "bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed"
                        }`}
                      >
                        {canReview ? "📋 View Questions & Answers" : "🔒 Review Not Available"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentDashboard;