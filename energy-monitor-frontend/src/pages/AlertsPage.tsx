import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import Skeleton from "../components/Skeleton";
import clsx from "clsx";
import { Bell, CheckCircle2, Settings2, TriangleAlert, XCircle } from "lucide-react";
import Modal from "../components/Modal";
import { loadThresholds, mergeResolved, saveThresholds, setResolved, type Thresholds } from "../services/alertsRuntime";

type FilterKey = "all" | "critical" | "warning" | "info" | "resolved";

function SummaryCard(props: { title: string; value: number; icon: React.ReactNode; tone: "blue" | "red" | "orange" | "teal" }) {
  const iconTone =
    props.tone === "blue"
      ? "text-blue-600"
      : props.tone === "red"
      ? "text-red-500"
      : props.tone === "orange"
      ? "text-orange-500"
      : "text-teal-600";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
      <div>
        <div className="text-[10px] text-slate-400">{props.title}</div>
        <div className="text-xl font-semibold mt-1">{props.value}</div>
      </div>
      <div className={clsx("h-9 w-9 rounded-xl bg-slate-50 border border-slate-200 grid place-items-center", iconTone)}>
        {props.icon}
      </div>
    </div>
  );
}

function Chip(props: { active: boolean; label: string; onClick(): void }) {
  return (
    <button
      onClick={props.onClick}
      className={clsx(
        "rounded-xl px-4 py-2 text-[11px] font-semibold transition",
        props.active ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
      )}
    >
      {props.label}
    </button>
  );
}

