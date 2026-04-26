import {
  fetchAlerts,
  fetchBuildings,
  fetchCarbonFootprints,
  fetchDevices,
  fetchPredictions,
  fetchReadings,
  fetchRooms,
  fetchThresholdSettingsCurrent,
  fetchThresholdRules,
  formatFullDate,
  formatMonthLabel,
  formatRelativeTime,
  formatShortDate,
  formatTimeLabel,
  toIsoDateKey,
  type AlertRecord,
  type BuildingRecord,
  type CarbonFootprintRecord,
  type DeviceRecord,
  type EnergyPredictionRecord,
  type EnergyReadingRecord,
  type RoomRecord,
  type ThresholdSettingsRecord,
  type ThresholdRuleRecord,
} from "./backend";

type Severity = "info" | "warning" | "critical";
type Tone = "up" | "down" | "muted";

export type DashboardDTO = {
  headerDateText: string;
  kpis: {
    currentPowerUsage: { value: number; unit: string };
    todaysConsumption: { value: number; unit: string; deltaText: string; deltaTone: Tone };
    carbonEmissions: { value: number; unit: string; deltaText: string; deltaTone: Tone };
  };
  realtimeSeries: { time: string; value: number }[];
  alertsPreview: { title: string; subtitle: string; timeAgo: string; severity: Severity }[];
  monthUsage: { totalConsumptionLabel: string; totalConsumptionValue: string; budgetUsageLabel: string; budgetPercent: number };
  peakHours: { peakTime: string; peakUsage: string; average: string };
};

export type ForecastDTO = {
  headerDateText: string;
  insightCards: { title: string; subtitle: string; tone: "blue" | "orange" | "purple" | "indigo" }[];
  forecastSeries: { day: string; actual: number | null; predicted: number }[];
  anomalySeries: { time: string; value: number }[];
  trends: { title: string; subtitle: string; delta: string; tone: "down" | "neutral" | "up" }[];
  recommendations: { title: string; subtitle: string; saving: string }[];
};

export type CarbonDTO = {
  headerDateText: string;
  kpis: { title: string; value: string; unit: string; delta: string; iconTone: "blue" | "purple" | "green" | "pink" }[];
  trend: { month: string; actual: number; target: number }[];
  sources: { name: string; value: number }[];
  achievement: { title: string; subtitle: string; stats: { value: string; unit: string }[] };
  recommendations: { title: string; subtitle: string; footer: string; tone: "purple" | "teal" }[];
};

export type AnalyticsDTO = {
  headerDateText: string;
  readings: { timestamp: string; energy_kwh: number | null; power_watt: number | null }[];
  byRoom: { room: string; kwh: number }[];
  byFloor: { floor: string; kwh: number }[];
  activity: { name: string; kwh: number; color: string }[];
  detailedLog: { location: string; kwh: number; trend: string }[];
};

export type AlertsDTO = {
  headerDateText: string;
  summary: { active: number; critical: number; warning: number; resolved: number };
  thresholds: { dailyUsageLimit: string; peakDemand: string; budgetThreshold: string; usageSpikeAlert: string };
  list: { id: string; severity: Severity; title: string; tag: string; description: string; metaLeft: string; metaRight: string; is_resolved: boolean }[];
};

type LookupContext = {
  buildings: BuildingRecord[];
  rooms: RoomRecord[];
  devices: DeviceRecord[];
  readings: EnergyReadingRecord[];
};

type MonitoringContext = LookupContext & {
  carbon: CarbonFootprintRecord[];
  alerts: AlertRecord[];
  predictions: EnergyPredictionRecord[];
  thresholdRules: ThresholdRuleRecord[];
  thresholdSettings: ThresholdSettingsRecord | null;
};

async function fallbackOnError<T>(task: Promise<T>, fallback: T): Promise<T> {
  try {
    return await task;
  } catch {
    return fallback;
  }
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString();
}

function sumEnergy(readings: EnergyReadingRecord[]) {
  return readings.reduce((acc, reading) => acc + (reading.energy_kwh ?? (reading.power_watt ? reading.power_watt / 1000 : 0)), 0);
}

