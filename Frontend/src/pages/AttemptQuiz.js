import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API, authFetch } from "../utils/api";
import { useSocket } from "../context/SocketContext";

const fmt = (s) => {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

/* ─── Question Palette ─── */
function QuestionPalette({ questions, answers, markedForReview, current, onJump, onSubmit }) {
  const answered = questions.filter(q => answers[q._id]).length;
  const marked = markedForReview.length;
  const unanswered = questions.length - answered;
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Question Palette</p>
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-md bg-emerald-500"/><span className="text-slate-600">Answered ({answered})</span></div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-md bg-slate-200"/><span className="text-slate-600">Not Answered ({unanswered})</span></div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-md bg-violet-400"/><span className="text-slate-600">Marked ({marked})</span></div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-5 gap-2">
          {questions.map((q, i) => {
            const isAnswered = !!answers[q._id];
            const isMarked = markedForReview.includes(q._id);
            const isCurrent = i === current;
            return (
              <button key={q._id} onClick={() => onJump(i)}
                className={`w-full aspect-square rounded-lg text-xs font-bold transition-all border-2 ${
                  isCurrent ? "border-brand-500 bg-brand-50 text-brand-700 scale-110 shadow-md" :
                  isMarked ? "border-violet-300 bg-violet-400 text-white" :
                  isAnswered ? "border-emerald-400 bg-emerald-500 text-white" :
                  "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-4 border-t border-slate-100">
        <div className="text-xs text-slate-400 mb-3 text-center">{answered}/{questions.length} answered</div>
        <button onClick={onSubmit} className="w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-red-200">
          🚀 Submit Quiz
        </button>
      </div>
    </div>
  );
}

/* ─── Instruction Screen ─── */
function InstructionScreen({ exam, questions, assignedSet, onStart }) {
  const [agreed, setAgreed] = useState(false);
  const setLabel = assignedSet === "even" ? "Set A (Even Roll Numbers)" : assignedSet === "odd" ? "Set B (Odd Roll Numbers)" : "All Students";
  const instructions = [
    "Read each question carefully before selecting your answer.",
    "You can navigate between questions using the Previous / Next buttons or the Question Palette.",
    "Click 🔖 Mark for Review to flag questions and revisit them later.",
    `The quiz will auto-submit when the timer reaches 00:00.`,
    exam.negativeMarks > 0 ? `Negative marking is enabled: −${exam.negativeMarks} marks for each wrong answer.` : "There is no negative marking for wrong answers.",
    "Do NOT switch tabs, minimize the window, or exit fullscreen — violations are recorded automatically.",
    "After 3 violations, your exam will be auto-submitted.",
    "Once submitted, you cannot re-attempt this quiz.",
    "Your answers are auto-saved every 15 seconds and on each answer click.",
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-brand-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden slide-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-8 py-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">Quiz Instructions</p>
          <h1 className="text-2xl font-bold">{exam.subject}</h1>
          {exam.courseCode && <p className="text-brand-200 text-sm mt-0.5">{exam.courseCode}</p>}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-b border-slate-100">
          {[
            { icon: "⏱", label: "Duration", value: `${exam.duration} min` },
            { icon: "❓", label: "Questions", value: questions.length },
            { icon: "✅", label: "Marks (+)", value: `+${exam.positiveMarks}` },
            { icon: "❌", label: "Marks (−)", value: exam.negativeMarks > 0 ? `−${exam.negativeMarks}` : "None" },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center justify-center py-4 border-r border-slate-100 last:border-r-0 text-center">
              <span className="text-xl mb-1">{s.icon}</span>
              <span className="text-lg font-bold text-slate-800">{s.value}</span>
              <span className="text-xs text-slate-400">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Set Info */}
        <div className="px-8 py-3 bg-violet-50 border-b border-violet-100 flex items-center gap-2">
          <span>🔀</span>
          <p className="text-sm text-violet-800 font-medium">Your question set: <span className="font-bold">{setLabel}</span></p>
        </div>

        {/* Instructions List */}
        <div className="px-8 py-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Please read before starting</p>
          <ol className="space-y-3">
            {instructions.map((inst, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-sm text-slate-700 leading-relaxed">{inst}</p>
              </li>
            ))}
          </ol>

          {/* Anti-cheat warning */}
          <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">🚨 Anti-Cheating Policy</p>
            <p className="text-xs text-red-600 leading-relaxed">
              This exam uses fullscreen monitoring, tab-switch detection, and keyboard restriction. Right-click and copy shortcuts are disabled. Any violation will be recorded and reported to your teacher.
            </p>
          </div>

          {/* Agreement */}
          <label className="flex items-start gap-3 mt-5 cursor-pointer select-none group">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${agreed ? "bg-brand-600 border-brand-600" : "border-slate-300 group-hover:border-brand-400"}`} onClick={() => setAgreed(!agreed)}>
              {agreed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
            </div>
            <span className="text-sm text-slate-700">I have read and understood all the instructions. I agree to attempt this quiz honestly and accept that violations may result in auto-submission.</span>
          </label>

          <button
            onClick={onStart}
            disabled={!agreed}
            className="w-full btn-primary py-4 mt-5 text-base rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🚀 Start Quiz Now
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN ATTEMPT QUIZ
═══════════════════════════════════════════ */
function AttemptQuiz() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [resultData, setResultData] = useState(null);
  const [phase, setPhase] = useState("loading"); // loading | instructions | exam | result | blocked
  const [blockMsg, setBlockMsg] = useState("");
  const [violationCount, setViolationCount] = useState(0);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [violationMsg, setViolationMsg] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [assignedSet, setAssignedSet] = useState("all");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const stateRef = useRef({ answers: {}, markedForReview: [], timeLeft: 0 });
  const autoSaveRef = useRef(null);
  const timerRef = useRef(null);
  const violationRef = useRef(0);
  const submittedRef = useRef(false);
  const examRef = useRef(null);
  const MAX_VIOLATIONS = 3;

  /* ─── Auto Save ─── */
  const doAutoSave = useCallback(async (a, m, t) => {
    if (submittedRef.current) return;
    setSaving(true);
    try {
      await authFetch(`${API}/result/autosave`, {
        method: "POST",
        body: JSON.stringify({ studentId: user.id, examId, savedAnswers: a, markedForReview: m, timeRemaining: t }),
      });
    } catch (_) {}
    setSaving(false);
  }, [examId, user.id]);

  /* ─── Submit ─── */
  const handleSubmit = useCallback(async (auto = false) => {
    if (submittedRef.current) return;
    if (!auto) {
      const ans = Object.keys(stateRef.current.answers).length;
      const total = examRef.current?.questionCount || 0;
      const ok = window.confirm(`You've answered ${ans}/${total} questions. Submit now?`);
      if (!ok) return;
    }
    submittedRef.current = true;
    setSubmitted(true);
    clearInterval(autoSaveRef.current);
    clearInterval(timerRef.current);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    try {
      const res = await authFetch(`${API}/result/submit`, {
        method: "POST",
        body: JSON.stringify({ studentId: user.id, examId }),
      });
      const data = await res.json();
      setResultData(data.result);
      setPhase("result");
    } catch (_) { setPhase("result"); }
  }, [examId, user.id]);

  /* ─── Violation Logger ─── */
  const logViolation = useCallback(async (type) => {
    if (submittedRef.current) return;
    violationRef.current += 1;
    setViolationCount(violationRef.current);
    try {
      await authFetch(`${API}/result/violation`, {
        method: "POST",
        body: JSON.stringify({ studentId: user.id, examId, violationType: type }),
      });
    } catch (_) {}
    if (socket) socket.emit("log_violation", { studentId: user.id, examId, violationType: type, teacherId: examRef.current?.createdBy?._id || examRef.current?.createdBy });
    if (violationRef.current >= MAX_VIOLATIONS) {
      handleSubmit(true);
    } else {
      setViolationMsg(`⚠️ Warning ${violationRef.current}/${MAX_VIOLATIONS}: ${type.replace(/_/g, " ")} detected. Exam auto-submits after ${MAX_VIOLATIONS} violations.`);
      setShowViolationWarning(true);
      setTimeout(() => setShowViolationWarning(false), 5000);
    }
  }, [examId, socket, user.id, handleSubmit]);

  /* ─── Anti-cheat listeners (only during exam) ─── */
  useEffect(() => {
    if (phase !== "exam") return;
    const noCtx = e => e.preventDefault();
    const noKeys = e => {
      if ((e.ctrlKey && ["c","a","v","u","s","p"].includes(e.key.toLowerCase())) || e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key === "I")) {
        e.preventDefault(); logViolation("keyboard_shortcut");
      }
    };
    const onVis = () => { if (document.hidden) logViolation("tab_switch"); };
    const onFS = () => { const isFS = !!document.fullscreenElement; setIsFullscreen(isFS); if (!isFS && !submittedRef.current) logViolation("fullscreen_exit"); };
    const onBlur = () => { if (!submittedRef.current) logViolation("window_blur"); };
    document.addEventListener("contextmenu", noCtx);
    document.addEventListener("keydown", noKeys);
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("fullscreenchange", onFS);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("contextmenu", noCtx);
      document.removeEventListener("keydown", noKeys);
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("fullscreenchange", onFS);
      window.removeEventListener("blur", onBlur);
    };
  }, [phase, logViolation]);

  /* ─── Timer ─── */
  useEffect(() => {
    if (phase !== "exam" || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        stateRef.current.timeLeft = prev - 1;
        if (prev <= 1) { clearInterval(timerRef.current); handleSubmit(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, submitted, handleSubmit]);

  /* ─── Auto Save interval ─── */
  useEffect(() => {
    if (phase !== "exam") return;
    autoSaveRef.current = setInterval(() => {
      doAutoSave(stateRef.current.answers, stateRef.current.markedForReview, stateRef.current.timeLeft);
    }, 15000);
    return () => clearInterval(autoSaveRef.current);
  }, [phase, doAutoSave]);

  /* ─── Load exam ─── */
  useEffect(() => {
    const init = async () => {
      try {
        const statusRes = await authFetch(`${API}/result/status/${user.id}/${examId}`);
        const statusData = await statusRes.json();
        if (statusData.status === "submitted") { setBlockMsg("You have already submitted this quiz. Re-attempts are not allowed."); setPhase("blocked"); return; }

        const startRes = await authFetch(`${API}/result/start`, {
          method: "POST",
          body: JSON.stringify({ studentId: user.id, examId, rollNo: user.rollNo }),
        });
        const startData = await startRes.json();
        if (!startRes.ok) { setBlockMsg(startData.message || "Cannot access this quiz."); setPhase("blocked"); return; }

        const set = startData.assignedSet || "all";
        setAssignedSet(set);

        const examRes = await authFetch(`${API}/exam/${examId}`);
        const examData = await examRes.json();
        setExam(examData);
        examRef.current = examData;

        const qRes = await authFetch(`${API}/question/${examId}${set !== "all" ? `?setType=${set}` : ""}`);
        const qData = await qRes.json();
        const qs = Array.isArray(qData) ? qData : [];
        setQuestions(qs);
        examRef.current.questionCount = qs.length;

        if (startData.resume && startData.result) {
          const saved = startData.result.savedAnswers || {};
          setAnswers(saved);
          stateRef.current.answers = saved;
          const mr = startData.result.markedForReview || [];
          setMarkedForReview(mr);
          stateRef.current.markedForReview = mr;
          const t = startData.result.timeRemaining || examData.duration * 60;
          setTimeLeft(t);
          stateRef.current.timeLeft = t;
          // Resume directly skips instructions
          setPhase("exam");
          setTimeout(() => document.documentElement.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {}), 300);
        } else {
          const t = examData.duration * 60;
          setTimeLeft(t);
          stateRef.current.timeLeft = t;
          // Show instructions first
          setPhase("instructions");
        }
      } catch (err) {
        console.error(err);
        setBlockMsg("Failed to load quiz. Please check your connection.");
        setPhase("blocked");
      }
    };
    init();
    // eslint-disable-next-line
  }, [examId]);

  const handleStartAfterInstructions = () => {
    setPhase("exam");
    setTimeout(() => document.documentElement.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {}), 300);
  };

  const handleOptionChange = (qId, option) => {
    const newAnswers = { ...answers, [qId]: option };
    setAnswers(newAnswers);
    stateRef.current.answers = newAnswers;
    doAutoSave(newAnswers, stateRef.current.markedForReview, stateRef.current.timeLeft);
  };

  const toggleMark = (qId) => {
    setMarkedForReview(prev => {
      const next = prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId];
      stateRef.current.markedForReview = next;
      return next;
    });
  };

  /* Redirect after result */
  useEffect(() => {
    if (phase === "result") {
      const t = setTimeout(() => navigate("/student"), 15000);
      return () => clearTimeout(t);
    }
  }, [phase, navigate]);

  /* ══════ RENDER: LOADING ══════ */
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
          <p className="text-white font-semibold">Loading Quiz...</p>
          <p className="text-slate-400 text-sm mt-1">Please wait</p>
        </div>
      </div>
    );
  }

  /* ══════ RENDER: BLOCKED ══════ */
  if (phase === "blocked") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Access Denied</h2>
          <p className="text-slate-500 mb-6">{blockMsg}</p>
          <button onClick={() => navigate("/student")} className="btn-primary px-8">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  /* ══════ RENDER: INSTRUCTIONS ══════ */
  if (phase === "instructions") {
    return <InstructionScreen exam={exam} questions={questions} assignedSet={assignedSet} onStart={handleStartAfterInstructions}/>;
  }

  /* ══════ RENDER: RESULT ══════ */
  if (phase === "result") {
    const r = resultData;
    const pct = r?.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
    const pass = pct >= 40;
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-brand-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center slide-in">
          <div className="text-6xl mb-4">{pass ? "🏆" : "📝"}</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">{r?.score !== null && r?.score !== undefined ? (pass ? "Well Done!" : "Quiz Submitted") : "Submitted!"}</h2>
          {r?.score !== null && r?.score !== undefined ? (
            <>
              <p className="text-slate-400 mb-6">Your result</p>
              <div className="bg-slate-50 rounded-2xl p-6 mb-6">
                <div className="text-5xl font-bold text-slate-800 mb-1">{r.score}<span className="text-2xl text-slate-400">/{r.total}</span></div>
                <div className="w-full bg-slate-200 rounded-full h-3 my-4">
                  <div className={`h-3 rounded-full ${pass?"bg-emerald-500":"bg-red-400"}`} style={{width:`${pct}%`}}/>
                </div>
                <p className={`text-3xl font-bold ${pass?"text-emerald-600":"text-red-500"}`}>{pct}%</p>
                <p className={`text-sm font-semibold mt-1 ${pass?"text-emerald-500":"text-red-400"}`}>{pass?"✅ Pass":"❌ Fail"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-left mb-6">
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-slate-400 text-xs">Set Assigned</p><p className="font-bold capitalize">{r.assignedSet}</p></div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-slate-400 text-xs">Violations</p><p className={`font-bold ${r.violationCount>0?"text-red-500":"text-emerald-600"}`}>{r.violationCount}</p></div>
              </div>
            </>
          ) : (
            <p className="text-slate-500 mb-8">Quiz submitted successfully. Your teacher will announce the results.</p>
          )}
          <p className="text-xs text-slate-300 mb-4">Redirecting to dashboard in 15 seconds...</p>
          <button onClick={() => navigate("/student")} className="btn-primary w-full py-3">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  /* ══════ RENDER: EXAM ══════ */
  const q = questions[currentQ];
  const timerCritical = timeLeft <= 300;
  const timerDanger = timeLeft <= 60;

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden select-none">
      {/* Violation Warning Toast */}
      {showViolationWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] slide-in">
          <div className="bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-semibold max-w-md text-center">{violationMsg}</div>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900 text-white px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 shadow-xl">
        <div className="flex flex-col min-w-0">
          <h1 className="font-bold text-sm sm:text-base truncate">{exam?.subject}</h1>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-mono">{user.rollNo}</span>
            <span>·</span>
            <span className="capitalize">Set: {assignedSet === "all" ? "All" : assignedSet === "even" ? "A (Even)" : "B (Odd)"}</span>
            {!isFullscreen && (
              <button onClick={() => document.documentElement.requestFullscreen?.().then(()=>setIsFullscreen(true)).catch(()=>{})} className="text-amber-400 hover:text-amber-300 font-semibold ml-2">⛶ Fullscreen</button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {saving && <span className="text-xs text-slate-400 hidden sm:block">💾 Saving...</span>}
          {violationCount > 0 && <span className="badge bg-red-600 text-white">⚠️ {violationCount}</span>}
          <div className={`font-mono text-lg sm:text-2xl font-bold px-4 py-1.5 rounded-xl transition-colors ${timerDanger?"bg-red-600 text-white animate-pulse":timerCritical?"bg-amber-500 text-white":"bg-slate-700 text-white"}`}>
            ⏱ {fmt(timeLeft)}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Question */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {q ? (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <span className="badge bg-brand-100 text-brand-700 shrink-0">Q {currentQ+1} / {questions.length}</span>
                  <button onClick={() => toggleMark(q._id)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${markedForReview.includes(q._id)?"bg-violet-100 border-violet-300 text-violet-700":"bg-slate-50 border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600"}`}>
                    {markedForReview.includes(q._id) ? "🔖 Marked" : "🔖 Mark for Review"}
                  </button>
                </div>
                <p className="text-slate-800 font-semibold text-base sm:text-lg leading-relaxed mb-6">{q.question}</p>
                <div className="space-y-3">
                  {q.options.map((opt, i) => {
                    const selected = answers[q._id] === opt;
                    const labels = ["A","B","C","D"];
                    return (
                      <label key={i} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${selected?"border-brand-500 bg-brand-50":"border-slate-200 hover:border-brand-300 hover:bg-slate-50"}`}>
                        <input type="radio" name={q._id} checked={selected} onChange={() => handleOptionChange(q._id, opt)} className="hidden"/>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${selected?"bg-brand-600 text-white":"bg-slate-100 text-slate-500"}`}>{labels[i]}</div>
                        <span className={`text-sm font-medium ${selected?"text-brand-800":"text-slate-700"}`}>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Nav */}
              <div className="flex items-center justify-between gap-3">
                <button disabled={currentQ===0} onClick={()=>setCurrentQ(p=>p-1)} className="btn-secondary px-6 disabled:opacity-40 disabled:cursor-not-allowed">← Previous</button>
                <button onClick={()=>setPaletteOpen(true)} className="sm:hidden btn-secondary px-4">🗃️ {Object.keys(answers).length}/{questions.length}</button>
                {currentQ < questions.length-1
                  ? <button onClick={()=>setCurrentQ(p=>p+1)} className="btn-primary px-6">Next →</button>
                  : <button onClick={()=>handleSubmit(false)} className="btn-danger px-6">Submit Quiz</button>
                }
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-400">
                <p className="text-5xl mb-3">📭</p>
                <p className="font-medium">No questions found for your set.</p>
                <button onClick={()=>navigate("/student")} className="btn-primary mt-4">Back to Dashboard</button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Palette */}
        <div className="hidden sm:flex w-64 bg-white border-l border-slate-200 flex-col shrink-0">
          <QuestionPalette questions={questions} answers={answers} markedForReview={markedForReview} current={currentQ} onJump={setCurrentQ} onSubmit={()=>handleSubmit(false)}/>
        </div>
      </div>

      {/* Mobile Palette Drawer */}
      {paletteOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setPaletteOpen(false)}/>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] flex flex-col slide-in">
            <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-slate-100">
              <p className="font-bold text-slate-800">Question Palette</p>
              <button onClick={()=>setPaletteOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>
            <div className="flex-1 overflow-hidden">
              <QuestionPalette questions={questions} answers={answers} markedForReview={markedForReview} current={currentQ}
                onJump={i=>{setCurrentQ(i);setPaletteOpen(false);}}
                onSubmit={()=>{setPaletteOpen(false);handleSubmit(false);}}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttemptQuiz;
