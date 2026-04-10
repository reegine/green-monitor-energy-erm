import { loadJson, saveJson } from "./store";

const LS_ALERTS_STATE = "em_alerts_state";
const LS_ALERT_THRESHOLDS = "em_alert_thresholds";

export type AlertSeverity = "critical" | "warning" | "info";

export type AlertItem = {
  id: string;
  severity: AlertSeverity;
  title: string;
  tag: string;
  description: string;
  metaLeft: string;
  metaRight: string;
  is_resolved: boolean;
};

export type Thresholds = {
  dailyUsageLimit: string;
  peakDemand: string;
  budgetThreshold: string;
  usageSpikeAlert: string;
};

type StoredState = {
  resolvedById: Record<string, boolean>;
};

export function mergeResolved(list: AlertItem[]): AlertItem[] {
  const state = loadJson<StoredState>(LS_ALERTS_STATE, { resolvedById: {} });
  return list.map((a) => ({
    ...a,
    is_resolved: state.resolvedById[a.id] ?? a.is_resolved,
  }));
}

export function setResolved(id: string, value: boolean) {
  const state = loadJson<StoredState>(LS_ALERTS_STATE, { resolvedById: {} });
  state.resolvedById[id] = value;
  saveJson(LS_ALERTS_STATE, state);
}

export function loadThresholds(fallback: Thresholds): Thresholds {
  return loadJson<Thresholds>(LS_ALERT_THRESHOLDS, fallback);
}

export function saveThresholds(t: Thresholds) {
  saveJson(LS_ALERT_THRESHOLDS, t);
}