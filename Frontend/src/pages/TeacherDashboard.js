import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { API, authFetch } from "../utils/api";
import { useSocket } from "../context/SocketContext";
import EditQuestions from "./EditQuestions";

const SECTIONS = [
  "4CS-DS-A-G1","4CS-DS-A-G2","4CS-DS-B-G1","4CS-DS-B-G2",
  "4CS-AI-A-G1","4CS-AI-A-G2","4CS-AI-B-G1","4CS-AI-B-G2",
];

function toLocalISO(val) {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
const fmtDateTime = (value) => {
  if (!value) return "";

  const d = new Date(value);

  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
};

function Toggle({ value, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div className={`relative w-11 h-6 rounded-full transition-colors ${value?"bg-brand-600":"bg-slate-300"}`} onClick={() => onChange(!value)}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${value?"left-6":"left-1"}`} />
      </div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </label>
  );
}

/* ── Publish Confirmation Modal ── */
function PublishModal({ exam, warning, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md slide-in p-8 text-center">
        <div className="text-5xl mb-4">{warning ? "⚠️" : "🚀"}</div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">
          {warning ? "Publish with Warning?" : "Confirm Publish"}
        </h2>

        {warning && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-left">
            <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Start time has passed</p>
            <p className="text-sm text-amber-700">{warning}</p>
            <p className="text-xs text-amber-600 mt-2">Students will be able to start the quiz immediately.</p>
          </div>
        )}

        {!warning && exam.startTime && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4 text-left">
            <p className="text-sm font-semibold text-emerald-800">✅ Timing is valid</p>
            <p className="text-sm text-emerald-700 mt-1">
              Starts: <strong>{fmtDateTime(exam.startTime)}</strong>
              {exam.endTime && <> &nbsp;·&nbsp; Ends: <strong>{fmtDateTime(exam.endTime)}</strong></>}
            </p>
          </div>
        )}

        {!exam.startTime && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4 text-left">
            <p className="text-sm text-blue-800">No start time set — quiz will be live immediately after publishing.</p>
          </div>
        )}

        <p className="text-sm text-slate-500 mb-6">
          <strong>{exam.subject}</strong> will become visible to students in Section <strong>{exam.section}</strong>.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 btn-secondary py-3">Cancel</button>
          <button onClick={onConfirm} className="flex-1 btn-primary py-3">Publish Now</button>
        </div>
      </div>
    </div>
  );
}

/* ── Exam Card ── */
function ExamCard({ exam, results, onPublish, onUnpublish, onDelete, onEdit, onEditQuestions }) {
  const now = new Date();
  const isLive     = exam.published && (!exam.startTime || new Date(exam.startTime) <= now) && (!exam.endTime || new Date(exam.endTime) > now);
  const isUpcoming = exam.published && exam.startTime && new Date(exam.startTime) > now;
  const isEnded    = exam.endTime && new Date(exam.endTime) < now;
  const endPast    = !exam.published && exam.endTime && new Date(exam.endTime) <= now;
  const attempts   = results.filter(r => String(r.examId?._id || r.examId) === String(exam._id) && r.status === "submitted").length;

  return (
    <div className={`rounded-2xl border-2 p-5 transition-all hover:shadow-md ${
      !exam.published ? "border-dashed border-slate-300 bg-slate-50" :
      isEnded  ? "border-red-100 bg-red-50/30" :
      isLive   ? "border-emerald-200 bg-emerald-50/20" :
                 "border-amber-100 bg-amber-50/20"
    }`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-800 text-sm leading-tight truncate">{exam.subject}</h3>
          {exam.courseCode && <p className="text-xs font-mono text-slate-400 mt-0.5">{exam.courseCode}</p>}
        </div>
        {!exam.published
          ? <span className="badge bg-slate-200 text-slate-500 shrink-0">Draft</span>
          : isEnded    ? <span className="badge bg-red-100 text-red-600 shrink-0">Ended</span>
          : isUpcoming ? <span className="badge bg-amber-100 text-amber-700 shrink-0">Upcoming</span>
          : <span className="badge bg-emerald-100 text-emerald-700 shrink-0 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-dot inline-block"/>Live
            </span>
        }
      </div>

      <p className="text-xs text-slate-500 mb-1">Section: <span className="font-semibold">{exam.section}</span></p>
      <p className="text-xs text-slate-400 mb-1">⏱ {exam.duration} min · +{exam.positiveMarks} / −{exam.negativeMarks}</p>
      {exam.startTime && <p className="text-xs text-amber-600">🕐 Start: {fmtDateTime(exam.startTime)}</p>}
      {exam.endTime   && <p className={`text-xs mt-0.5 ${endPast || isEnded ? "text-red-500 font-semibold" : "text-red-400"}`}>🏁 End: {fmtDateTime(exam.endTime)}</p>}

      {endPast && (
        <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-xs text-red-700 font-semibold">⛔ End time passed — update before publishing</p>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
        {exam.showResult    && <span className="badge bg-blue-100 text-blue-700 text-xs">Results Visible</span>}
        {exam.showQuestions && <span className="badge bg-violet-100 text-violet-700 text-xs">Review On</span>}
        {exam.hasSets       && <span className="badge bg-orange-100 text-orange-700 text-xs">🔀 Sets</span>}
        {attempts > 0       && <span className="badge bg-slate-100 text-slate-600 text-xs">👥 {attempts}</span>}
      </div>

      <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100/80">
        {!exam.published ? (
          <button onClick={() => onPublish(exam)} className="flex-1 min-w-0 text-xs font-semibold py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95">
            🚀 Publish
          </button>
        ) : (
          <button onClick={() => onUnpublish(exam._id)} className="flex-1 min-w-0 text-xs font-semibold py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-700 transition-all active:scale-95">
            📥 Unpublish
          </button>
        )}
        <button onClick={() => onEditQuestions(exam)} className="flex-1 min-w-0 text-xs font-semibold py-2 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 transition-all active:scale-95">
          ❓ Questions
        </button>
        <button onClick={() => onEdit(exam)} className="text-xs font-semibold py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all" title="Edit">⚙️</button>
        <button onClick={() => onDelete(exam._id)} className="text-xs font-semibold py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-all" title="Delete">🗑️</button>
      </div>
    </div>
  );
}

/* ── Edit Exam Modal ── */
function EditExamModal({ exam, onSave, onClose }) {
  const [form, setForm] = useState({
    subject:       exam.subject,
    courseCode:    exam.courseCode || "",
    duration:      exam.duration,
    section:       exam.section,
    positiveMarks: exam.positiveMarks,
    negativeMarks: exam.negativeMarks,
    showResult:    exam.showResult,
    showQuestions: exam.showQuestions || false,
    startTime:     exam.startTime ? toLocalISO(exam.startTime) : "",
    endTime:       exam.endTime   ? toLocalISO(exam.endTime)   : "",
  });
  const [saving, setSaving] = useState(false);
  const f = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));
  const now = new Date();
  const endInPast   = form.endTime   && new Date(form.endTime)   <= now;
  const startInPast = form.startTime && new Date(form.startTime) <= now;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto slide-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-3xl z-10">
          <h2 className="font-bold text-slate-800">Edit Quiz Settings</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className="label">Quiz Name</label><input className="input" value={form.subject} onChange={f("subject")}/></div>
          <div><label className="label">Course Code</label><input className="input" value={form.courseCode} onChange={f("courseCode")}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Duration (min)</label><input className="input" type="number" value={form.duration} onChange={f("duration")}/></div>
            <div><label className="label">Section</label>
              <select className="input" value={form.section} onChange={f("section")}>{SECTIONS.map(s=><option key={s} value={s}>{s}</option>)}</select>
            </div>
            <div><label className="label">Positive Marks</label><input className="input" type="number" step="0.25" value={form.positiveMarks} onChange={f("positiveMarks")}/></div>
            <div><label className="label">Negative Marks</label><input className="input" type="number" step="0.25" value={form.negativeMarks} onChange={f("negativeMarks")}/></div>
          </div>
          <div>
            <label className="label">Start Time</label>
            <input className={`input ${startInPast?"border-amber-300 bg-amber-50/30":""}`} type="datetime-local" value={form.startTime} onChange={f("startTime")}/>
            {startInPast && <p className="text-xs text-amber-600 mt-1">⚠️ Past time — quiz will be live immediately on publish.</p>}
          </div>
          <div>
            <label className="label">End Time</label>
            <input className={`input ${endInPast?"border-red-300 bg-red-50":""}`} type="datetime-local" value={form.endTime} onChange={f("endTime")}/>
            {endInPast && <p className="text-xs text-red-600 mt-1">⛔ End time has passed — publishing will be blocked.</p>}
          </div>
          <div className="space-y-3 pt-1">
            <Toggle value={form.showResult}    onChange={v=>setForm(p=>({...p,showResult:v}))}    label="Show score to students after submission"/>
            <Toggle value={form.showQuestions} onChange={v=>setForm(p=>({...p,showQuestions:v}))} label="Allow students to review questions & answers"/>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={async()=>{setSaving(true);await onSave(exam._id,form);setSaving(false);}} disabled={saving||endInPast} className="btn-primary flex-1 py-3 disabled:opacity-60">
              {saving?"Saving...":endInPast?"Fix End Time First":"Save Changes"}
            </button>
            <button onClick={onClose} className="btn-secondary px-6">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════
   MAIN DASHBOARD
══════════════════════════════ */
function TeacherDashboard() {
  const [user, setUser]       = useState(null);
  const [exams, setExams]     = useState([]);
  const [results, setResults] = useState([]);
  const [activeTab, setActiveTab] = useState("exams");
  const [toast, setToast]     = useState(null);

  const [editQExam, setEditQExam]         = useState(null);
  const [editExam, setEditExam]           = useState(null);
  const [publishConfirm, setPublishConfirm] = useState(null);

  const emptyForm = { subject:"",courseCode:"",duration:"",section:"",posMarks:1,negMarks:0,showResult:true,showQuestions:false,startTime:"",endTime:"" };
  const [form, setForm]       = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  const [selExam, setSelExam] = useState("");
  const [qText, setQText]     = useState("");
  const [qOpts, setQOpts]     = useState(["","","",""]);
  const [qAns, setQAns]       = useState("");
  const [qSet, setQSet]       = useState("all");
  const [recentQs, setRecentQs] = useState([]);

  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [excelDone, setExcelDone]   = useState(null);

  const [analyticsExam, setAnalyticsExam]       = useState("");
  const [analytics, setAnalytics]               = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [violations, setViolations] = useState([]);
  const [filterExam, setFilterExam] = useState("");

  const navigate = useNavigate();
  const { socket } = useSocket();

  const showToast = (msg, type="info") => { setToast({msg,type}); setTimeout(()=>setToast(null),6000); };

  const fetchData = useCallback(async () => {
    try {
      const [eRes, rRes] = await Promise.all([authFetch(`${API}/exam?role=teacher`), authFetch(`${API}/result/all`)]);
      const eD = await eRes.json(); const rD = await rRes.json();
      if (Array.isArray(eD)) setExams(eD);
      if (Array.isArray(rD)) setResults(rD);
    } catch(e){console.error(e);}
  }, []);

  useEffect(()=>{
    const u=JSON.parse(localStorage.getItem("user")), role=localStorage.getItem("role");
    if(!u||role!=="teacher"){navigate("/");return;}
    setUser(u); fetchData();
  },[navigate,fetchData]);

  useEffect(()=>{
    if(!socket||!user)return;
    socket.emit("join_teacher_room",user.id);
    // student_submitted: backend sends full enriched result — update state directly, NO refetch needed
    socket.on("student_submitted", (enrichedResult) => {
      if (enrichedResult && enrichedResult._id) {
        setResults(prev => {
          const exists = prev.find(r => r._id === enrichedResult._id);
          if (exists) return prev.map(r => r._id === enrichedResult._id ? enrichedResult : r);
          return [enrichedResult, ...prev];
        });
        showToast(`✅ ${enrichedResult.studentId?.name || "A student"} submitted`, "success");
      } else {
        fetchData(); // fallback
      }
    });

    // new_result: global broadcast — same logic
    socket.on("new_result", (enrichedResult) => {
      if (enrichedResult && enrichedResult._id) {
        setResults(prev => {
          const exists = prev.find(r => r._id === enrichedResult._id);
          if (exists) return prev.map(r => r._id === enrichedResult._id ? enrichedResult : r);
          return [enrichedResult, ...prev];
        });
      }
    });

    socket.on("student_violation",data=>{setViolations(p=>[{...data,time:new Date().toLocaleTimeString()},...p].slice(0,50));});
    return()=>{socket.off("student_submitted");socket.off("new_result");socket.off("student_violation");};
  },[socket,user,fetchData]);

  const handleLogout = ()=>{localStorage.clear();navigate("/");};

  /* PUBLISH — check end time first, show modal */
  const handlePublishClick = (exam) => {
    const now = new Date();
    if (exam.endTime && new Date(exam.endTime) <= now) {
      showToast(`⛔ Cannot publish: End time (${fmtDateTime(exam.endTime)}) has already passed. Click ⚙️ to update it.`, "error");
      return;
    }
    const startPassed = exam.startTime && new Date(exam.startTime) <= now;
    setPublishConfirm({
      exam,
      warning: startPassed
        ? `Start time was ${fmtDateTime(exam.startTime)} — students can attempt this quiz immediately after publishing.`
        : null,
    });
  };

  const doPublish = async () => {
    const { exam } = publishConfirm;
    setPublishConfirm(null);
    try {
      const res = await authFetch(`${API}/exam/${exam._id}/publish`, { method:"PATCH" });
      const d = await res.json();
      if (!res.ok) { showToast(`⛔ ${d.message}`, "error"); return; }
      setExams(p=>p.map(e=>e._id===exam._id?d.exam:e));
      if (d.warning) showToast(`⚠️ ${d.warning}`, "warn");
      else showToast("🚀 Quiz published!", "success");
    } catch { showToast("Failed to publish","error"); }
  };

  const handleUnpublish = async (id) => {
    const res=await authFetch(`${API}/exam/${id}/unpublish`,{method:"PATCH"});
    const d=await res.json();
    if(d.success){setExams(p=>p.map(e=>e._id===id?d.exam:e));showToast("📥 Unpublished","info");}
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Delete quiz and all questions? Cannot be undone."))return;
    const res=await authFetch(`${API}/exam/${id}`,{method:"DELETE"});
    const d=await res.json();
    if(d.success){setExams(p=>p.filter(e=>e._id!==id));showToast("Deleted","info");}
  };

  const handleEditSave = async (id, body) => {
    const res=await authFetch(`${API}/exam/${id}`,{method:"PUT",body:JSON.stringify(body)});
    const d=await res.json();
    if(d.success){setExams(p=>p.map(e=>e._id===id?d.exam:e));setEditExam(null);showToast("✅ Updated!","success");}
  };

const handleCreate = async () => {
  if (!form.subject || !form.duration || !form.section) {
    showToast("Fill required fields", "warn");
    return;
  }

  if (form.endTime && new Date(form.endTime) <= new Date()) {
    showToast("⛔ End time already passed. Set a future time.", "error");
    return;
  }

  setCreating(true);

  try {
    const res = await authFetch(`${API}/exam/create`, {
      method: "POST",
      body: JSON.stringify({
        subject: form.subject,
        courseCode: form.courseCode,
        duration: Number(form.duration),
        section: form.section,
        teacherId: user.id,
        positiveMarks: form.posMarks,
        negativeMarks: form.negMarks,
        showResult: form.showResult,
        showQuestions: form.showQuestions,

        // FIXED TIME
        startTime: form.startTime ? form.startTime + ":00" : null,
        endTime: form.endTime ? form.endTime + ":00" : null
      })
    });

    const d = await res.json();

    if (d.success) {
      setExams((p) => [d.exam, ...p]);
      setForm(emptyForm);
      showToast("✅ Draft created! Add questions then publish.", "success");
      setActiveTab("exams");
    } else {
      showToast("Failed", "error");
    }

  } catch {
    showToast("Failed", "error");
  }

  setCreating(false);
};

  const handleAddQ = async () => {
    if(!selExam||!qText.trim()||qOpts.some(o=>!o.trim())||!qAns){showToast("Fill all fields","warn");return;}
    try{
      const res=await authFetch(`${API}/question/add`,{method:"POST",body:JSON.stringify({examId:selExam,question:qText,options:qOpts,correctAnswer:qAns,setType:qSet})});
      const d=await res.json();
      if(d.success){setRecentQs(p=>[...p,d.question]);setQText("");setQOpts(["","","",""]);setQAns("");setQSet("all");showToast("✅ Added!","success");}
    }catch{showToast("Failed","error");}
  };

  const handleExcel = async () => {
    if(!uploadFile){showToast("Select a file","warn");return;}
    setUploading(true);
    try{
      const fd=new FormData();fd.append("file",uploadFile);
      const res=await fetch(`${API}/exam/upload-excel`,{method:"POST",headers:{Authorization:`Bearer ${localStorage.getItem("token")}`},body:fd});
      const d=await res.json();
      if(d.success){setExams(p=>[d.exam,...p]);setUploadFile(null);document.getElementById("excel-input").value="";setExcelDone(d.exam);showToast(`✅ "${d.exam.subject}" uploaded (${d.questionCount} questions). Review then publish.`,"success");}
      else{showToast(d.message||"Upload failed","error");}
    }catch{showToast("Upload failed","error");}
    setUploading(false);
  };

  const fetchAnalytics = async ()=>{
    if(!analyticsExam)return;setAnalyticsLoading(true);
    try{const res=await authFetch(`${API}/result/analytics/${analyticsExam}`);setAnalytics(await res.json());}
    catch{showToast("Failed","error");}setAnalyticsLoading(false);
  };

  if(!user) return null;

  const tabs=[{id:"exams",label:"My Quizzes",icon:"📋"},{id:"create",label:"Create Quiz",icon:"➕"},{id:"excel",label:"Excel Upload",icon:"📊"},{id:"questions",label:"Add Questions",icon:"❓"},{id:"results",label:"Results",icon:"🎓"},{id:"analytics",label:"Analytics",icon:"📈"}];
  const submittedResults = results.filter(r=>r.status==="submitted");
  const filteredResults  = filterExam ? submittedResults.filter(r=>String(r.examId?._id||r.examId)===filterExam) : submittedResults;
  const draftExams       = exams.filter(e=>!e.published);
  const publishedExams   = exams.filter(e=>e.published);

  return (
    <div className="min-h-screen bg-slate-50">
      {toast&&(
        <div className={`fixed top-4 right-4 z-[70] slide-in px-5 py-3 rounded-2xl shadow-lg text-sm font-medium border max-w-sm ${toast.type==="success"?"bg-emerald-50 border-emerald-200 text-emerald-800":toast.type==="warn"?"bg-amber-50 border-amber-200 text-amber-800":toast.type==="error"?"bg-red-50 border-red-200 text-red-800":"bg-blue-50 border-blue-200 text-blue-800"}`}>{toast.msg}</div>
      )}

      {publishConfirm&&<PublishModal exam={publishConfirm.exam} warning={publishConfirm.warning} onConfirm={doPublish} onCancel={()=>setPublishConfirm(null)}/>}
      {editQExam&&<EditQuestions exam={editQExam} onClose={()=>setEditQExam(null)} showToast={showToast}/>}
      {editExam&&<EditExamModal exam={editExam} onSave={handleEditSave} onClose={()=>setEditExam(null)}/>}

      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-3">
          <span className="text-xl font-bold text-brand-600">📘 Quiz Portal</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:block">👋 {user.name}</span>
            <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-red-200 transition-all">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Profile */}
        <div className="card p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-2xl font-bold shrink-0 shadow-lg">{user.name?.charAt(0).toUpperCase()}</div>
            <div>
              <p className="font-bold text-slate-800 text-lg">{user.name}</p>
              <p className="text-sm text-slate-400">{user.department} · {user.designation}</p>
              <span className="badge bg-brand-100 text-brand-700 mt-1 inline-block">Teacher</span>
            </div>
            <div className="ml-auto hidden sm:flex gap-6 text-center">
              <div><div className="text-2xl font-bold text-slate-800">{draftExams.length}</div><div className="text-xs text-slate-400">Drafts</div></div>
              <div><div className="text-2xl font-bold text-slate-800">{publishedExams.length}</div><div className="text-xs text-slate-400">Published</div></div>
              <div><div className="text-2xl font-bold text-slate-800">{submittedResults.length}</div><div className="text-xs text-slate-400">Attempts</div></div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1.5 flex-wrap shadow-sm">
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab===t.id?"bg-brand-600 text-white shadow":"text-slate-500 hover:text-slate-800 hover:bg-slate-100"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* MY QUIZZES */}
        {activeTab==="exams"&&(
          <div className="space-y-6">
            {draftExams.length>0&&(
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">📝 Drafts</h3>
                  <span className="badge bg-slate-200 text-slate-500">{draftExams.length}</span>
                  <p className="text-xs text-slate-400 ml-1">— Add questions, then publish</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {draftExams.map(e=><ExamCard key={e._id} exam={e} results={results} onPublish={handlePublishClick} onUnpublish={handleUnpublish} onDelete={handleDelete} onEdit={setEditExam} onEditQuestions={setEditQExam}/>)}
                </div>
              </div>
            )}
            {publishedExams.length>0&&(
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">🚀 Published</h3>
                  <span className="badge bg-emerald-100 text-emerald-700">{publishedExams.length}</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {publishedExams.map(e=><ExamCard key={e._id} exam={e} results={results} onPublish={handlePublishClick} onUnpublish={handleUnpublish} onDelete={handleDelete} onEdit={setEditExam} onEditQuestions={setEditQExam}/>)}
                </div>
              </div>
            )}
            {exams.length===0&&(
              <div className="card p-16 flex flex-col items-center justify-center text-center">
                <span className="text-6xl mb-4">📭</span>
                <p className="font-semibold text-slate-600 text-lg">No quizzes yet</p>
                <button onClick={()=>setActiveTab("create")} className="btn-primary mt-5">+ Create Quiz</button>
              </div>
            )}
          </div>
        )}

        {/* CREATE QUIZ */}
        {activeTab==="create"&&(
          <div className="card p-6 max-w-2xl">
            <p className="label mb-1">Create New Quiz (Draft)</p>
            <p className="text-sm text-slate-400 mb-5">Saved as draft — add questions then publish when ready.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><label className="label">Quiz Name *</label><input className="input" value={form.subject} onChange={e=>setForm(p=>({...p,subject:e.target.value}))} placeholder="e.g. Data Structures"/></div>
              <div><label className="label">Course Code</label><input className="input" value={form.courseCode} onChange={e=>setForm(p=>({...p,courseCode:e.target.value}))} placeholder="CS401"/></div>
              <div><label className="label">Duration (min) *</label><input className="input" type="number" value={form.duration} onChange={e=>setForm(p=>({...p,duration:e.target.value}))} placeholder="60"/></div>
              <div className="sm:col-span-2">
                <label className="label">Section *</label>
                <select className="input" value={form.section} onChange={e=>setForm(p=>({...p,section:e.target.value}))}>
                  <option value="">Select Section</option>{SECTIONS.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="label">Positive Marks</label><input className="input" type="number" step="0.25" value={form.posMarks} onChange={e=>setForm(p=>({...p,posMarks:Number(e.target.value)}))}/></div>
              <div><label className="label">Negative Marks</label><input className="input" type="number" step="0.25" value={form.negMarks} onChange={e=>setForm(p=>({...p,negMarks:Number(e.target.value)}))}/></div>
              <div>
                <label className="label">Start Time</label>
                <input className={`input ${form.startTime&&new Date(form.startTime)<=new Date()?"border-amber-300":""}`} type="datetime-local" value={form.startTime} onChange={e=>setForm(p=>({...p,startTime:e.target.value}))}/>
                {form.startTime&&new Date(form.startTime)<=new Date()&&<p className="text-xs text-amber-600 mt-1">⚠️ Past — quiz will be live immediately.</p>}
              </div>
              <div>
                <label className="label">End Time</label>
                <input className={`input ${form.endTime&&new Date(form.endTime)<=new Date()?"border-red-300 bg-red-50":""}`} type="datetime-local" value={form.endTime} onChange={e=>setForm(p=>({...p,endTime:e.target.value}))}/>
                {form.endTime&&new Date(form.endTime)<=new Date()&&<p className="text-xs text-red-600 mt-1">⛔ End time passed — publishing will be blocked.</p>}
              </div>
              <div className="sm:col-span-2 space-y-3 pt-1">
                <Toggle value={form.showResult}    onChange={v=>setForm(p=>({...p,showResult:v}))}    label="Show score to students after submission"/>
                <Toggle value={form.showQuestions} onChange={v=>setForm(p=>({...p,showQuestions:v}))} label="Allow students to review questions & answers"/>
              </div>
            </div>
            <button onClick={handleCreate} disabled={creating} className="btn-primary w-full mt-6 py-3 disabled:opacity-60">{creating?"Creating...":"Save as Draft →"}</button>
          </div>
        )}

        {/* EXCEL UPLOAD */}
        {activeTab==="excel"&&(
          <div className="space-y-5 max-w-3xl">
            <div className="card p-6">
              <p className="label mb-1">Upload Quiz via Excel</p>
              <p className="text-sm text-slate-400 mb-3">Uploaded as draft — review questions before publishing.</p>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-5">
                <p className="text-xs font-bold text-blue-800 mb-2">📋 Sheet 1 columns required:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-blue-700 font-mono">
                  <span>QuizName</span><span>CourseCode</span>
                  <span>Duration</span><span>Section</span>
                  <span>PositiveMarks</span><span>NegativeMarks</span>
                  <span>ShowResult <span className="text-blue-500">(true/false)</span></span><span></span>
                  <span>StartTime <span className="text-blue-500">(YYYY-MM-DD HH:MM)</span></span>
                  <span className="font-bold text-blue-900">StartAMPM <span className="font-normal text-blue-600">(AM or PM)</span></span>
                  <span>EndTime</span>
                  <span className="font-bold text-blue-900">EndAMPM <span className="font-normal text-blue-600">(AM or PM)</span></span>
                </div>
                <p className="text-xs text-blue-600 mt-2">💡 StartAMPM / EndAMPM let you write <strong>6:00</strong> in StartTime and <strong>PM</strong> in StartAMPM for 6:00 PM.</p>
              </div>
              <a href={`${API}/exam/excel-template`} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 px-4 py-2.5 rounded-xl border border-brand-200 transition-all mb-5">⬇️ Download Template</a>
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-brand-300 transition-colors mb-4">
                <input id="excel-input" type="file" accept=".xlsx,.xls" className="hidden" onChange={e=>{setUploadFile(e.target.files[0]);setExcelDone(null);}}/>
                <label htmlFor="excel-input" className="cursor-pointer">
                  <div className="text-5xl mb-3">📊</div>
                  {uploadFile?<p className="text-sm font-semibold text-brand-600">{uploadFile.name}</p>:<><p className="text-sm font-medium text-slate-600">Click to select Excel file</p><p className="text-xs text-slate-400 mt-1">.xlsx or .xls</p></>}
                </label>
              </div>
              <button onClick={handleExcel} disabled={!uploadFile||uploading} className="btn-primary w-full disabled:opacity-60">{uploading?"Parsing & Uploading...":"Upload Excel"}</button>
            </div>
            {excelDone&&(
              <div className="card p-6 border-2 border-brand-200 bg-brand-50/30 slide-in">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-bold text-brand-800">✅ "{excelDone.subject}" uploaded!</p>
                    <p className="text-sm text-brand-600 mt-1">Review questions before publishing.</p>
                    {excelDone.startTime&&<p className="text-xs text-slate-500 mt-1">Start: {fmtDateTime(excelDone.startTime)} · End: {fmtDateTime(excelDone.endTime)}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={()=>setEditQExam(excelDone)} className="btn-primary text-sm px-4 py-2">❓ Edit Questions</button>
                    <button onClick={()=>handlePublishClick(excelDone)} className="text-sm font-semibold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all">🚀 Publish</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ADD QUESTIONS */}
        {activeTab==="questions"&&(
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <div className="card p-6">
              <p className="label mb-5">Add Question</p>
              <div className="space-y-4">
                <div><label className="label">Select Quiz</label>
                  <select className="input" value={selExam} onChange={e=>{setSelExam(e.target.value);setRecentQs([]);}}>
                    <option value="">Choose quiz</option>
                    {exams.map(e=><option key={e._id} value={e._id}>{e.subject} — {e.section}{!e.published?" (draft)":""}</option>)}
                  </select>
                </div>
                <div><label className="label">Assign To</label>
                  <select className="input" value={qSet} onChange={e=>setQSet(e.target.value)}>
                    <option value="all">All Students</option>
                    <option value="even">Set A — Even Roll Numbers</option>
                    <option value="odd">Set B — Odd Roll Numbers</option>
                  </select>
                </div>
                <div><label className="label">Question</label><textarea className="input resize-none h-20" value={qText} onChange={e=>setQText(e.target.value)} placeholder="Type question..."/></div>
                <div><label className="label">Options</label>
                  <div className="space-y-2">
                    {qOpts.map((opt,i)=>(
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center shrink-0">{["A","B","C","D"][i]}</span>
                        <input className="input" value={opt} onChange={e=>{const o=[...qOpts];o[i]=e.target.value;setQOpts(o);}} placeholder={`Option ${["A","B","C","D"][i]}`}/>
                      </div>
                    ))}
                  </div>
                </div>
                <div><label className="label">Correct Answer</label>
                  <select className="input" value={qAns} onChange={e=>setQAns(e.target.value)}>
                    <option value="">Select</option>
                    {qOpts.filter(Boolean).map((opt,i)=><option key={i} value={opt}>{["A","B","C","D"][i]}. {opt}</option>)}
                  </select>
                </div>
                <button onClick={handleAddQ} disabled={!selExam} className="btn-primary w-full disabled:opacity-50">+ Add Question</button>
              </div>
            </div>
            <div className="card p-6">
              <p className="label mb-4">Recently Added {recentQs.length>0&&`(${recentQs.length})`}</p>
              {recentQs.length===0&&<div className="flex flex-col items-center py-12 text-slate-400 text-center"><span className="text-4xl mb-2">📋</span><p className="text-sm">Added questions appear here</p></div>}
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {recentQs.map((q,i)=>(
                  <div key={q._id} className="border border-slate-200 rounded-xl p-3">
                    <p className="text-sm font-semibold text-slate-800 mb-2"><span className="text-brand-500 mr-1">Q{i+1}.</span>{q.question}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {q.options.map((opt,oi)=>(
                        <div key={oi} className={`text-xs px-2.5 py-1.5 rounded-lg ${opt===q.correctAnswer?"bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200":"bg-slate-50 text-slate-500 border border-slate-100"}`}>
                          {["A","B","C","D"][oi]}. {opt}{opt===q.correctAnswer&&" ✓"}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {selExam&&<button onClick={()=>setEditQExam(exams.find(e=>e._id===selExam))} className="w-full mt-4 text-xs font-semibold text-brand-600 py-2 border border-dashed border-brand-200 rounded-xl hover:bg-brand-50 transition-all">View & Edit All Questions →</button>}
            </div>
          </div>
        )}

        {/* RESULTS */}
        {activeTab==="results"&&(
          <div className="space-y-5">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <p className="label">Student Results ({filteredResults.length})</p>
                <select className="input max-w-xs text-sm" value={filterExam} onChange={e=>setFilterExam(e.target.value)}>
                  <option value="">All Quizzes</option>
                  {exams.map(e=><option key={e._id} value={e._id}>{e.subject}</option>)}
                </select>
              </div>
              {filteredResults.length>0?(
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {["Student","Roll No","Quiz","Set","Score","Violations"].map(h=>(
                          <th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider ${h==="Score"||h==="Violations"?"text-right":"text-left"}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResults.map((r,i)=>{
                        const pct = r.total>0 ? Math.round((r.score/r.total)*100) : 0;
                        const pass = pct>=40;
                        const liveV = violations.filter(v=>String(v.studentId)===String(r.studentId?._id||r.studentId)).length;
                        const totalV = (r.violationCount||0)+liveV;
                        const sName = r.studentId?.name  || (typeof r.studentId==="string" ? `ID:${r.studentId.slice(-6)}` : "—");
                        const sRoll = r.studentId?.rollNo || "—";
                        const eName = r.examId?.subject   || "—";
                        return(
                          <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-slate-800">{sName}</td>
                            <td className="px-4 py-3 text-slate-400 font-mono text-xs">{sRoll}</td>
                            <td className="px-4 py-3 text-slate-500 text-xs">{eName}</td>
                            <td className="px-4 py-3">
                              <span className={`badge ${r.assignedSet==="even"?"bg-blue-100 text-blue-700":r.assignedSet==="odd"?"bg-violet-100 text-violet-700":"bg-slate-100 text-slate-600"}`}>
                                {r.assignedSet==="all"?"All":r.assignedSet==="even"?"Set A":"Set B"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right"><span className={`badge ${pass?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-600"}`}>{r.score}/{r.total} ({pct}%)</span></td>
                            <td className="px-4 py-3 text-right">{totalV>0?<span className="badge bg-red-100 text-red-600">⚠️ {totalV}</span>:<span className="text-slate-300 text-xs">—</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ):(
                <div className="flex flex-col items-center justify-center py-16 text-center"><span className="text-5xl mb-3">🎓</span><p className="font-semibold text-slate-600">No submissions yet</p></div>
              )}
            </div>
            {violations.length>0&&(
              <div className="card p-6">
                <p className="label mb-4">⚠️ Live Violations ({violations.length})</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {violations.map((v,i)=>(<div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-50 border border-red-100 text-sm"><span>🚨</span><div className="flex-1 min-w-0"><span className="font-semibold text-red-700">{v.violationType?.replace(/_/g," ").toUpperCase()}</span><span className="text-red-400 ml-2 text-xs">ID:{String(v.studentId||"").slice(-6)}</span></div><span className="text-xs text-red-300 shrink-0">{v.time}</span></div>))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS */}
        {activeTab==="analytics"&&(
          <div className="card p-6">
            <p className="label mb-5">Quiz Analytics</p>
            <div className="flex gap-3 mb-6 flex-wrap">
              <select className="input max-w-xs" value={analyticsExam} onChange={e=>{setAnalyticsExam(e.target.value);setAnalytics(null);}}>
                <option value="">Select Quiz</option>{exams.map(e=><option key={e._id} value={e._id}>{e.subject} — {e.section}</option>)}
              </select>
              <button onClick={fetchAnalytics} disabled={!analyticsExam||analyticsLoading} className="btn-primary disabled:opacity-60">{analyticsLoading?"Loading...":"Load Analytics"}</button>
              <button onClick={()=>{if(!analyticsExam){showToast("Select a quiz","warn");return;}window.open(`${API}/result/export/${analyticsExam}?token=${localStorage.getItem("token")}`,"_blank");}} disabled={!analyticsExam} className="btn-secondary disabled:opacity-40">⬇️ Export Excel</button>
            </div>
            {analytics&&(
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[{label:"Attempts",value:analytics.total,icon:"👥"},{label:"Average",value:analytics.avg,icon:"📊"},{label:"Highest",value:analytics.highest,icon:"🏆"},{label:"Lowest",value:analytics.lowest,icon:"📉"}].map(s=>(
                    <div key={s.label} className="border border-slate-100 rounded-2xl p-4 text-center"><div className="text-3xl mb-1">{s.icon}</div><div className="text-2xl font-bold text-slate-800">{s.value}</div><div className="text-xs text-slate-400 mt-0.5">{s.label}</div></div>
                  ))}
                </div>
                {analytics.results?.length>0&&(
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-sm min-w-[400px]">
                      <thead><tr className="bg-slate-50 border-b border-slate-100">{["Student","Roll No","Set","Score"].map(h=><th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-400 uppercase ${h==="Score"?"text-right":"text-left"}`}>{h}</th>)}</tr></thead>
                      <tbody>{analytics.results.map((r,i)=>{const pct=r.total>0?Math.round((r.score/r.total)*100):0;return(<tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50"><td className="px-4 py-3 font-medium text-slate-800">{r.studentId?.name||"—"}</td><td className="px-4 py-3 text-xs font-mono text-slate-400">{r.studentId?.rollNo||"—"}</td><td className="px-4 py-3"><span className="badge bg-slate-100 text-slate-600">{r.assignedSet}</span></td><td className="px-4 py-3 text-right font-semibold">{r.score}/{r.total} <span className="text-slate-400">({pct}%)</span></td></tr>);})}</tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TeacherDashboard;