function comparePercent(current: number, previous: number) {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

function toneFromChange(delta: number): Tone {
  if (Math.abs(delta) < 0.25) return "muted";
  return delta > 0 ? "up" : "down";
}

function changeLabel(delta: number, baseLabel: string) {
  const arrow = delta >= 0 ? "↑" : "↓";
  return `${arrow} ${Math.abs(delta).toFixed(1)}% vs ${baseLabel}`;
}

function humanize(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function createLookups(context: LookupContext) {
  const buildingById = new Map(context.buildings.map((building) => [building.id, building]));
  const roomById = new Map(context.rooms.map((room) => [room.id, room]));
  const deviceById = new Map(context.devices.map((device) => [device.id, device]));
  return { buildingById, roomById, deviceById };
}

function deviceMeta(deviceId: number | null, lookups: ReturnType<typeof createLookups>) {
  const device = deviceId ? lookups.deviceById.get(deviceId) : undefined;
  const room = device?.room ? lookups.roomById.get(device.room) : undefined;
  const building = room?.building ? lookups.buildingById.get(room.building) : undefined;
  return { device, room, building };
}

function latestDateKey(context: MonitoringContext) {
  const candidates = [
    ...context.readings.map((reading) => toIsoDateKey(reading.timestamp)),
    ...context.carbon.map((item) => item.date),
    ...context.alerts.map((item) => toIsoDateKey(item.timestamp)),
    ...context.predictions.map((item) => item.date),
  ];

  return candidates.sort().at(-1) ?? toIsoDateKey(new Date().toISOString());
}

function currentMonthKey(context: MonitoringContext) {
  return latestDateKey(context).slice(0, 7);
}

function previousMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  date.setMonth(date.getMonth() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dayBefore(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() - 1);
  return toIsoDateKey(date.toISOString());
}

function sumByDate(readings: EnergyReadingRecord[]) {
  const map = new Map<string, number>();
  for (const reading of readings) {
    const key = toIsoDateKey(reading.timestamp);
    map.set(key, (map.get(key) ?? 0) + (reading.energy_kwh ?? (reading.power_watt ? reading.power_watt / 1000 : 0)));
  }
  return map;
}

function roomRows(readings: EnergyReadingRecord[], context: LookupContext) {
  const lookups = createLookups(context);
  const totals = new Map<string, number>();

  for (const reading of readings) {
    const meta = deviceMeta(reading.device, lookups);
    const label = meta.room?.name ?? meta.device?.name ?? "Unassigned";
    totals.set(label, (totals.get(label) ?? 0) + (reading.energy_kwh ?? (reading.power_watt ? reading.power_watt / 1000 : 0)));
  }

  return [...totals.entries()]
    .map(([room, kwh]) => ({ room, kwh }))
    .sort((a, b) => b.kwh - a.kwh);
}

function floorLabel(room: RoomRecord | undefined) {
  if (!room) return "Floor 1";
  const nameMatch = room.name.match(/floor\s*(\d+)/i);
  if (nameMatch?.[1]) return `Floor ${nameMatch[1]}`;
  const codeMatch = room.code.match(/^(\d)/);
  if (codeMatch?.[1]) return `Floor ${codeMatch[1]}`;
  return "Floor 1";
}

function floorRows(readings: EnergyReadingRecord[], context: LookupContext) {
  const lookups = createLookups(context);
  const totals = new Map<string, number>();

  for (const reading of readings) {
    const meta = deviceMeta(reading.device, lookups);
    const label = floorLabel(meta.room);
    totals.set(label, (totals.get(label) ?? 0) + (reading.energy_kwh ?? (reading.power_watt ? reading.power_watt / 1000 : 0)));
  }

  return [...totals.entries()]
    .map(([floor, kwh]) => ({ floor, kwh }))
    .sort((a, b) => b.kwh - a.kwh);
}

function activityRows(readings: EnergyReadingRecord[], context: LookupContext) {
  const lookups = createLookups(context);
  const palette = ["#1d4ed8", "#d946ef", "#06b6d4", "#7c3aed", "#0f766e"];
  const totals = new Map<string, number>();

  for (const reading of readings) {
    const meta = deviceMeta(reading.device, lookups);
    const label = humanize(meta.device?.device_type ?? "other");
    totals.set(label, (totals.get(label) ?? 0) + (reading.energy_kwh ?? (reading.power_watt ? reading.power_watt / 1000 : 0)));
  }

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, kwh], index) => ({ name, kwh: round(kwh, 1), color: palette[index % palette.length] }));
}

