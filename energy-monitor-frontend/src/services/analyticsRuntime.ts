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

export type CarbonExportData = {
  headerDateText?: string;
  kpis: { title: string; value: string; unit: string; delta: string; iconTone: "blue" | "purple" | "green" | "pink" }[];
  trend: { month: string; actual: number; target: number }[];
  sources: { name: string; value: number }[];
  achievement: { title: string; subtitle: string; stats: { value: string; unit: string }[] };
  recommendations: { title: string; subtitle: string; footer: string; tone: "purple" | "teal" }[];
};

export type AnalyticsExportData = {
  headerDateText?: string;
  tab: AnalyticsTab;
  range: DateRange;
  series: SeriesPoint[];
  byRoom: { room: string; kwh: number }[];
  byFloor: { floor: string; kwh: number }[];
  activity: { name: string; kwh: number; color: string }[];
  detailedLog: { location: string; kwh: number; trend: string }[];
};

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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

  downloadBlob(filename, new Blob([csv], { type: "text/csv;charset=utf-8" }));
}

export async function downloadCarbonPdf(filename: string, data: CarbonExportData) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
  const pdfDoc = doc as typeof doc & { lastAutoTable?: { finalY?: number } };
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  const titleColor: [number, number, number] = [37, 99, 235];
  const accentColor: [number, number, number] = [5, 150, 105];
  const textColor: [number, number, number] = [71, 85, 105];

  doc.setFillColor(...titleColor);
  doc.roundedRect(margin, 44, contentWidth, 92, 14, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Carbon Footprint Report", margin + 20, 74);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("A readable summary of emissions, targets, and offset recommendations.", margin + 20, 94, {
    maxWidth: contentWidth - 180,
  });
  doc.setFont("helvetica", "bold");
  doc.text(data.headerDateText ? `Report date: ${data.headerDateText}` : "Carbon report export", margin + 20, 116);

  const cardTop = 156;
  const cardWidth = (contentWidth - 12) / 2;
  const cardHeight = 62;

  data.kpis.slice(0, 4).forEach((kpi, index) => {
    const x = margin + (index % 2) * (cardWidth + 12);
    const y = cardTop + Math.floor(index / 2) * (cardHeight + 12);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, cardWidth, cardHeight, 10, 10, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...textColor);
    doc.text(kpi.title, x + 12, y + 18);
    doc.setTextColor(...accentColor);
    doc.setFontSize(16);
    doc.text(`${kpi.value} ${kpi.unit}`.trim(), x + 12, y + 38);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.delta, x + 12, y + 52);
  });

  autoTable(pdfDoc, {
    startY: 280,
    head: [["Month", "Actual", "Target", "Gap"]],
    body: data.trend.map((row) => {
      const gap = row.actual - row.target;
      return [row.month, row.actual.toFixed(1), row.target.toFixed(1), `${gap >= 0 ? "+" : ""}${gap.toFixed(1)}`];
    }),
    margin: { left: margin, right: margin },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 6, textColor: [51, 65, 85] },
    headStyles: { fillColor: titleColor, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: "striped",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...textColor);
  const trendTableEndY = pdfDoc.lastAutoTable?.finalY ?? 280;
  doc.text("Emissions by Source", margin, trendTableEndY + 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Breakdown of carbon contributors in the current reporting period.", margin, trendTableEndY + 44);

  autoTable(pdfDoc, {
    startY: trendTableEndY + 56,
    head: [["Source", "Value"]],
    body: data.sources.map((source) => [source.name, source.value.toFixed(0)]),
    margin: { left: margin, right: margin },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 6, textColor: [51, 65, 85] },
    headStyles: { fillColor: accentColor, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [247, 250, 252] },
    theme: "striped",
  });

  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...textColor);
  doc.text("Achievement Summary", margin, 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(doc.splitTextToSize(data.achievement.subtitle, contentWidth), margin, 68);

  autoTable(pdfDoc, {
    startY: 112,
    head: [["Metric", "Value"]],
    body: data.achievement.stats.map((stat) => [stat.unit, stat.value]),
    margin: { left: margin, right: margin },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 6, textColor: [51, 65, 85] },
    headStyles: { fillColor: titleColor, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: "striped",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...textColor);
  const achievementTableEndY = pdfDoc.lastAutoTable?.finalY ?? 112;
  doc.text("Carbon Offset Recommendations", margin, achievementTableEndY + 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Actions that can help reduce or offset the remaining footprint.", margin, achievementTableEndY + 50);

  autoTable(pdfDoc, {
    startY: achievementTableEndY + 62,
    head: [["Title", "Details", "Footer"]],
    body: data.recommendations.map((recommendation) => [recommendation.title, recommendation.subtitle, recommendation.footer]),
    margin: { left: margin, right: margin },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 6, textColor: [51, 65, 85], valign: "top" },
    headStyles: { fillColor: [14, 116, 144], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: "striped",
  });

  downloadBlob(filename, doc.output("blob"));
}

export async function downloadAnalyticsPdf(filename: string, data: AnalyticsExportData) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
  const pdfDoc = doc as typeof doc & { lastAutoTable?: { finalY?: number } };
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  const titleColor: [number, number, number] = [37, 99, 235];
  const accentColor: [number, number, number] = [6, 182, 212];
  const textColor: [number, number, number] = [71, 85, 105];

  doc.setFillColor(...titleColor);
  doc.roundedRect(margin, 44, contentWidth, 92, 14, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Energy Analytics Report", margin + 20, 74);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("A readable summary of consumption trends and breakdowns.", margin + 20, 94, {
    maxWidth: contentWidth - 180,
  });
  doc.setFont("helvetica", "bold");
  doc.text(
    data.headerDateText ? `Report date: ${data.headerDateText}` : `Range: ${data.range.from} to ${data.range.to}`,
    margin + 20,
    116
  );

  const topCards = [
    { title: `${data.tab} Total`, value: data.series.reduce((acc, point) => acc + point.kwh, 0).toLocaleString(), unit: "kWh" },
    { title: "Peak Period", value: data.series.length ? Math.max(...data.series.map((point) => point.kwh)).toLocaleString() : "0", unit: "kWh" },
    { title: "Rooms", value: data.byRoom.length.toString(), unit: "tracked" },
    { title: "Floors", value: data.byFloor.length.toString(), unit: "tracked" },
  ];

  const cardTop = 156;
  const cardWidth = (contentWidth - 12) / 2;
  const cardHeight = 62;

  topCards.forEach((card, index) => {
    const x = margin + (index % 2) * (cardWidth + 12);
    const y = cardTop + Math.floor(index / 2) * (cardHeight + 12);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, cardWidth, cardHeight, 10, 10, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...textColor);
    doc.text(card.title, x + 12, y + 18);
    doc.setTextColor(...accentColor);
    doc.setFontSize(16);
    doc.text(`${card.value} ${card.unit}`.trim(), x + 12, y + 38);
  });

  autoTable(pdfDoc, {
    startY: 280,
    head: [["Period", "kWh"]],
    body: data.series.map((point) => [point.label, point.kwh.toLocaleString()]),
    margin: { left: margin, right: margin },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 6, textColor: [51, 65, 85] },
    headStyles: { fillColor: titleColor, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: "striped",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...textColor);
  const seriesEndY = pdfDoc.lastAutoTable?.finalY ?? 280;
  doc.text("By Room", margin, seriesEndY + 28);

  autoTable(pdfDoc, {
    startY: seriesEndY + 40,
    head: [["Room", "kWh"]],
    body: data.byRoom.map((row) => [row.room, Math.round(row.kwh).toLocaleString()]),
    margin: { left: margin, right: margin },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 6, textColor: [51, 65, 85] },
    headStyles: { fillColor: accentColor, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [247, 250, 252] },
    theme: "striped",
  });

  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...textColor);
  doc.text("By Floor", margin, 52);
  autoTable(pdfDoc, {
    startY: 64,
    head: [["Floor", "kWh"]],
    body: data.byFloor.map((row) => [row.floor, Math.round(row.kwh).toLocaleString()]),
    margin: { left: margin, right: margin },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 6, textColor: [51, 65, 85] },
    headStyles: { fillColor: titleColor, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: "striped",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...textColor);
  const floorEndY = pdfDoc.lastAutoTable?.finalY ?? 64;
  doc.text("Activity and Detail", margin, floorEndY + 28);

  autoTable(pdfDoc, {
    startY: floorEndY + 40,
    head: [["Activity", "kWh"]],
    body: data.activity.map((row) => [row.name, Math.round(row.kwh).toLocaleString()]),
    margin: { left: margin, right: margin },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 6, textColor: [51, 65, 85] },
    headStyles: { fillColor: accentColor, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [247, 250, 252] },
    theme: "striped",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...textColor);
  const activityEndY = pdfDoc.lastAutoTable?.finalY ?? floorEndY + 40;
  doc.text("Detailed Log", margin, activityEndY + 28);

  autoTable(pdfDoc, {
    startY: activityEndY + 40,
    head: [["Location", "kWh", "Trend"]],
    body: data.detailedLog.map((row) => [row.location, Math.round(row.kwh).toLocaleString(), row.trend]),
    margin: { left: margin, right: margin },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 6, textColor: [51, 65, 85] },
    headStyles: { fillColor: titleColor, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: "striped",
  });

  downloadBlob(filename, doc.output("blob"));
}