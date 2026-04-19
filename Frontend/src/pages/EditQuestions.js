import { useState } from "react";
import { API, authFetch } from "../utils/api";

const LABELS = ["A", "B", "C", "D"];
const SET_COLORS = { all: "bg-emerald-100 text-emerald-700", even: "bg-blue-100 text-blue-700", odd: "bg-violet-100 text-violet-700" };
const SET_LABELS = { all: "All Students", even: "Set A (Even)", odd: "Set B (Odd)" };

/* ─── Single editable question row ─── */
function QuestionRow({ q, index, onUpdated, onDeleted, showToast }) {
  const [editing, setEditing] = useState(false);
  const [eText, setEText] = useState(q.question);
  const [eOpts, setEOpts] = useState([...q.options]);
  const [eAns, setEAns] = useState(q.correctAnswer);
  const [eSet, setESet] = useState(q.setType || "all");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    if (!eText.trim() || eOpts.some(o => !o.trim()) || !eAns) {
      showToast("Fill all fields before saving", "warn"); return;
    }
    setSaving(true);
    try {
      const res = await authFetch(`${API}/question/update/${q._id}`, {
        method: "PUT",
        body: JSON.stringify({ question: eText, options: eOpts, correctAnswer: eAns, setType: eSet }),
      });
      const d = await res.json();
      if (d.success) { onUpdated(d.question); setEditing(false); showToast("✅ Question updated"); }
    } catch { showToast("Failed to update", "error"); }
    setSaving(false);
  };

  const del = async () => {
    if (!window.confirm("Delete this question? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await authFetch(`${API}/question/delete/${q._id}`, { method: "DELETE" });
      onDeleted(q._id);
      showToast("Question deleted", "info");
    } catch { showToast("Failed to delete", "error"); }
    setDeleting(false);
  };

  if (editing) {
    return (
      <div className="border-2 border-brand-400 rounded-2xl p-5 bg-blue-50/40 space-y-3 slide-in">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">✏️ Editing Q{index + 1}</span>
          <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-700 text-xl">✕</button>
        </div>

        <div>
          <label className="label">Question</label>
          <textarea className="input resize-none h-20 text-sm" value={eText} onChange={e => setEText(e.target.value)} />
        </div>

        <div>
          <label className="label">Options</label>
          <div className="grid grid-cols-2 gap-2">
            {eOpts.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-200 text-xs font-bold flex items-center justify-center shrink-0">{LABELS[i]}</span>
                <input className="input text-sm" value={opt} onChange={e => { const o = [...eOpts]; o[i] = e.target.value; setEOpts(o); }} placeholder={`Option ${LABELS[i]}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Correct Answer</label>
            <select className="input text-sm" value={eAns} onChange={e => setEAns(e.target.value)}>
              <option value="">Select answer</option>
              {eOpts.filter(Boolean).map((opt, i) => (
                <option key={i} value={opt}>{LABELS[i]}. {opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Assign To</label>
            <select className="input text-sm" value={eSet} onChange={e => setESet(e.target.value)}>
              <option value="all">All Students</option>
              <option value="even">Set A — Even</option>
              <option value="odd">Set B — Odd</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={save} disabled={saving} className="btn-primary text-sm px-5 py-2 disabled:opacity-60">{saving ? "Saving..." : "Save Changes"}</button>
          <button onClick={() => setEditing(false)} className="btn-secondary text-sm px-5 py-2">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-2xl p-4 hover:border-slate-300 hover:shadow-sm transition-all group bg-white">
      <div className="flex items-start gap-3 mb-3">
        <span className="w-7 h-7 rounded-xl bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{index + 1}</span>
        <p className="text-sm font-semibold text-slate-800 leading-snug flex-1">{q.question}</p>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => setEditing(true)} title="Edit" className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all text-base">✏️</button>
          <button onClick={del} disabled={deleting} title="Delete" className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all text-base disabled:opacity-50">🗑️</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {q.options.map((opt, i) => (
          <div key={i} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl ${
            opt === q.correctAnswer
              ? "bg-emerald-50 border border-emerald-200 font-semibold text-emerald-800"
              : "bg-slate-50 border border-slate-100 text-slate-600"
          }`}>
            <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${opt === q.correctAnswer ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>{LABELS[i]}</span>
            <span className="truncate">{opt}</span>
            {opt === q.correctAnswer && <span className="ml-auto text-emerald-500 shrink-0">✓</span>}
          </div>
        ))}
      </div>

      <span className={`badge text-xs ${SET_COLORS[q.setType] || SET_COLORS.all}`}>{SET_LABELS[q.setType] || "All Students"}</span>
    </div>
  );
}

