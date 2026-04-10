import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import Skeleton from "../components/Skeleton";
import StatCard from "../components/StatCard";
import clsx from "clsx";
import { CalendarDays, Download, Filter } from "lucide-react";
import Modal from "../components/Modal";
import {
  buildSeries,
  downloadCsv,
  toDateInputValue,
  type AnalyticsTab,
  type DateRange,
} from "../services/analyticsRuntime";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { loadJson, saveJson } from "../services/store";

const LS_ANALYTICS_RANGE = "em_analytics_range";

function defaultRange(): DateRange {
  // default range that matches the screenshots context around Feb 1, 2026
  return { from: "2026-01-20", to: "2026-02-01" };
}

export default function AnalyticsPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["analytics"], queryFn: api.getAnalytics });

  const [tab, setTab] = useState<AnalyticsTab>("Daily");
  const [range, setRange] = useState<DateRange>(() => loadJson(LS_ANALYTICS_RANGE, defaultRange()));
  const [rangeDraft, setRangeDraft] = useState<DateRange>(range);
  const [rangeOpen, setRangeOpen] = useState(false);

  const series = useMemo(() => buildSeries(tab, range), [tab, range]);

  const kpis = useMemo(() => {
    // Recompute KPI numbers from generated series so it "works"
    if (tab === "Daily") {
      const last = series[series.length - 1]?.kwh ?? 0;
      return {
        aTitle: "Today's Consumption",
        aValue: last,
        bTitle: "This Week Consumption",
        bValue: Math.round(last * 1.0),
        cTitle: "This Month Consumption",
        cValue: Math.round(last * 1.98),
      };
    }
    if (tab === "Weekly") {
      const last = series[series.length - 1]?.kwh ?? 0;
      return {
        aTitle: "Today's Consumption",
        aValue: Math.round(last / 7),
        bTitle: "This Week Consumption",
        bValue: last,
        cTitle: "This Month Consumption",
        cValue: Math.round(last * 3.7),
      };
    }
    const last = series[series.length - 1]?.kwh ?? 0;
    return {
      aTitle: "Today's Consumption",
      aValue: Math.round(last / 30),
      bTitle: "This Week Consumption",
      bValue: Math.round(last / 4),
      cTitle: "This Month Consumption",
      cValue: last,
    };
  }, [series, tab]);

  const exportCsv = () => {
    const rows = series.map((p) => ({ period: p.label, kwh: p.kwh, tab, from: range.from, to: range.to }));
    downloadCsv(`energy-analytics_${tab}_${range.from}_to_${range.to}.csv`, rows);
  };

  if (error) return <div className="text-sm text-red-600">Failed to load analytics.</div>;

  return (
    <div className="bg-sky-50/50 border border-slate-200 rounded-2xl px-5 sm:px-7 py-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Energy Analytics</h2>
          <div className="text-xs text-slate-500 mt-1">Detailed consumption analysis and insights</div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => {
              setRangeDraft(range);
              setRangeOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <CalendarDays className="h-4 w-4 text-slate-500" />
            Date Range
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-3 py-2 text-xs font-semibold shadow-lg shadow-blue-200/40 hover:bg-blue-700 transition"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* KPI row (3 cards) */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading || !data ? (
          <>
            <Skeleton className="h-[96px]" />
            <Skeleton className="h-[96px]" />
            <Skeleton className="h-[96px]" />
          </>
        ) : (
          <>
            <StatCard
              title={kpis.aTitle}
              value={`${kpis.aValue.toLocaleString()} kWh`}
              sub={"↑ 12% vs yesterday"}
              subTone="up"
              icon={<div className="h-4 w-4 rounded bg-orange-500/20" />}
              iconBg="bg-orange-50"
            />
            <StatCard
              title={kpis.bTitle}
              value={`${kpis.bValue.toLocaleString()} kWh`}
              sub={"↑ 12% vs last week"}
              subTone="up"
              icon={<div className="h-4 w-4 rounded bg-orange-500/20" />}
              iconBg="bg-orange-50"
            />
            <StatCard
              title={kpis.cTitle}
              value={`${kpis.cValue.toLocaleString()} kWh`}
              sub={"↑ 12% vs last month"}
              subTone="up"
              icon={<div className="h-4 w-4 rounded bg-orange-500/20" />}
              iconBg="bg-orange-50"
            />
          </>
        )}
      </div>

      {/* Tabs row */}
      <div className="mt-4 bg-white border border-slate-200 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-200 grid place-items-center">
            <Filter className="h-4 w-4 text-slate-500" />
          </div>

          <div className="flex items-center gap-2">
            {(["Daily", "Weekly", "Monthly"] as AnalyticsTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={clsx(
                  "rounded-xl px-4 py-2 text-xs font-semibold transition",
                  tab === t ? "bg-blue-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="ml-auto hidden md:block text-[11px] text-slate-400">
            Range: <span className="font-semibold text-slate-600">{range.from}</span> →{" "}
            <span className="font-semibold text-slate-600">{range.to}</span>
          </div>
        </div>
      </div>

      {/* Big historical chart */}
      <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="text-sm font-semibold">Historical Energy Consumption</div>

        <div className="mt-4 h-[280px]">
          {isLoading ? (
            <Skeleton className="h-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ left: 4, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip />
                <Line type="monotone" dataKey="kwh" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-2 text-center text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            {tab}
          </span>
        </div>
      </div>

      {/* Two charts row (still uses mockDb, but they are real charts) */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-sm font-semibold">Energy Consumption by Room</div>

          <div className="mt-4 h-[260px]">
            {isLoading || !data ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byRoom} layout="vertical" margin={{ left: 20, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis type="category" dataKey="room" tick={{ fontSize: 10, fill: "#94a3b8" }} width={120} />
                  <Tooltip />
                  <Bar dataKey="kwh" fill="#06b6d4" radius={[10, 10, 10, 10]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-sm font-semibold">Energy Consumption by Floor</div>

          <div className="mt-4 h-[260px]">
            {isLoading || !data ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byFloor} margin={{ left: 4, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                  <XAxis dataKey="floor" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip />
                  <Bar dataKey="kwh" fill="#2563eb" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row: pie + table */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-sm font-semibold">Consumption by Activity Type</div>

          <div className="mt-4 h-[220px]">
            {isLoading || !data ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.activity} dataKey="kwh" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {data.activity.map((a: any) => (
                      <Cell key={a.name} fill={a.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {isLoading || !data ? (
              <>
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
              </>
            ) : (
              data.activity.map((a: any) => (
                <div key={a.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
                    {a.name}
                  </div>
                  <div className="font-semibold text-slate-700">{a.kwh.toLocaleString()} kWh</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-sm font-semibold">Detailed Energy Log</div>

          <div className="mt-4 overflow-x-auto">
            {isLoading || !data ? (
              <Skeleton className="h-[260px]" />
            ) : (
              <table className="w-full min-w-[420px] text-[11px]">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-200">
                    <th className="text-left font-semibold py-2">Location</th>
                    <th className="text-right font-semibold py-2">kWh</th>
                    <th className="text-right font-semibold py-2">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {data.detailedLog.map((row: any) => (
                    <tr key={row.location} className="border-b border-slate-100">
                      <td className="py-3 text-slate-600">{row.location}</td>
                      <td className="py-3 text-right text-slate-700">{row.kwh.toLocaleString()}</td>
                      <td className="py-3 text-right text-emerald-600 font-semibold">{row.trend}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Date range modal */}
      <Modal
        open={rangeOpen}
        title="Select Date Range"
        onClose={() => setRangeOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setRangeOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setRange(rangeDraft);
                saveJson(LS_ANALYTICS_RANGE, rangeDraft);
                setRangeOpen(false);
              }}
              className="rounded-xl bg-blue-600 text-white px-4 py-2 text-xs font-semibold shadow-lg shadow-blue-200/40 hover:bg-blue-700 transition"
            >
              Apply
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2">From</div>
            <input
              type="date"
              value={rangeDraft.from}
              onChange={(e) => setRangeDraft((r) => ({ ...r, from: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              max={rangeDraft.to}
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2">To</div>
            <input
              type="date"
              value={rangeDraft.to}
              onChange={(e) => setRangeDraft((r) => ({ ...r, to: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              min={rangeDraft.from}
            />
          </div>
        </div>

        <div className="mt-4 text-[11px] text-slate-500">
          Tip: Use a range up to ~30 days for Daily view to keep chart readable.
        </div>

        <div className="mt-4 flex gap-2 flex-wrap">
          <button
            className="text-[11px] font-semibold text-blue-600 hover:underline"
            onClick={() => setRangeDraft(defaultRange())}
          >
            Reset to default (2026-01-20 → 2026-02-01)
          </button>
          <button
            className="text-[11px] font-semibold text-slate-600 hover:underline"
            onClick={() => {
              const today = new Date();
              const to = toDateInputValue(today);
              const from = toDateInputValue(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 13));
              setRangeDraft({ from, to });
            }}
          >
            Last 14 days
          </button>
        </div>
      </Modal>
    </div>
  );
}