import { useState } from "react";
import { API } from "../utils/api";

function Login() {
  const [role, setRole] = useState("student");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!loginId || !password) { setError("Please fill all fields"); return; }
    setError("");
    setLoading(true);
    try {
     const res = await fetch(`${API}/api/auth/${role}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          role === "student" ? { rollNo: loginId, password } : { employeeId: loginId, password }
        ),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Login failed"); setLoading(false); return; }

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("role", data.role);
      localStorage.setItem("token", data.token);

      window.location.href = data.role === "student" ? "/student" : "/teacher";
    } catch {
      setError("Server not reachable. Check backend.");
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleLogin(); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4 text-3xl shadow-lg">
            🎓
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">CBT Portal</h1>
          <p className="text-blue-200 text-sm mt-1">SKIT Jaipur — Examination System</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Role Toggle */}
          <div className="flex rounded-2xl overflow-hidden border border-slate-200 mb-6 p-1 bg-slate-50 gap-1">
            {["student", "teacher"].map((r) => (
              <button
                key={r}
                onClick={() => { setRole(r); setError(""); setLoginId(""); }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all capitalize ${
                  role === r ? "bg-brand-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {r === "student" ? "👨‍🎓" : "👩‍🏫"} {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">{role === "student" ? "Roll Number" : "Employee ID"}</label>
              <input
                className="input"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                onKeyDown={handleKey}
                placeholder={role === "student" ? "e.g. 24ESKCX033" : "e.g. SKIT001"}
                autoFocus
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm slide-in">
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full btn-primary py-3 rounded-2xl text-base mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in...
                </span>
              ) : "Sign In →"}
            </button>
          </div>

          <p className="text-center text-xs text-slate-300 mt-6">
            CBT Examination Portal v2.0 · Academic Use Only
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
