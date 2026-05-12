import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type CarbonDTO } from "../services/api";
import Skeleton from "../components/Skeleton";
import { CalendarDays, ChevronDown, Download, FileText } from "lucide-react";
import clsx from "clsx";
import { downloadCarbonPdf, downloadCsv } from "../services/analyticsRuntime";
import InfoTooltip from "../components/InfoTooltip";
import Modal from "../components/Modal";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function CarbonPage() {
  const { data, isLoading, error } = useQuery<CarbonDTO>({ queryKey: ["carbon"], queryFn: api.getCarbon });
  const [exportOpen, setExportOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{ from: string; to: string } | null>(null);
  const [rangeDraft, setRangeDraft] = useState<{ from: string; to: string }>({ from: "", to: "" });

  const metricTooltip = (title: string) => {
    switch (title) {
      case "Current Month Emissions":
        return "Current month carbon output in kg CO₂ based on the latest backend carbon records.";
      case "YTD Emissions":
        return "Total carbon emissions so far this year in kg CO₂, summed from stored monthly records.";
      default:
        return "A summary metric derived from the carbon records returned by the backend.";
    }
  };

  const defaultRange = useMemo(() => {
    const records = data?.records ?? [];
    if (!records.length) return null;
    const to = records[records.length - 1]?.date ?? "";
    const from = records[Math.max(0, records.length - 6)]?.date ?? to;
    return { from, to };
  }, [data]);

  useEffect(() => {
    if (!defaultRange || selectedRange) return;
    setSelectedRange(defaultRange);
    setRangeDraft(defaultRange);
  }, [defaultRange, selectedRange]);

  const activeRange = selectedRange ?? defaultRange;

  const filteredRecords = useMemo(() => {
    const records = data?.records ?? [];
    if (!activeRange) return records;
    return records.filter((record) => record.date >= activeRange.from && record.date <= activeRange.to);
  }, [activeRange, data]);

  const chartData = useMemo(
    () => filteredRecords.map((record) => ({ date: record.date, label: new Date(record.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }), actual: record.actual })),
    [filteredRecords]
  );

  const filteredCount = chartData.length;
  const exportDateLabel = activeRange ? `${activeRange.from}_to_${activeRange.to}` : "all-records";

  if (error) return <div className="text-sm text-red-600">Failed to load carbon data.</div>;

  const downloadCsvReport = () => {
    if (!data || !chartData.length) return;

    downloadCsv(
      `carbon-report_${exportDateLabel}.csv`,
      chartData.map((row) => ({ date: row.date, actual_kg_co2: row.actual }))
    );
    setExportOpen(false);
  };

  const downloadPdfReport = async () => {
    if (!data || !chartData.length) return;

    await downloadCarbonPdf(`carbon-report_${exportDateLabel}.pdf`, {
      ...data,
      trend: chartData.map((row) => ({ month: row.label, actual: row.actual })),
    });
    setExportOpen(false);
  };

  const downloadBothReport = async () => {
    if (!data) return;

    downloadCsvReport();
    await downloadPdfReport();
  };

  return (
    <div className="bg-sky-50/50 border border-slate-200 rounded-2xl px-5 sm:px-7 py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Carbon Footprint Report</h2>
          <div className="text-xs text-slate-500 mt-1">Track and reduce your environmental impact</div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <button
            disabled={!data || !chartData.length}
            onClick={() => setRangeOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <CalendarDays className="h-4 w-4 text-slate-500" />
            Date Range
          </button>

          <div className="relative hidden sm:block">
            <button
              disabled={!data || !chartData.length}
              onClick={() => setExportOpen((value) => !value)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-2 text-xs font-semibold shadow-lg shadow-blue-200/40 hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              Download Report
              <ChevronDown className="h-4 w-4" />
            </button>

            {exportOpen && data && chartData.length > 0 ? (
              <div className="absolute right-0 top-[calc(100%+0.5rem)] z-10 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-200/60">
                <button
                  onClick={downloadCsvReport}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4 text-blue-600" />
                  Download CSV
                </button>
                <button
                  onClick={downloadPdfReport}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <FileText className="h-4 w-4 text-emerald-600" />
                  Download PDF
                </button>
                <button
                  onClick={downloadBothReport}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <span className="flex h-4 w-4 items-center justify-center text-slate-400">+</span>
                  Download Both
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <span>Date Filter</span>
              <InfoTooltip
                label="Carbon date filter help"
                content="Choose a date range to show only the carbon records stored in the backend for that period."
              />
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {activeRange ? `Showing ${filteredCount} record${filteredCount === 1 ? "" : "s"} from ${activeRange.from} to ${activeRange.to}.` : "No carbon records available yet."}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto lg:min-w-[520px]">
            <div>
              <div className="text-[10px] font-semibold text-slate-500 mb-1">From</div>
              <input
                type="date"
                value={rangeDraft.from}
                min={data?.records[0]?.date}
                max={rangeDraft.to || data?.records[data.records.length - 1]?.date}
                onChange={(e) => setRangeDraft((current) => ({ ...current, from: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-500 mb-1">To</div>
              <input
                type="date"
                value={rangeDraft.to}
                min={rangeDraft.from || data?.records[0]?.date}
                max={data?.records[data.records.length - 1]?.date}
                onChange={(e) => setRangeDraft((current) => ({ ...current, to: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!defaultRange) return;
                  setRangeDraft(defaultRange);
                  setSelectedRange(defaultRange);
                }}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Recent
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!data?.records.length) return;
                  const nextRange = {
                    from: data.records[0].date,
                    to: data.records[data.records.length - 1].date,
                  };
                  setRangeDraft(nextRange);
                  setSelectedRange(nextRange);
                }}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                All
              </button>
            </div>
          </div>

          <div className="flex gap-2 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => {
                if (!rangeDraft.from || !rangeDraft.to || rangeDraft.from > rangeDraft.to) return;
                setSelectedRange(rangeDraft);
              }}
              className="rounded-xl bg-blue-600 text-white px-4 py-2 text-xs font-semibold shadow-lg shadow-blue-200/40 hover:bg-blue-700 transition disabled:opacity-60"
              disabled={!rangeDraft.from || !rangeDraft.to || rangeDraft.from > rangeDraft.to}
            >
              Apply Filter
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRange(defaultRange);
                if (defaultRange) setRangeDraft(defaultRange);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>
      </div> */}

      {/* KPI row */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading || !data ? (
          <>
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
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span>{k.title}</span>
                      <InfoTooltip label={`${k.title} help`} content={metricTooltip(k.title)} />
                    </div>
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
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <span>Carbon Emissions Trend</span>
          <InfoTooltip
            label="Carbon trend help"
            content="Each point is one carbon record from the backend. The chart updates with the selected date range."
          />
        </div>
        <div className="text-xs text-slate-400 mt-1">Trend is based on the selected backend records in the date filter above.</div>

        <div className="mt-4 h-[280px]">
          {isLoading || !data ? (
            <Skeleton className="h-full" />
          ) : chartData.length === 0 ? (
            <div className="h-full grid place-items-center text-xs text-slate-400">
              No carbon records found for the selected date range.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: 4, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="redFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip />
                <Area type="monotone" dataKey="actual" stroke="#ef4444" strokeWidth={2} fill="url(#redFill)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-2 text-center text-[11px] text-slate-500">
          <span className="text-red-500 font-medium">Actual Emissions (kg CO₂)</span>
        </div>
      </div>

      <Modal
        open={rangeOpen}
        title="Carbon Date Filter"
        onClose={() => setRangeOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setRangeOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
            <button
              onClick={() => {
                if (!rangeDraft.from || !rangeDraft.to || rangeDraft.from > rangeDraft.to) return;
                setSelectedRange(rangeDraft);
                setRangeOpen(false);
              }}
              disabled={!rangeDraft.from || !rangeDraft.to || rangeDraft.from > rangeDraft.to}
              className="rounded-xl bg-blue-600 text-white px-4 py-2 text-xs font-semibold shadow-lg shadow-blue-200/40 hover:bg-blue-700 transition disabled:opacity-60"
            >
              Apply
            </button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="text-xs text-slate-600">
            Pick a date range to show only the carbon records stored in the backend for that period.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-2">From</div>
              <input
                type="date"
                value={rangeDraft.from}
                min={data?.records[0]?.date}
                max={rangeDraft.to || data?.records[data.records.length - 1]?.date}
                onChange={(e) => setRangeDraft((current) => ({ ...current, from: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-2">To</div>
              <input
                type="date"
                value={rangeDraft.to}
                min={rangeDraft.from || data?.records[0]?.date}
                max={data?.records[data.records.length - 1]?.date}
                onChange={(e) => setRangeDraft((current) => ({ ...current, to: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (!defaultRange) return;
                setRangeDraft(defaultRange);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Recent 6 records
            </button>
            <button
              type="button"
              onClick={() => {
                if (!data?.records.length) return;
                setRangeDraft({ from: data.records[0].date, to: data.records[data.records.length - 1].date });
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              All records
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
