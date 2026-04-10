import { useNavigate } from "react-router-dom";
import { auth } from "../services/auth";

export default function ProfilePage() {
  const nav = useNavigate();
  const user = auth.getUser();

  return (
    <div className="bg-sky-50/50 border border-slate-200 rounded-2xl px-5 sm:px-7 py-6">
      <h2 className="text-2xl font-semibold">Profile</h2>
      <div className="text-xs text-slate-500 mt-1">Account settings</div>

      <div className="mt-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="grid gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <div className="text-slate-500">Name</div>
            <div className="font-semibold text-slate-800">{user?.name ?? "-"}</div>
          </div>
          <div className="flex justify-between gap-4">
            <div className="text-slate-500">Email</div>
            <div className="font-semibold text-slate-800">{user?.email ?? "-"}</div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end">
          <button
            onClick={() => {
              auth.signOut();
              nav("/signin", { replace: true });
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}