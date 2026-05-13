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
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (lockoutUntil && Date.now() < lockoutUntil) {
      setErr("Too many failed attempts. Try again later.");
      return;
    }

    if (!email.trim()) {
      setErr("Enter your username.");
      return;
    }
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await auth.signIn(email, password, remember);
      setFailedAttempts(0);
      setLockoutUntil(null);
      toast.success("Welcome back. You are signed in.", "Sign In Success");
      nav(from, { replace: true });
    } catch (ex: unknown) {
      const generic = "Invalid email or password";
      setErr(generic);
      toast.error(generic, "Sign In Failed");
      setFailedAttempts((s) => {
        const next = s + 1;
        if (next >= 5) {
          // lock out for 30 seconds
          setLockoutUntil(Date.now() + 30 * 1000);
        }
        return next;
      });
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
              <label className="block text-xs font-semibold text-slate-700 mb-2">Username</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
                placeholder="your username"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 pr-12"
                  placeholder="your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    // Eye closed icon (hide)
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    // Eye open icon (show)
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
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
              Don't have an account?{" "}
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