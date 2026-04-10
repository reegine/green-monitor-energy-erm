import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import Skeleton from "../components/Skeleton";
import clsx from "clsx";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function ToneCard({ title, subtitle, tone }: { title: string; subtitle: string; tone: "blue" | "orange" | "purple" | "indigo" }) {
  const border =
    tone === "blue"
      ? "border-blue-200 bg-blue-50/40"
      : tone === "orange"
      ? "border-orange-200 bg-orange-50/40"
      : tone === "purple"
      ? "border-purple-200 bg-purple-50/40"
      : "border-indigo-200 bg-indigo-50/40";

  return (
    <div className={clsx("rounded-2xl border p-4", border)}>
      <div className="text-xs font-semibold text-slate-800">{title}</div>
      <div className="text-[11px] text-slate-500 mt-1">{subtitle}</div>
    </div>
  );
}

export default function ForecastPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["forecast"], queryFn: api.getForecast });

  if (error) return <div className="text-sm text-red-600">Failed to load forecast data.</div>;

  return (
    <div className="bg-sky-50/50 border border-slate-200 rounded-2xl px-5 sm:px-7 py-6">
      <h2 className="text-2xl font-semibold">ML Predictions &amp; Insights</h2>
      <div className="text-xs text-slate-500 mt-1">AI-powered forecasting and anomaly detection</div>

      {/* insight row */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {isLoading || !data ? (
          <>
            <Skeleton className="h-[74px]" />
            <Skeleton className="h-[74px]" />
            <Skeleton className="h-[74px]" />
            <Skeleton className="h-[74px]" />
          </>
        ) : (
          data.insightCards.map((c, i) => <ToneCard key={i} title={c.title} subtitle={c.subtitle} tone={c.tone} />)
        )}
      </div>

      {/* big chart */}
      <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="text-sm font-semibold">10-Day Energy Consumption Forecast</div>
        <div className="text-xs text-slate-400 mt-1">Predicted vs actual consumption with confidence intervals</div>

        <div className="mt-4 h-[280px]">
          {isLoading || !data ? (
            <Skeleton className="h-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.forecastSeries} margin={{ left: 4, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip />
                <Line type="monotone" dataKey="actual" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="predicted" stroke="#2563eb" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-2 text-center text-[11px] text-slate-400">
          <span className="text-blue-600 font-medium">Actual</span> &nbsp;•&nbsp; <span className="text-blue-600 font-medium">Predicted</span>
        </div>
      </div>

      {/* mid row */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-sm font-semibold">Anomaly Detection</div>
          <div className="text-xs text-slate-400 mt-1">Real-time unusual consumption pattern detection</div>

          <div className="mt-4 h-[220px]">
            {isLoading || !data ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.anomalySeries} margin={{ left: 4, right: 10, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="anFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} fill="url(#anFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-2 text-center text-[11px] text-blue-600">Normal Range</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-sm font-semibold">Trend Analysis</div>
          <div className="mt-4 space-y-3">
            {isLoading || !data ? (
              <>
                <Skeleton className="h-[64px]" />
                <Skeleton className="h-[64px]" />
                <Skeleton className="h-[64px]" />
              </>
            ) : (
              data.trends.map((t, i) => (
                <div key={i} className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-700">{t.title}</div>
                    <div className="text-[11px] text-slate-500 mt-1">{t.subtitle}</div>
                  </div>
                  <div
                    className={clsx(
                      "text-xs font-semibold",
                      t.tone === "down" ? "text-emerald-600" : t.tone === "neutral" ? "text-blue-600" : "text-slate-600"
                    )}
                  >
                    {t.delta}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* recommendations */}
      <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="text-sm font-semibold">Optimized Recommendations</div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {isLoading || !data ? (
            <>
              <Skeleton className="h-[90px]" />
              <Skeleton className="h-[90px]" />
              <Skeleton className="h-[90px]" />
              <Skeleton className="h-[90px]" />
            </>
          ) : (
            data.recommendations.map((r, i) => (
              <div key={i} className="rounded-2xl border border-blue-100 bg-blue-50/25 p-4">
                <div className="text-xs font-semibold text-slate-800">{r.title}</div>
                <div className="text-[11px] text-slate-500 mt-1">{r.subtitle}</div>
                <div className="text-[10px] text-blue-600 font-semibold mt-3">{r.saving}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}