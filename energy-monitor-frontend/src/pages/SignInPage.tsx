import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { auth } from "../services/auth";
import { useToast } from "../components/ToastProvider";

export default function SignInPage() {
  const nav = useNavigate();
  const loc = useLocation() as any;
  const from = loc.state?.from ?? "/dashboard";
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await auth.signIn(email, password, remember);
      toast.success("Welcome back. You are signed in.", "Sign In Success");
      nav(from, { replace: true });
    } catch (ex: unknown) {
      const message = ex instanceof Error ? ex.message : "Failed to sign in";
      setErr(message);
      toast.error(message, "Sign In Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-gradient-to-b from-sky-100 via-sky-50 to-slate-50">
      <div className="w-full max-w-[560px]">
        <div className="bg-sky-50/60 border border-slate-200 rounded-2xl shadow-card px-6 sm:px-12 py-10 sm:py-14">
          <h1 className="text-2xl font-semibold text-center">Log in</h1>

          <form onSubmit={onSubmit} className="mt-10 space-y-5 max-w-[420px] mx-auto">
            {err ? <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{err}</div> : null}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Username or Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
                placeholder="your username or email"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <label className="flex items-center gap-3 text-xs text-slate-600 select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
              />
              Remember me
            </label>

            <button
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 text-white py-3 text-sm font-semibold shadow-lg shadow-blue-200/40 hover:bg-blue-700 transition disabled:opacity-70"
            >
              {loading ? "Signing in..." : "Login"}
            </button>

            <div className="text-xs text-slate-600 text-center">
              Don’t have an account?{" "}
              <Link to="/signup" className="text-blue-600 font-semibold hover:underline">
                Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}