function AlertItemRow(props: {
  title: string;
  tag: string;
  description: string;
  metaLeft: string;
  metaRight: string;
  severity: "critical" | "warning" | "info";
  resolved: boolean;
  onResolve(): void;
}) {
  const border =
    props.severity === "critical"
      ? "border-red-200"
      : props.severity === "warning"
      ? "border-orange-200"
      : "border-blue-200";

  const icon =
    props.severity === "critical" ? (
      <XCircle className="h-5 w-5 text-red-500" />
    ) : props.severity === "warning" ? (
      <TriangleAlert className="h-5 w-5 text-orange-500" />
    ) : (
      <Bell className="h-5 w-5 text-blue-600" />
    );

  const tagBg =
    props.severity === "critical"
      ? "bg-red-50 text-red-600"
      : props.severity === "warning"
      ? "bg-orange-50 text-orange-600"
      : "bg-blue-50 text-blue-600";

  return (
    <div className={clsx("bg-white rounded-2xl border p-4", border)}>
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-200 grid place-items-center">{icon}</div>

        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-xs font-semibold text-slate-800">{props.title}</div>
            <span className={clsx("text-[10px] font-semibold px-2 py-1 rounded-full", tagBg)}>{props.tag}</span>
            {props.resolved ? (
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-500">
                Resolved
              </span>
            ) : null}
          </div>

          <div className="text-[11px] text-slate-600 mt-2">{props.description}</div>

          <div className="mt-3 flex items-center justify-between gap-4">
            <div className="text-[10px] text-slate-400">
              {props.metaLeft} &nbsp;•&nbsp; {props.metaRight}
            </div>

            {!props.resolved ? (
              <button onClick={props.onResolve} className="text-[11px] text-blue-600 font-semibold hover:underline">
                Mark as Resolved
              </button>
            ) : (
              <div className="text-[11px] text-emerald-600 font-semibold inline-flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Resolved
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["alerts"], queryFn: api.getAlerts });

  const [filter, setFilter] = useState<FilterKey>("all");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const thresholdsFallback = data?.thresholds ?? {
    dailyUsageLimit: "15,000 kWh",
    peakDemand: "700 kWh",
    budgetThreshold: "95%",
    usageSpikeAlert: "20%",
  };

  const [thresholdDraft, setThresholdDraft] = useState<Thresholds>(() => loadThresholds(thresholdsFallback));

  const mergedList = useMemo(() => (data ? mergeResolved(data.list) : []), [data]);

  const summary = useMemo(() => {
    const active = mergedList.filter((a) => !a.is_resolved).length;
    const critical = mergedList.filter((a) => a.severity === "critical" && !a.is_resolved).length;
    const warning = mergedList.filter((a) => a.severity === "warning" && !a.is_resolved).length;
    const resolved = mergedList.filter((a) => a.is_resolved).length;
    return { active, critical, warning, resolved };
  }, [mergedList]);

  const filtered = useMemo(() => {
    return mergedList.filter((a) => {
      if (filter === "all") return true;
      if (filter === "resolved") return a.is_resolved;
      return a.severity === filter && !a.is_resolved;
    });
  }, [mergedList, filter]);

  const thresholds = useMemo(() => loadThresholds(thresholdsFallback), [thresholdsFallback]);

  if (error) return <div className="text-sm text-red-600">Failed to load alerts.</div>;

  return (
    <div className="bg-sky-50/50 border border-slate-200 rounded-2xl px-5 sm:px-7 py-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">System Alerts</h2>
          <div className="text-xs text-slate-500 mt-1">Monitor and manage energy-related notifications</div>
        </div>

        <button
          onClick={() => {
            setThresholdDraft(thresholds);
            setSettingsOpen(true);
          }}
          className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Settings2 className="h-4 w-4 text-slate-500" />
          Alert Settings
        </button>
      </div>

      {/* Summary cards (computed from resolved state) */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-[70px]" />
            <Skeleton className="h-[70px]" />
            <Skeleton className="h-[70px]" />
            <Skeleton className="h-[70px]" />
          </>
        ) : (
          <>
            <SummaryCard title="Active Alerts" value={summary.active} icon={<Bell className="h-4 w-4" />} tone="blue" />
            <SummaryCard title="Critical" value={summary.critical} icon={<XCircle className="h-4 w-4" />} tone="red" />
            <SummaryCard title="Warnings" value={summary.warning} icon={<TriangleAlert className="h-4 w-4" />} tone="orange" />
            <SummaryCard title="Resolved" value={summary.resolved} icon={<CheckCircle2 className="h-4 w-4" />} tone="teal" />
          </>
        )}
      </div>

      {/* Filter chips row */}
      <div className="mt-4 bg-white border border-slate-200 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-200 grid place-items-center">
            <Settings2 className="h-4 w-4 text-slate-500" />
          </div>

          <Chip active={filter === "all"} label="All" onClick={() => setFilter("all")} />
          <Chip active={filter === "critical"} label="Critical" onClick={() => setFilter("critical")} />
          <Chip active={filter === "warning"} label="Warning" onClick={() => setFilter("warning")} />
          <Chip active={filter === "info"} label="Info" onClick={() => setFilter("info")} />
          <Chip active={filter === "resolved"} label="Resolved" onClick={() => setFilter("resolved")} />
        </div>
      </div>

      {/* Main content grid: list + thresholds */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-4 items-start">
        <div>
          <div className="text-xs font-semibold text-slate-700 mb-3">
            Recent Alerts ({isLoading ? "…" : mergedList.length})
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <>
                <Skeleton className="h-[110px]" />
                <Skeleton className="h-[110px]" />
                <Skeleton className="h-[110px]" />
              </>
            ) : (
              filtered.map((a: any) => (
                <AlertItemRow
                  key={a.id}
                  title={a.title}
                  tag={a.tag}
                  description={a.description}
                  metaLeft={a.metaLeft}
                  metaRight={a.metaRight}
                  severity={a.severity}
                  resolved={a.is_resolved}
                  onResolve={() => {
                    setResolved(a.id, true);
                    refetch(); // refresh view (local state will merge on next render)
                  }}
                />
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-700">Alert Thresholds</div>

          {isLoading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-9 w-full mt-3" />
            </div>
          ) : (
            <>
              <div className="mt-4 space-y-3 text-[11px]">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Daily Usage Limit</span>
                  <span className="font-semibold text-slate-800">{thresholds.dailyUsageLimit}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Peak Demand</span>
                  <span className="font-semibold text-slate-800">{thresholds.peakDemand}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Budget Threshold</span>
                  <span className="font-semibold text-slate-800">{thresholds.budgetThreshold}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Usage Spike Alert</span>
                  <span className="font-semibold text-slate-800">{thresholds.usageSpikeAlert}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setThresholdDraft(thresholds);
                  setSettingsOpen(true);
                }}
                className="mt-5 w-full rounded-xl bg-blue-600 text-white py-2 text-xs font-semibold shadow-lg shadow-blue-200/40 hover:bg-blue-700 transition"
              >
                Configure Alerts
              </button>
            </>
          )}
        </div>
      </div>

      {/* Settings modal */}
      <Modal
        open={settingsOpen}
        title="Alert Settings"
        onClose={() => setSettingsOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setSettingsOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                saveThresholds(thresholdDraft);
                setSettingsOpen(false);
              }}
              className="rounded-xl bg-blue-600 text-white px-4 py-2 text-xs font-semibold shadow-lg shadow-blue-200/40 hover:bg-blue-700 transition"
            >
              Save
            </button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2">Daily Usage Limit</div>
            <input
              value={thresholdDraft.dailyUsageLimit}
              onChange={(e) => setThresholdDraft((t) => ({ ...t, dailyUsageLimit: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="15,000 kWh"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2">Peak Demand</div>
            <input
              value={thresholdDraft.peakDemand}
              onChange={(e) => setThresholdDraft((t) => ({ ...t, peakDemand: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="700 kWh"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2">Budget Threshold</div>
            <input
              value={thresholdDraft.budgetThreshold}
              onChange={(e) => setThresholdDraft((t) => ({ ...t, budgetThreshold: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="95%"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2">Usage Spike Alert</div>
            <input
              value={thresholdDraft.usageSpikeAlert}
              onChange={(e) => setThresholdDraft((t) => ({ ...t, usageSpikeAlert: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="20%"
            />
          </div>
          <div className="text-[11px] text-slate-500">
            This is dummy settings stored in <span className="font-semibold">localStorage</span>.
          </div>
        </div>
      </Modal>
    </div>
  );
}