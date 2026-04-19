import { useState, useEffect } from "react";
import { API, authFetch } from "../utils/api";

const LABELS = ["A", "B", "C", "D"];

function ViewQuestions({ exam, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch(`${API}/question/review/${exam._id}/${user.id}`);
        const d = await res.json();
        if (!res.ok) { setError(d.message || "Cannot load review"); setLoading(false); return; }
        setData(d);
      } catch { setError("Failed to load questions"); }
      setLoading(false);
    };
    load();
  }, [exam._id, user.id]);

  const correct = data?.questions?.filter(q => q.studentAnswer === q.correctAnswer).length || 0;
  const total = data?.questions?.length || 0;
  const wrong = data?.questions?.filter(q => q.studentAnswer && q.studentAnswer !== q.correctAnswer).length || 0;
  const skipped = data?.questions?.filter(q => !q.studentAnswer).length || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto p-4 py-8">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl slide-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 text-white px-6 py-5 rounded-t-3xl flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">Question Review</p>
            <h2 className="font-bold text-xl">{exam.subject}</h2>
            {exam.courseCode && <p className="text-brand-200 text-sm mt-0.5">{exam.courseCode}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all mt-1">✕</button>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-16 text-center p-6">
            <span className="text-5xl mb-3">🔒</span>
            <p className="font-semibold text-slate-700 text-lg mb-2">Review Not Available</p>
            <p className="text-slate-500 text-sm">{error}</p>
            <button onClick={onClose} className="btn-primary mt-6 px-8">Close</button>
          </div>
        )}

        {data && (
          <div className="p-6 space-y-5">
            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-emerald-700">{correct}</div>
                <div className="text-xs text-emerald-600 mt-0.5">✅ Correct</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{wrong}</div>
                <div className="text-xs text-red-500 mt-0.5">❌ Wrong</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-slate-500">{skipped}</div>
                <div className="text-xs text-slate-400 mt-0.5">⏭ Skipped</div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-slate-600">Correct answer</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400" /><span className="text-slate-600">Your wrong answer</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-slate-300" /><span className="text-slate-600">Skipped / Other option</span></div>
            </div>

            {/* Questions */}
            <div className="space-y-5">
              {data.questions.map((q, i) => {
                const isCorrect = q.studentAnswer === q.correctAnswer;
                const isSkipped = !q.studentAnswer;
                const statusColor = isSkipped ? "border-slate-200 bg-white" : isCorrect ? "border-emerald-200 bg-emerald-50/30" : "border-red-200 bg-red-50/30";
                const statusIcon = isSkipped ? "⏭" : isCorrect ? "✅" : "❌";

                return (
                  <div key={q._id} className={`border-2 rounded-2xl p-5 ${statusColor}`}>
                    <div className="flex items-start gap-3 mb-4">
                      <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-sm font-semibold text-slate-800 leading-snug flex-1">{q.question}</p>
                      <span className="text-xl shrink-0">{statusIcon}</span>
                    </div>

                    <div className="space-y-2">
                      {q.options.map((opt, oi) => {
                        const isCorrectOpt = opt === q.correctAnswer;
                        const isStudentOpt = opt === q.studentAnswer;
                        const isWrongStudentOpt = isStudentOpt && !isCorrectOpt;

                        let cls = "bg-slate-50 border-slate-200 text-slate-600";
                        if (isCorrectOpt) cls = "bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold";
                        if (isWrongStudentOpt) cls = "bg-red-50 border-red-300 text-red-700 font-semibold";

                        return (
                          <div key={oi} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-sm ${cls}`}>
                            <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                              isCorrectOpt ? "bg-emerald-500 text-white" :
                              isWrongStudentOpt ? "bg-red-400 text-white" :
                              "bg-slate-200 text-slate-500"}`}>{LABELS[oi]}</span>
                            <span className="flex-1">{opt}</span>
                            {isCorrectOpt && <span className="text-emerald-600 text-xs font-bold shrink-0">✓ Correct</span>}
                            {isWrongStudentOpt && <span className="text-red-500 text-xs font-bold shrink-0">✗ Your answer</span>}
                            {isStudentOpt && isCorrectOpt && <span className="text-emerald-600 text-xs font-bold shrink-0">✓ Your answer</span>}
                          </div>
                        );
                      })}
                    </div>

                    {isSkipped && (
                      <p className="text-xs text-slate-400 mt-3 italic">You skipped this question · Correct answer: <span className="font-semibold text-slate-600">{q.correctAnswer}</span></p>
                    )}
                  </div>
                );
              })}
            </div>

            <button onClick={onClose} className="btn-secondary w-full py-3">Close Review</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ViewQuestions;