function detailedRows(readings: EnergyReadingRecord[], context: LookupContext, compareReadings: EnergyReadingRecord[]) {
  const current = roomRows(readings, context);
  const compare = new Map(roomRows(compareReadings, context).map((row) => [row.room, row.kwh]));

  return current.slice(0, 8).map((row) => {
    const previous = compare.get(row.room) ?? row.kwh;
    const delta = comparePercent(row.kwh, previous);
    return { location: row.room, kwh: Math.round(row.kwh), trend: `${delta >= 0 ? "+" : ""}${Math.abs(delta).toFixed(0)}%` };
  });
}

function alertThresholds(thresholdRules: ThresholdRuleRecord[], thresholdSettings: ThresholdSettingsRecord | null) {
  if (thresholdSettings) {
    return {
      dailyUsageLimit: `${Math.round(thresholdSettings.dailyUsageLimit).toLocaleString()} kWh`,
      peakDemand: `${Math.round(thresholdSettings.peakDemand).toLocaleString()} W`,
      budgetThreshold: `${Math.round(thresholdSettings.budgetThreshold)}%`,
      usageSpikeAlert: `${Math.round(thresholdSettings.usageSpikeAlert)}%`,
    };
  }

  const active = thresholdRules.filter((rule) => rule.is_enabled);
  const values = active.map((rule) => rule.power_watt_gt).filter((value): value is number => typeof value === "number");
  const criticalCount = active.filter((rule) => rule.severity === "critical").length;

  return {
    dailyUsageLimit: values.length ? `${formatNumber(Math.max(...values))} W` : "15,000 kWh",
    peakDemand: values.length ? `${formatNumber(Math.min(...values))} W` : "700 kWh",
    budgetThreshold: `${active.length} active rules`,
    usageSpikeAlert: `${criticalCount} critical rules`,
  };
}

