export type DateRange = { from: string; to: string }; // YYYY-MM-DD
export type AnalyticsTab = "Daily" | "Weekly" | "Monthly";

export type SeriesPoint = { label: string; kwh: number };

export function toDateInputValue(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatMMMdd(d: Date) {
  const m = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  return `${m} ${day}`;
}

export function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function daysBetween(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)));
}

function toDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function inRange(dateKey: string, range: DateRange) {
  return dateKey >= range.from && dateKey <= range.to;
}

function sumReadings(readings: Array<{ energy_kwh: number | null; power_watt: number | null }>) {
  return readings.reduce((acc, reading) => acc + (reading.energy_kwh ?? (reading.power_watt ? reading.power_watt / 1000 : 0)), 0);
}

function buildFallbackSeries(tab: AnalyticsTab, range: DateRange): SeriesPoint[] {
  const from = parseDate(range.from);
  const to = parseDate(range.to);
  const totalDays = clamp(daysBetween(from, to), 1, 180);

  if (tab === "Daily") {
    const len = clamp(totalDays + 1, 7, 31);
    const points: SeriesPoint[] = [];
    for (let i = 0; i < len; i++) {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      const base = 11800 + i * 35;
      const dip = i > Math.floor(len / 2) ? -2200 : 0;
      const n = seededNoise(i + len) * 600;
      points.push({ label: formatMMMdd(d), kwh: Math.round(base + dip + n) });
    }
    return points;
  }

  if (tab === "Weekly") {
    const weeks = clamp(Math.ceil(totalDays / 7), 2, 12);
    return Array.from({ length: weeks }).map((_, i) => {
      const base = 82000 + i * 950;
      const n = seededNoise(i + 77) * 5000;
      return { label: `Week ${i + 1}`, kwh: Math.round(base + n) };
    });
  }

  const months = clamp(Math.ceil(totalDays / 30), 3, 12);
  const startMonth = parseDate(range.from).getMonth();
  const startYear = parseDate(range.from).getFullYear();

  const points: SeriesPoint[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(startYear, startMonth + i, 1);
    const label = d.toLocaleString("en-US", { month: "short" });
    const base = 220000 + i * 8500;
    const n = seededNoise(i + 123) * 24000;
    points.push({ label, kwh: Math.round(base + n) });
  }
  return points;
}

function seededNoise(seed: number) {
  // deterministic-ish random
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export type AnalyticsReading = {
  timestamp: string;
  energy_kwh: number | null;
  power_watt: number | null;
};

export function buildSeries(tab: AnalyticsTab, range: DateRange, readings: AnalyticsReading[] = []): SeriesPoint[] {
  if (!readings.length) {
    return buildFallbackSeries(tab, range);
  }

  const from = parseDate(range.from);
  const to = parseDate(range.to);
  const filtered = readings.filter((reading) => {
    const key = toDateKey(new Date(reading.timestamp));
    return inRange(key, range);
  });

  if (tab === "Daily") {
    const points: SeriesPoint[] = [];
    const current = new Date(from);
    while (current <= to) {
      const key = toDateKey(current);
      const items = filtered.filter((reading) => toDateKey(new Date(reading.timestamp)) === key);
      points.push({ label: formatMMMdd(current), kwh: Math.round(sumReadings(items)) });
      current.setDate(current.getDate() + 1);
    }
    return points;
  }

  if (tab === "Weekly") {
    const weekCount = clamp(Math.ceil((daysBetween(from, to) + 1) / 7), 1, 24);
    return Array.from({ length: weekCount }).map((_, index) => {
      const start = new Date(from);
      start.setDate(from.getDate() + index * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      const items = filtered.filter((reading) => {
        const readingDate = parseDate(toDateKey(new Date(reading.timestamp)));
        return readingDate >= start && readingDate <= end;
      });

      return { label: `Week ${index + 1}`, kwh: Math.round(sumReadings(items)) };
    });
  }

  const points: SeriesPoint[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const endMonth = new Date(to.getFullYear(), to.getMonth(), 1);

  while (cursor <= endMonth) {
    const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    const items = filtered.filter((reading) => toDateKey(new Date(reading.timestamp)).startsWith(monthKey));
    points.push({ label: cursor.toLocaleString("en-US", { month: "short" }), kwh: Math.round(sumReadings(items)) });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return points;
}

export function sumKwh(series: SeriesPoint[]) {
  return series.reduce((acc, p) => acc + p.kwh, 0);
}

export function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  const headers = Object.keys(rows[0] ?? {});
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}