import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../services/auth";
import { useToast } from "../components/ToastProvider";

export default function SignUpPage() {
  const nav = useNavigate();
  const toast = useToast();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pwdChecks, setPwdChecks] = useState({
    length: false,
    categories: false,
    noPersonal: true,
    notCommon: true,
    notSequential: true,
    notPwned: true,
  });
  const [pwnedCount, setPwnedCount] = useState<number | null>(null);
  const [checkingPwned, setCheckingPwned] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (name.trim().length < 2) {
      setErr("Please enter your full name.");
      return;
    }
    if (!username.trim()) {
      setErr("Choose a username.");
      return;
    }
    if (!email.includes("@")) {
      setErr("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }

    // final enforce: require password checks
    if (!pwdChecks.length || !pwdChecks.categories || !pwdChecks.noPersonal || !pwdChecks.notCommon || !pwdChecks.notSequential || !pwdChecks.notPwned) {
      setErr("Password does not meet the required strength or safety checks.");
      return;
    }

    setLoading(true);
    try {
      await auth.signUp({ name, username, email, password, remember });
      toast.success("Your account has been created.", "Sign Up Success");
      nav("/dashboard", { replace: true });
    } catch (ex: unknown) {
      const message = ex instanceof Error ? ex.message : "Failed to sign up";
      setErr(message);
      toast.error(message, "Sign Up Failed");
    } finally {
      setLoading(false);
    }
  }

  // ------------------ password validation helpers ------------------
  function countCategories(pw: string) {
    let count = 0;
    if (/[a-z]/.test(pw)) count++;
    if (/[A-Z]/.test(pw)) count++;
    if (/\d/.test(pw)) count++;
    if (/[^A-Za-z0-9]/.test(pw)) count++;
    return count;
  }

  function isSequentialOrRepeating(s: string) {
    if (!s) return false;
    const normalized = s.toLowerCase();
    // check repeating
    const repeatMatch = /(.)\1{3,}/.test(normalized);
    if (repeatMatch) return true;

    // check sequential of length >=4
    const seqLen = 4;
    for (let i = 0; i <= normalized.length - seqLen; i++) {
      let asc = true;
      let desc = true;
      for (let j = 0; j < seqLen - 1; j++) {
        const a = normalized.charCodeAt(i + j);
        const b = normalized.charCodeAt(i + j + 1);
        if (b !== a + 1) asc = false;
        if (b !== a - 1) desc = false;
      }
      if (asc || desc) return true;
    }
    return false;
  }

  const commonPasswords = new Set([
    "123456",
    "123456789",
    "password",
    "12345678",
    "qwerty",
    "1234567",
    "111111",
    "123123",
    "abc123",
    "password1",
    "password123",
    "1234",
    "iloveyou",
  ]);

  async function sha1Hex(text: string) {
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const hash = await crypto.subtle.digest("SHA-1", data);
    const arr = Array.from(new Uint8Array(hash));
    return arr.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  }

  async function checkPwned(passwordToCheck: string) {
    try {
      setCheckingPwned(true);
      setPwnedCount(null);
      const sha1 = await sha1Hex(passwordToCheck);
      const prefix = sha1.slice(0, 5);
      const suffix = sha1.slice(5);
      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      if (!res.ok) return true; // if API fails, be conservative and allow
      const text = await res.text();
      const lines = text.split('\n');
      for (const line of lines) {
        const [hashSuffix, countStr] = line.split(":");
        if (hashSuffix === suffix) {
          const count = parseInt(countStr || "0", 10);
          setPwnedCount(count);
          return count === 0;
        }
      }
      setPwnedCount(0);
      return true;
    } catch (e) {
      // network/CORS issues - don't block sign-up on pwned check failure
      return true;
    } finally {
      setCheckingPwned(false);
    }
  }

  // debounce and run checks when password / related fields change
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      if (cancelled) return;
      const lengthOk = password.length >= 8; // minimum enforced
      const categoriesOk = countCategories(password) >= 3;
      const containsPersonal = !!password && ((email && password.toLowerCase().includes(email.toLowerCase())) || (username && password.toLowerCase().includes(username.toLowerCase())) || (name && password.includes(name)));
      const isCommon = commonPasswords.has(password.toLowerCase());
      const isSeq = isSequentialOrRepeating(password);
      let notPwned = true;
      if (password.length > 0) {
        try {
          notPwned = await checkPwned(password);
        } catch (_) {
          notPwned = true;
        }
      }
      setPwdChecks({
        length: lengthOk,
        categories: categoriesOk,
        noPersonal: !containsPersonal,
        notCommon: !isCommon,
        notSequential: !isSeq,
        notPwned: notPwned,
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [password, email, username, name]);

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-gradient-to-b from-sky-100 via-sky-50 to-slate-50">
      <div className="w-full max-w-[560px]">
        <div className="bg-sky-50/60 border border-slate-200 rounded-2xl shadow-card px-6 sm:px-12 py-10 sm:py-14">
          <h1 className="text-2xl font-semibold text-center">Sign up</h1>

          <form onSubmit={onSubmit} className="mt-10 space-y-5 max-w-[420px] mx-auto">
            {err ? <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{err}</div> : null}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
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
              Keep me signed in on this device
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 pr-12"
                  placeholder="Create a strong password"
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
              <div className="mt-2 text-[11px] text-slate-500">
                Use a strong password (minimum 8 characters). Avoid common passwords.
              </div>
              <ul className="mt-3 text-xs space-y-1 text-slate-600">
                <li className="flex items-center gap-2">
                  <span className={pwdChecks.length ? "text-green-600" : "text-slate-400"}>{pwdChecks.length ? "✔" : "●"}</span>
                  <span>At least 8 characters (12+ recommended)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={pwdChecks.categories ? "text-green-600" : "text-slate-400"}>{pwdChecks.categories ? "✔" : "●"}</span>
                  <span>Use at least 3 types: upper, lower, number, special</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={pwdChecks.noPersonal ? "text-green-600" : "text-red-600"}>{pwdChecks.noPersonal ? "✔" : "✖"}</span>
                  <span>Avoid your name, username, or email</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={pwdChecks.notCommon ? "text-green-600" : "text-red-600"}>{pwdChecks.notCommon ? "✔" : "✖"}</span>
                  <span>Avoid common passwords or simple patterns</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={pwdChecks.notSequential ? "text-green-600" : "text-red-600"}>{pwdChecks.notSequential ? "✔" : "✖"}</span>
                  <span>Avoid sequential or repeated characters</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={pwdChecks.notPwned ? "text-green-600" : "text-red-600"}>{pwdChecks.notPwned ? "✔" : "✖"}</span>
                  <span>
                    {checkingPwned ? "Checking breaches..." : pwdChecks.notPwned ? (pwnedCount ? `Seen ${pwnedCount} times` : "Not found in breaches") : "Found in breaches"}
                  </span>
                </li>
              </ul>
            </div>

            <button
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 text-white py-3 text-sm font-semibold shadow-lg shadow-blue-200/40 hover:bg-blue-700 transition disabled:opacity-70"
            >
              {loading ? "Creating..." : "Create account"}
            </button>

            <div className="text-xs text-slate-600 text-center">
              Already have an account?{" "}
              <Link to="/signin" className="text-blue-600 font-semibold hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}