/* ─── Main EditQuestions component ─── */
function EditQuestions({ exam, onClose, showToast }) {
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Add new question
  const [addText, setAddText] = useState("");
  const [addOpts, setAddOpts] = useState(["", "", "", ""]);
  const [addAns, setAddAns] = useState("");
  const [addSet, setAddSet] = useState("all");
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API}/question/${exam._id}`);
      const d = await res.json();
      setQuestions(Array.isArray(d) ? d : []);
      setLoaded(true);
    } catch { showToast("Failed to load questions", "error"); }
    setLoading(false);
  };

  // Auto-load on mount
  useState(() => { load(); }, []);
  // eslint-disable-next-line
  if (!loaded && !loading) { load(); }

  const handleUpdated = (updated) => setQuestions(prev => prev.map(q => q._id === updated._id ? updated : q));
  const handleDeleted = (id) => setQuestions(prev => prev.filter(q => q._id !== id));

  const handleAdd = async () => {
    if (!addText.trim() || addOpts.some(o => !o.trim()) || !addAns) {
      showToast("Fill all fields", "warn"); return;
    }
    setAdding(true);
    try {
      const res = await authFetch(`${API}/question/add`, {
        method: "POST",
        body: JSON.stringify({ examId: exam._id, question: addText, options: addOpts, correctAnswer: addAns, setType: addSet }),
      });
      const d = await res.json();
      if (d.success) {
        setQuestions(prev => [...prev, d.question]);
        setAddText(""); setAddOpts(["", "", "", ""]); setAddAns(""); setAddSet("all");
        setShowAdd(false);
        showToast("✅ Question added!");
      }
    } catch { showToast("Failed to add", "error"); }
    setAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4 py-8">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Edit Questions</h2>
            <p className="text-sm text-slate-400 mt-0.5">{exam.subject} · {exam.section}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="badge bg-slate-100 text-slate-600">{questions?.length || 0} questions</span>
            <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-sm px-4 py-2">+ Add Question</button>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Add Question Form */}
          {showAdd && (
            <div className="border-2 border-brand-200 rounded-2xl p-5 bg-brand-50/30 space-y-3 slide-in">
              <p className="text-xs font-bold text-brand-700 uppercase tracking-wider">New Question</p>
              <textarea className="input resize-none h-20 text-sm" value={addText} onChange={e => setAddText(e.target.value)} placeholder="Type the question..." />
              <div className="grid grid-cols-2 gap-2">
                {addOpts.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-xs font-bold flex items-center justify-center shrink-0">{LABELS[i]}</span>
                    <input className="input text-sm" value={opt} onChange={e => { const o = [...addOpts]; o[i] = e.target.value; setAddOpts(o); }} placeholder={`Option ${LABELS[i]}`} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Correct Answer</label>
                  <select className="input text-sm" value={addAns} onChange={e => setAddAns(e.target.value)}>
                    <option value="">Select</option>
                    {addOpts.filter(Boolean).map((opt, i) => <option key={i} value={opt}>{LABELS[i]}. {opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Assign To</label>
                  <select className="input text-sm" value={addSet} onChange={e => setAddSet(e.target.value)}>
                    <option value="all">All Students</option>
                    <option value="even">Set A (Even)</option>
                    <option value="odd">Set B (Odd)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAdd} disabled={adding} className="btn-primary text-sm px-5 py-2 disabled:opacity-60">{adding ? "Adding..." : "Add Question"}</button>
                <button onClick={() => setShowAdd(false)} className="btn-secondary text-sm px-5 py-2">Cancel</button>
              </div>
            </div>
          )}

          {/* Questions List */}
          {loading && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && questions?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <span className="text-5xl mb-3">📭</span>
              <p className="font-medium">No questions yet</p>
              <p className="text-sm mt-1">Click "+ Add Question" to get started</p>
            </div>
          )}

          {!loading && questions && questions.length > 0 && (
            <div className="space-y-3">
              {questions.map((q, i) => (
                <QuestionRow key={q._id} q={q} index={i} onUpdated={handleUpdated} onDeleted={handleDeleted} showToast={showToast} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EditQuestions;
