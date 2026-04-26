import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import Skeleton from "../components/Skeleton";
import { Download } from "lucide-react";
import clsx from "clsx";
import { downloadCsv } from "../services/analyticsRuntime";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  Bar,
  BarChart,
} from "recharts";

export default function CarbonPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["carbon"], queryFn: api.getCarbon });

  if (error) return <div className="text-sm text-red-600">Failed to load carbon data.</div>;

  return (
    <div className="bg-sky-50/50 border border-slate-200 rounded-2xl px-5 sm:px-7 py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Carbon Footprint Report</h2>
          <div className="text-xs text-slate-500 mt-1">Track and reduce your environmental impact</div>
        </div>

        <button
          disabled={!data || data.trend.length === 0}
          onClick={() => {
            if (!data) return;
            downloadCsv(
              `carbon-report_${new Date().toISOString().slice(0, 10)}.csv`,
              data.trend.map((row) => ({ month: row.month, actual_tons: row.actual, target_tons: row.target }))
            );
          }}
          className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-2 text-xs font-semibold shadow-lg shadow-blue-200/40 hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          Download Report
        </button>
      </div>

      {/* KPI row */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading || !data ? (
          <>
            <Skeleton className="h-[92px]" />
            <Skeleton className="h-[92px]" />
            <Skeleton className="h-[92px]" />
            <Skeleton className="h-[92px]" />
          </>
        ) : (
          data.kpis.map((k, i) => {
            const iconBg =
              k.iconTone === "blue"
                ? "bg-blue-50"
                : k.iconTone === "purple"
                ? "bg-purple-50"
                : k.iconTone === "green"
                ? "bg-emerald-50"
                : "bg-pink-50";

            return (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-400">{k.title}</div>
                    <div className="mt-2 text-2xl font-semibold tracking-tight">
                      {k.value} <span className="text-xs text-slate-400 font-medium">{k.unit}</span>
                    </div>
                    <div className="mt-1 text-xs text-emerald-600">{k.delta}</div>
                  </div>
                  <div className={clsx("h-9 w-9 rounded-xl", iconBg)} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Trend chart */}
      <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="text-sm font-semibold">Carbon Emissions Trend</div>
        <div className="text-xs text-slate-400 mt-1">Monthly emissions vs reduction target</div>

        <div className="mt-4 h-[280px]">
          {isLoading || !data ? (
            <Skeleton className="h-full" />
          ) : data.trend.length === 0 ? (
            <div className="h-full grid place-items-center text-xs text-slate-400">
              No carbon trend data available yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend} margin={{ left: 4, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="redFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip />
                <Area type="monotone" dataKey="actual" stroke="#ef4444" strokeWidth={2} fill="url(#redFill)" />
                <Line type="monotone" dataKey="target" stroke="#2563eb" strokeWidth={2} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-2 text-center text-[11px] text-slate-500">
          <span className="text-red-500 font-medium">Actual Emissions</span> &nbsp;•&nbsp;{" "}
          <span className="text-blue-600 font-medium">Target</span>
        </div>
      </div>

      {/* Sources */}
      <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="text-sm font-semibold">Emissions by Source</div>

        <div className="mt-4 h-[220px]">
          {isLoading || !data ? (
            <Skeleton className="h-full" />
          ) : data.sources.length === 0 ? (
            <div className="h-full grid place-items-center text-xs text-slate-400">
              No source breakdown available yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.sources} layout="vertical" margin={{ left: 20, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="#e2e8f0" radius={[8, 8, 8, 8]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Achievement */}
      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5">
        {isLoading || !data ? (
          <Skeleton className="h-[120px]" />
        ) : (
          <>
            <div className="text-sm font-semibold text-slate-800">{data.achievement.title}</div>
            <div className="text-xs text-slate-600 mt-2">{data.achievement.subtitle}</div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              {data.achievement.stats.length === 0 ? (
                <div className="md:col-span-3 rounded-2xl border border-slate-200 bg-white p-4 text-center text-xs text-slate-500">
                  No achievement metrics available yet.
                </div>
              ) : (
                data.achievement.stats.map((s, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4">
                    <div className="text-lg font-semibold text-emerald-600">{s.value}</div>
                    <div className="text-[11px] text-slate-500 mt-1">{s.unit}</div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Recommendations */}
      <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="text-sm font-semibold">Carbon Offset Recommendations</div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {isLoading || !data ? (
            <>
              <Skeleton className="h-[110px]" />
              <Skeleton className="h-[110px]" />
            </>
          ) : data.recommendations.length === 0 ? (
            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
              No recommendations available yet.
            </div>
          ) : (
            data.recommendations.map((r, i) => (
              <div
                key={i}
                className={clsx(
                  "rounded-2xl border p-4",
                  r.tone === "purple" ? "border-purple-200 bg-purple-50/30" : "border-teal-200 bg-teal-50/30"
                )}
              >
                <div className="text-xs font-semibold text-slate-800">{r.title}</div>
                <div className="text-[11px] text-slate-600 mt-1">{r.subtitle}</div>
                <div className="mt-3 text-[10px] font-semibold text-blue-600">{r.footer}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}