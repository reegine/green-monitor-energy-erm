import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { useEffect, useState } from "react";
import clsx from "clsx";

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile top strip */}
      <div className="md:hidden sticky top-0 z-40 bg-slate-50/80 backdrop-blur border-b border-slate-200">
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-sm"
          >
            Menu
          </button>
          <div className="text-sm text-slate-500">Energy Monitor</div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px]">
        <div className="flex">
          {/* Sidebar (desktop) */}
          <div className="hidden md:block w-[260px]">
            <Sidebar />
          </div>

          {/* Sidebar overlay (mobile) */}
          <div
            className={clsx(
              "md:hidden fixed inset-0 z-50 transition",
              mobileOpen ? "pointer-events-auto" : "pointer-events-none"
            )}
          >
            <div
              className={clsx(
                "absolute inset-0 bg-slate-900/30 transition-opacity",
                mobileOpen ? "opacity-100" : "opacity-0"
              )}
              onClick={() => setMobileOpen(false)}
            />
            <div
              className={clsx(
                "absolute left-0 top-0 h-full w-[280px] bg-white border-r border-slate-200 transition-transform",
                mobileOpen ? "translate-x-0" : "-translate-x-full"
              )}
            >
              <Sidebar />
            </div>
          </div>

          {/* Main */}
          <main className="flex-1 px-4 md:px-8 py-6">
            <TopBar />
            <div className="mt-4">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}