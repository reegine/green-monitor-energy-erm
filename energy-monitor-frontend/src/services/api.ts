import { mockFetch } from "./mockServer";
import { mockDb } from "./mockDb";

export type DashboardDTO = typeof mockDb.dashboard;
export type ForecastDTO = typeof mockDb.forecast;
export type CarbonDTO = typeof mockDb.carbon;
export type AnalyticsDTO = typeof mockDb.analytics;
export type AlertsDTO = typeof mockDb.alerts;

export const api = {
  getDashboard: () => mockFetch<DashboardDTO>("dashboard", 650),
  getForecast: () => mockFetch<ForecastDTO>("forecast", 700),
  getCarbon: () => mockFetch<CarbonDTO>("carbon", 650),
  getAnalytics: () => mockFetch<AnalyticsDTO>("analytics", 750),
  getAlerts: () => mockFetch<AlertsDTO>("alerts", 650),
};