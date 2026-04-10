import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { BarChart3, Bell, BrainCircuit, Leaf, LayoutDashboard, User } from "lucide-react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analytics", label: "Energy Analytics", icon: BarChart3 },
  { to: "/forecast", label: "ML Predictions", icon: BrainCircuit },
  { to: "/carbon", label: "Carbon Footprint", icon: Leaf },
  { to: "/alerts", label: "System Alerts", icon: Bell },
];

export default function Sidebar() {
  return (
    <aside className="h-screen sticky top-0 bg-white border-r border-slate-200">
      <div className="px-6 py-6">
        <div className="font-semibold text-blue-600">Energy Monitor</div>
        <div className="text-xs text-slate-400 mt-1">CSL Building</div>
      </div>

      <nav className="px-3">
        <div className="space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
                  isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="mt-6 border-t border-slate-200 pt-3">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
                isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
              )
            }
          >
            <User className="h-4 w-4" />
            Profile
          </NavLink>
        </div>
      </nav>

      <div className="absolute bottom-0 left-0 right-0 px-6 py-5 border-t border-slate-200">
        <div className="text-[10px] text-slate-400">Green Tech &amp; Sustainability</div>
      </div>
    </aside>
  );
} 