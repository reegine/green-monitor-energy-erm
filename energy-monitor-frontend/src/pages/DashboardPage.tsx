    import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import StatCard from "../components/StatCard";
import Skeleton from "../components/Skeleton";
import AlertCard from "../components/AlertCard";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Bolt, TrendingUp, CloudSun, Clock3 } from "lucide-react";

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.getDashboard,
    refetchInterval: 5000, // simulasi auto-update dari IoT
  });

  if (error) {
    return <div className="text-sm text-red-600">Failed to load dashboard data.</div>;
  }

  return (
    <div>
      <div className="bg-sky-50/50 border border-slate-200 rounded-2xl px-5 sm:px-7 py-6">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <div className="text-xs text-slate-500 mt-1">Real-time energy monitoring for CSL Building</div>

        {/* KPI row */}
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
                title="Current Power Usage"
                value={`${data.kpis.currentPowerUsage.value} ${data.kpis.currentPowerUsage.unit}`}
                icon={<Bolt className="h-4 w-4 text-blue-600" />}
                iconBg="bg-blue-50"
              />
              <StatCard
                title="Today's Consumption"
                value={`${data.kpis.todaysConsumption.value.toLocaleString()} ${data.kpis.todaysConsumption.unit}`}
                sub={data.kpis.todaysConsumption.deltaText}
                subTone={data.kpis.todaysConsumption.deltaTone === "up" ? "up" : "muted"}
                icon={<TrendingUp className="h-4 w-4 text-orange-600" />}
                iconBg="bg-orange-50"
              />
              <StatCard
                title="Carbon Emissions"
                value={`${data.kpis.carbonEmissions.value} ${data.kpis.carbonEmissions.unit}`}
                sub={data.kpis.carbonEmissions.deltaText}
                subTone={data.kpis.carbonEmissions.deltaTone === "down" ? "down" : "muted"}
                icon={<CloudSun className="h-4 w-4 text-cyan-600" />}
                iconBg="bg-cyan-50"
              />
            </>
          )}
        </div>

        {/* Main row */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr] gap-4">
          {/* Chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">Real-time Energy Consumption</div>
                <div className="text-xs text-slate-400 mt-1">Last 24 hours</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock3 className="h-4 w-4" />
                Live
              </div>
            </div>

            <div className="mt-4 h-[260px]">
              {isLoading || !data ? (
                <Skeleton className="h-full" />
              ) : data.realtimeSeries.length === 0 ? (
                <div className="h-full grid place-items-center text-xs text-slate-400">
                  No real-time readings available yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.realtimeSeries} margin={{ left: 4, right: 10, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="blueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fill="url(#blueFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Alert preview */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Alert Notifications</div>
              <div className="text-xs text-orange-500">⚠</div>
            </div>

            <div className="mt-4 space-y-3">
              {isLoading || !data ? (
                <>
                  <Skeleton className="h-[92px]" />
                  <Skeleton className="h-[92px]" />
                  <Skeleton className="h-[92px]" />
                </>
              ) : data.alertsPreview.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                  No alerts for now.
                </div>
              ) : (
                data.alertsPreview.map((a, idx) => (
                  <AlertCard key={idx} title={a.title} subtitle={a.subtitle} timeAgo={a.timeAgo} severity={a.severity} />
                ))
              )}
            </div>

            <div className="mt-4 text-center">
              <a href="/alerts" className="text-xs text-blue-600 hover:underline">
                View All Alerts
              </a>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-sm font-semibold">This Month's Usage</div>
            <div className="text-xs text-slate-400 mt-1">Total Consumption</div>

            {isLoading || !data ? (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            ) : (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div>{data.monthUsage.totalConsumptionLabel}</div>
                  <div className="font-semibold text-slate-700">{data.monthUsage.totalConsumptionValue}</div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <div>{data.monthUsage.budgetUsageLabel}</div>
                  <div className="font-semibold text-orange-600">{data.monthUsage.budgetPercent}%</div>
                </div>

                <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full"
                    style={{ width: `${data.monthUsage.budgetPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-sm font-semibold">Peak Hours Today</div>
            <div className="mt-4 space-y-3 text-xs">
              {isLoading || !data ? (
                <>
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/2" />
                </>
              ) : (
                <>
                  <div className="flex justify-between text-slate-500">
                    <span>Peak Time</span>
                    <span className="font-semibold text-slate-700">{data.peakHours.peakTime}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Peak Usage</span>
                    <span className="font-semibold text-slate-700">{data.peakHours.peakUsage}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Average</span>
                    <span className="font-semibold text-slate-700">{data.peakHours.average}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}