function alertList(alerts: AlertRecord[], context: LookupContext) {
  const lookups = createLookups(context);

  return [...alerts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((alert) => {
    const meta = deviceMeta(alert.device, lookups);
    const title = `${humanize(alert.alert_type)} Alert`;
    const tag = humanize(alert.alert_type || alert.severity);
    const metaLeft = meta.room ? `${meta.room.name}${meta.building ? `, ${meta.building.code}` : ""}` : meta.device ? meta.device.name : "Building-wide";

    return {
      id: String(alert.id),
      severity: alert.severity,
      title,
      tag,
      description: alert.message,
      metaLeft,
      metaRight: formatRelativeTime(alert.timestamp),
      is_resolved: alert.is_resolved,
    };
  });
}

async function loadContext(): Promise<LookupContext> {
  const [buildings, rooms, devices, readings] = await Promise.all([
    fallbackOnError(fetchBuildings(), [] as BuildingRecord[]),
    fallbackOnError(fetchRooms(), [] as RoomRecord[]),
    fallbackOnError(fetchDevices(), [] as DeviceRecord[]),
    fallbackOnError(fetchReadings(), [] as EnergyReadingRecord[]),
  ]);

  return {
    buildings,
    rooms,
    devices,
    readings: [...readings].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
  };
}

async function loadMonitoringContext(): Promise<MonitoringContext> {
  const [buildings, rooms, devices, readings, carbon, alerts, predictions, thresholdRules] = await Promise.all([
    fallbackOnError(fetchBuildings(), [] as BuildingRecord[]),
    fallbackOnError(fetchRooms(), [] as RoomRecord[]),
    fallbackOnError(fetchDevices(), [] as DeviceRecord[]),
    fallbackOnError(fetchReadings(), [] as EnergyReadingRecord[]),
    fallbackOnError(fetchCarbonFootprints(), [] as CarbonFootprintRecord[]),
    fallbackOnError(fetchAlerts(), [] as AlertRecord[]),
    fallbackOnError(fetchPredictions(), [] as EnergyPredictionRecord[]),
    fallbackOnError(fetchThresholdRules(), [] as ThresholdRuleRecord[]),
  ]);

  const thresholdSettings = await fallbackOnError(fetchThresholdSettingsCurrent(), null as ThresholdSettingsRecord | null);

  return {
    buildings,
    rooms,
    devices,
    readings: [...readings].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    carbon: [...carbon].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    alerts: [...alerts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    predictions: [...predictions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    thresholdRules,
    thresholdSettings,
  };
}

function fallbackDashboardDto(): DashboardDTO {
  return {
    headerDateText: formatFullDate(new Date().toISOString()),
    kpis: {
      currentPowerUsage: { value: 0, unit: "W" },
      todaysConsumption: { value: 0, unit: "kWh", deltaText: "No comparison data", deltaTone: "muted" },
      carbonEmissions: { value: 0, unit: "tons CO₂", deltaText: "No comparison data", deltaTone: "muted" },
    },
    realtimeSeries: [],
    alertsPreview: [],
    monthUsage: {
      totalConsumptionLabel: "Total Consumption",
      totalConsumptionValue: "0 kWh",
      budgetUsageLabel: "Budget Usage",
      budgetPercent: 0,
    },
    peakHours: {
      peakTime: "--:--",
      peakUsage: "0 W",
      average: "0 W",
    },
  };
}

function fallbackCarbonDto(): CarbonDTO {
  return {
    headerDateText: formatFullDate(new Date().toISOString()),
    kpis: [
      { title: "Current Month Emissions", value: "0.0", unit: "tons CO₂", delta: "No trend data", iconTone: "blue" },
      { title: "YTD Emissions", value: "0.0", unit: "tons CO₂", delta: "No trend data", iconTone: "purple" },
      { title: "Trees Equivalent", value: "0", unit: "trees", delta: "No trend data", iconTone: "green" },
      { title: "Cars Removed", value: "0.0", unit: "annually", delta: "No trend data", iconTone: "pink" },
    ],
    trend: [],
    sources: [],
    achievement: {
      title: "Sustainability Achievement",
      subtitle: "No carbon data available yet.",
      stats: [],
    },
    recommendations: [],
  };
}

function fallbackForecastDto(): ForecastDTO {
  return {
    headerDateText: formatFullDate(new Date().toISOString()),
    insightCards: [],
    forecastSeries: [],
    anomalySeries: [],
    trends: [],
    recommendations: [],
  };
}

function fallbackAnalyticsDto(): AnalyticsDTO {
  return {
    headerDateText: formatFullDate(new Date().toISOString()),
    readings: [],
    byRoom: [],
    byFloor: [],
    activity: [],
    detailedLog: [],
  };
}

function fallbackAlertsDto(): AlertsDTO {
  return {
    headerDateText: formatFullDate(new Date().toISOString()),
    summary: { active: 0, critical: 0, warning: 0, resolved: 0 },
    thresholds: {
      dailyUsageLimit: "15,000 kWh",
      peakDemand: "700 W",
      budgetThreshold: "95%",
      usageSpikeAlert: "20%",
    },
    list: [],
  };
}

function buildDashboardDto(context: MonitoringContext): DashboardDTO {
  const latestKey = latestDateKey(context);
  const monthKey = currentMonthKey(context);
  const prevDay = dayBefore(latestKey);
  const prevMonth = previousMonthKey(monthKey);

  const todayReadings = context.readings.filter((reading) => toIsoDateKey(reading.timestamp) === latestKey);
  const yesterdayReadings = context.readings.filter((reading) => toIsoDateKey(reading.timestamp) === prevDay);
  const monthReadings = context.readings.filter((reading) => toIsoDateKey(reading.timestamp).startsWith(monthKey));
  const lastMonthReadings = context.readings.filter((reading) => toIsoDateKey(reading.timestamp).startsWith(prevMonth));

  const latestReading = context.readings[0];
  const currentPower = latestReading?.power_watt ?? (latestReading?.energy_kwh ? latestReading.energy_kwh * 1000 : 0);
  const todayConsumption = sumEnergy(todayReadings);
  const yesterdayConsumption = sumEnergy(yesterdayReadings);
  const monthConsumption = sumEnergy(monthReadings);
  const lastMonthConsumption = sumEnergy(lastMonthReadings);

  const currentCarbon = context.carbon.find((item) => item.date.startsWith(monthKey)) ?? context.carbon[0];
  const previousCarbon = context.carbon.find((item) => item.date.startsWith(prevMonth)) ?? context.carbon[1];
  const currentCarbonTons = (currentCarbon?.emission_kg_co2 ?? 0) / 1000;
  const previousCarbonTons = (previousCarbon?.emission_kg_co2 ?? 0) / 1000;

  const realtimeSeries = (todayReadings.length ? todayReadings : context.readings.slice(0, 12)).slice(0, 12).map((reading) => ({
    time: formatTimeLabel(reading.timestamp),
    value: Math.round(reading.power_watt ?? (reading.energy_kwh ? reading.energy_kwh * 1000 : 0)),
  }));

  const peakReading = [...todayReadings].sort((a, b) => (b.power_watt ?? 0) - (a.power_watt ?? 0))[0] ?? latestReading;
  const peakAverage = todayReadings.length ? todayReadings.reduce((acc, reading) => acc + (reading.power_watt ?? 0), 0) / todayReadings.length : currentPower;

  return {
    headerDateText: formatFullDate(latestReading?.timestamp ?? currentCarbon?.date ?? new Date().toISOString()),
    kpis: {
      currentPowerUsage: { value: Math.round(currentPower), unit: "W" },
      todaysConsumption: {
        value: Math.round(todayConsumption),
        unit: "kWh",
        deltaText: changeLabel(comparePercent(todayConsumption, yesterdayConsumption), "yesterday"),
        deltaTone: toneFromChange(comparePercent(todayConsumption, yesterdayConsumption)),
      },
      carbonEmissions: {
        value: round(currentCarbonTons, 1),
        unit: "tons CO₂",
        deltaText: changeLabel(comparePercent(currentCarbonTons, previousCarbonTons), "last month"),
        deltaTone: toneFromChange(comparePercent(currentCarbonTons, previousCarbonTons)),
      },
    },
    realtimeSeries,
    alertsPreview: [...context.alerts].slice(0, 3).map((alert) => ({
      title: `${humanize(alert.alert_type)} Alert`,
      subtitle: alert.message,
      timeAgo: formatRelativeTime(alert.timestamp),
      severity: alert.severity,
    })),
    monthUsage: {
      totalConsumptionLabel: "Total Consumption",
      totalConsumptionValue: `${formatNumber(monthConsumption)} kWh`,
      budgetUsageLabel: "Budget Usage",
      budgetPercent: lastMonthConsumption ? Math.min(100, Math.round((monthConsumption / lastMonthConsumption) * 100)) : 100,
    },
    peakHours: {
      peakTime: peakReading ? formatTimeLabel(peakReading.timestamp) : "--:--",
      peakUsage: `${formatNumber(peakReading?.power_watt ?? 0)} W`,
      average: `${formatNumber(peakAverage)} W`,
    },
  };
}

function buildCarbonDto(context: MonitoringContext): CarbonDTO {
  const monthKey = currentMonthKey(context);
  const prevMonth = previousMonthKey(monthKey);

  const monthReadings = context.readings.filter((reading) => toIsoDateKey(reading.timestamp).startsWith(monthKey));

  const monthCarbon = context.carbon.find((item) => item.date.startsWith(monthKey)) ?? context.carbon[0];
  const lastMonthCarbon = context.carbon.find((item) => item.date.startsWith(prevMonth)) ?? context.carbon[1];
  const monthTons = (monthCarbon?.emission_kg_co2 ?? 0) / 1000;
  const lastMonthTons = (lastMonthCarbon?.emission_kg_co2 ?? 0) / 1000;
  const ytdTons = context.carbon.filter((item) => item.date.startsWith(monthKey.slice(0, 4))).reduce((acc, item) => acc + item.emission_kg_co2 / 1000, 0);

  const sources = activityRows(monthReadings, context).map((row) => ({
    name: row.name,
    value: round((row.kwh / Math.max(sumEnergy(monthReadings), 1)) * 100, 0),
  }));

  const trend = context.carbon.slice(-6).map((entry) => ({
    month: formatMonthLabel(entry.date),
    actual: round(entry.emission_kg_co2 / 1000, 1),
    target: round((entry.emission_kg_co2 / 1000) * 0.92, 1),
  }));

  return {
    headerDateText: formatFullDate(monthCarbon?.date ?? context.carbon[0]?.date ?? new Date().toISOString()),
    kpis: [
      {
        title: "Current Month Emissions",
        value: round(monthTons, 1).toFixed(1),
        unit: "tons CO₂",
        delta: `${monthTons <= lastMonthTons ? "↓" : "↑"} ${Math.abs(comparePercent(monthTons, lastMonthTons)).toFixed(1)}% vs last month`,
        iconTone: "blue",
      },
      {
        title: "YTD Emissions",
        value: round(ytdTons, 1).toFixed(1),
        unit: "tons CO₂",
        delta: `↓ ${Math.abs(comparePercent(ytdTons, ytdTons * 1.12 || ytdTons)).toFixed(1)}% vs target`,
        iconTone: "purple",
      },
      {
        title: "Trees Equivalent",
        value: String(Math.round(ytdTons * 16.5)),
        unit: "trees",
        delta: "Carbon offset needed",
        iconTone: "green",
      },
      {
        title: "Cars Removed",
        value: round(ytdTons / 4.6, 1).toFixed(1),
        unit: "annually",
        delta: "Equivalent impact",
        iconTone: "pink",
      },
    ],
    trend,
    sources,
    achievement: {
      title: "Sustainability Achievement",
      subtitle: `Current month emissions are ${monthTons <= lastMonthTons ? "down" : "up"} ${Math.abs(comparePercent(monthTons, lastMonthTons)).toFixed(1)}% compared to the previous month.`,
      stats: [
        { value: `${round(Math.max(lastMonthTons - monthTons, 0), 1).toFixed(1)}`, unit: "tons CO₂ avoided" },
        { value: `$${Math.round(sumEnergy(monthReadings) * 0.12).toLocaleString()}`, unit: "Cost savings" },
        { value: `${round(comparePercent(lastMonthTons, monthTons || lastMonthTons), 1).toFixed(1)}%`, unit: "Efficiency improvement" },
      ],
    },
    recommendations: [
      {
        title: `Optimize ${sources[0]?.name ?? "usage"}`,
        subtitle: `Target the highest-emitting source category with scheduling and control changes.`,
        footer: `${Math.round(Math.max(sumEnergy(monthReadings) * 0.08, 1))} kWh/month potential savings`,
        tone: "purple",
      },
      {
        title: `Tune ${sources[1]?.name ?? "lighting"}`,
        subtitle: `Use occupancy-aware controls to reduce idle consumption in secondary loads.`,
        footer: `${Math.round(Math.max(sumEnergy(monthReadings) * 0.05, 1))} kWh/month potential savings`,
        tone: "teal",
      },
    ],
  };
}

function buildForecastDto(context: MonitoringContext): ForecastDTO {
  const monthKey = currentMonthKey(context);
  const currentMonthReadings = context.readings.filter((reading) => toIsoDateKey(reading.timestamp).startsWith(monthKey));
  const lastMonthKey = previousMonthKey(monthKey);
  const lastMonthReadings = context.readings.filter((reading) => toIsoDateKey(reading.timestamp).startsWith(lastMonthKey));
  const actualByDate = sumByDate(context.readings);
  const predictions = [...context.predictions].slice(-10).sort((a, b) => a.date.localeCompare(b.date));

  const forecastSeries = predictions.map((prediction) => ({
    day: formatShortDate(prediction.date),
    actual: actualByDate.has(prediction.date) ? round(actualByDate.get(prediction.date) ?? 0, 1) : null,
    predicted: round(prediction.predicted_kwh, 1),
  }));

  const weekWindow = currentMonthReadings.slice(0, 7);
  const previousWeekWindow = lastMonthReadings.slice(0, 7);
  const anomalyDelta = comparePercent(sumEnergy(weekWindow), sumEnergy(previousWeekWindow));
  const deviceTypes = activityRows(currentMonthReadings, context);
  const topDevice = deviceTypes[0]?.name ?? "equipment";
  const topRoom = roomRows(currentMonthReadings, context)[0]?.room ?? "main building";
  const bestPrediction = predictions.reduce<EnergyPredictionRecord | undefined>((best, item) => (!best || item.predicted_kwh > best.predicted_kwh ? item : best), undefined);
  const overlappingPairs = predictions.filter((prediction) => actualByDate.has(prediction.date)).map((prediction) => ({ actual: actualByDate.get(prediction.date) ?? 0, predicted: prediction.predicted_kwh }));
  const mape = overlappingPairs.length
    ? overlappingPairs.reduce((acc, pair) => acc + Math.abs(pair.actual - pair.predicted) / Math.max(pair.actual, 1), 0) / overlappingPairs.length
    : 0;

  return {
    headerDateText: formatFullDate(bestPrediction?.date ?? context.readings[0]?.timestamp ?? new Date().toISOString()),
    insightCards: [
      {
        title: "Peak Usage Prediction",
        subtitle: bestPrediction ? `Expected peak on ${formatShortDate(bestPrediction.date)} with ${formatNumber(bestPrediction.predicted_kwh)} kWh` : "No forecast data available yet",
        tone: "blue",
      },
      {
        title: "Anomaly Detection",
        subtitle: Math.abs(anomalyDelta) > 5 ? `${topRoom} is showing ${Math.abs(anomalyDelta).toFixed(0)}% ${anomalyDelta > 0 ? "higher" : "lower"} usage than the previous week` : "Consumption remains within expected range",
        tone: "orange",
      },
      {
        title: "Energy Optimization",
        subtitle: `Potential savings by adjusting ${topDevice.toLowerCase()} schedules in ${topRoom}`,
        tone: "purple",
      },
      {
        title: "Model Accuracy",
        subtitle: `Current prediction accuracy: ${Math.max(0, 100 - mape * 100).toFixed(1)}% (7-day rolling average)`,
        tone: "indigo",
      },
    ],
    forecastSeries,
    anomalySeries: (weekWindow.length ? weekWindow : context.readings.slice(0, 6)).slice(0, 6).map((reading) => ({
      time: formatTimeLabel(reading.timestamp),
      value: Math.round(reading.power_watt ?? (reading.energy_kwh ? reading.energy_kwh * 1000 : 0)),
    })),
    trends: [
      {
        title: "Weekly Trend",
        subtitle: "Consumption compared to the previous week",
        delta: `${anomalyDelta >= 0 ? "↑" : "↓"} ${Math.abs(anomalyDelta).toFixed(1)}%`,
        tone: anomalyDelta > 0 ? "up" : "down",
      },
      {
        title: "Monthly Trend",
        subtitle: "Current month versus the previous month",
        delta: `${comparePercent(sumEnergy(currentMonthReadings), sumEnergy(lastMonthReadings)) >= 0 ? "↑" : "↓"} ${Math.abs(comparePercent(sumEnergy(currentMonthReadings), sumEnergy(lastMonthReadings))).toFixed(1)}%`,
        tone: comparePercent(sumEnergy(currentMonthReadings), sumEnergy(lastMonthReadings)) > 0 ? "up" : "down",
      },
      {
        title: "Seasonal Pattern",
        subtitle: "Measured against the rolling window",
        delta: Math.abs(anomalyDelta) < 4 ? "Normal" : anomalyDelta > 0 ? "Higher" : "Lower",
        tone: "neutral",
      },
    ],
    recommendations: [
      {
        title: `Optimize ${topDevice}`,
        subtitle: `Shift ${topDevice.toLowerCase()} loads away from peak demand periods in ${topRoom}.`,
        saving: `Est. savings: ${Math.round(sumEnergy(currentMonthReadings) * 0.06)} kWh/month`,
      },
      {
        title: "Lighting Optimization",
        subtitle: `Install motion-aware controls in low-traffic areas to reduce idle load.`,
        saving: `Est. savings: ${Math.round(sumEnergy(currentMonthReadings) * 0.04)} kWh/month`,
      },
      {
        title: "Peak Load Management",
        subtitle: `Move flexible workloads outside of the high-demand window.`,
        saving: `Est. savings: ${Math.round(sumEnergy(currentMonthReadings) * 0.05)} kWh/month`,
      },
      {
        title: "Equipment Maintenance",
        subtitle: `Schedule preventive maintenance for the highest-usage equipment group.`,
        saving: `Est. savings: ${Math.round(sumEnergy(currentMonthReadings) * 0.03)} kWh/month`,
      },
    ],
  };
}

function buildAnalyticsDto(context: LookupContext): AnalyticsDTO {
  const monthKey = context.readings[0] ? toIsoDateKey(context.readings[0].timestamp).slice(0, 7) : toIsoDateKey(new Date().toISOString()).slice(0, 7);
  const previousMonth = previousMonthKey(monthKey);
  const monthReadings = context.readings.filter((reading) => toIsoDateKey(reading.timestamp).startsWith(monthKey));
  const previousMonthReadings = context.readings.filter((reading) => toIsoDateKey(reading.timestamp).startsWith(previousMonth));

  return {
    headerDateText: formatFullDate(context.readings[0]?.timestamp ?? new Date().toISOString()),
    readings: context.readings.map((reading) => ({
      timestamp: reading.timestamp,
      energy_kwh: reading.energy_kwh,
      power_watt: reading.power_watt,
    })),
    byRoom: roomRows(monthReadings, context).slice(0, 8).map((row) => ({ room: row.room, kwh: round(row.kwh, 1) })),
    byFloor: floorRows(monthReadings, context).slice(0, 6).map((row) => ({ floor: row.floor, kwh: round(row.kwh, 1) })),
    activity: activityRows(monthReadings, context),
    detailedLog: detailedRows(monthReadings, context, previousMonthReadings),
  };
}

function buildAlertsDto(context: MonitoringContext): AlertsDTO {
  const list = alertList(context.alerts, context);
  return {
    headerDateText: formatFullDate(context.alerts[0]?.timestamp ?? context.readings[0]?.timestamp ?? new Date().toISOString()),
    summary: {
      active: context.alerts.filter((alert) => !alert.is_resolved).length,
      critical: context.alerts.filter((alert) => alert.severity === "critical" && !alert.is_resolved).length,
      warning: context.alerts.filter((alert) => alert.severity === "warning" && !alert.is_resolved).length,
      resolved: context.alerts.filter((alert) => alert.is_resolved).length,
    },
    thresholds: alertThresholds(context.thresholdRules, context.thresholdSettings),
    list,
  };
}

export const api = {
  async getDashboard(): Promise<DashboardDTO> {
    try {
      return buildDashboardDto(await loadMonitoringContext());
    } catch {
      return fallbackDashboardDto();
    }
  },
  async getForecast(): Promise<ForecastDTO> {
    try {
      return buildForecastDto(await loadMonitoringContext());
    } catch {
      return fallbackForecastDto();
    }
  },
  async getCarbon(): Promise<CarbonDTO> {
    try {
      return buildCarbonDto(await loadMonitoringContext());
    } catch {
      return fallbackCarbonDto();
    }
  },
  async getAnalytics(): Promise<AnalyticsDTO> {
    try {
      return buildAnalyticsDto(await loadContext());
    } catch {
      return fallbackAnalyticsDto();
    }
  },
  async getAlerts(): Promise<AlertsDTO> {
    try {
      return buildAlertsDto(await loadMonitoringContext());
    } catch {
      return fallbackAlertsDto();
    }
  },
};