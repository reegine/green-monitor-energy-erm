import { loadJson, saveJson } from "./store";
import { patchAlert, patchThresholdSettingsCurrent } from "./backend";

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

export async function setResolved(id: string, value: boolean) {
  const numericId = Number(id);

  if (Number.isFinite(numericId)) {
    await patchAlert(numericId, { is_resolved: value, resolved_at: value ? new Date().toISOString() : null });
  }

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

function parseLooseNumber(value: string) {
  const sanitized = value.replace(/[^0-9.]/g, "");
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function saveThresholdsWithBackend(t: Thresholds) {
  saveThresholds(t);

  const dailyUsageLimit = parseLooseNumber(t.dailyUsageLimit);
  const peakDemand = parseLooseNumber(t.peakDemand);
  const budgetThreshold = parseLooseNumber(t.budgetThreshold);
  const usageSpikeAlert = parseLooseNumber(t.usageSpikeAlert);

  if (
    dailyUsageLimit === null ||
    peakDemand === null ||
    budgetThreshold === null ||
    usageSpikeAlert === null
  ) {
    return;
  }

  await patchThresholdSettingsCurrent({
    dailyUsageLimit,
    peakDemand,
    budgetThreshold,
    usageSpikeAlert,
  });
}