const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://127.0.0.1:8000/api";
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 12000);
const AUTH_PREFIX = (import.meta.env.VITE_API_AUTH_PREFIX as string | undefined) ?? "/auth/auth";

const AUTH_PREFIX_CANDIDATES = [AUTH_PREFIX, "/auth", "/auth/auth"];

type AuthHandlers = {
  getAccessToken(): string | null;
  refreshAccessToken(): Promise<string | null>;
  onUnauthorized(): void;
};

let authHandlers: AuthHandlers | null = null;

export function configureBackendAuth(next: AuthHandlers | null) {
  authHandlers = next;
}

class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type BuildingRecord = {
  id: number;
  name: string;
  code: string;
};

export type RoomRecord = {
  id: number;
  building: number;
  name: string;
  code: string;
  floor?: string;
  activity_label?: string;
};

export type DeviceRecord = {
  id: number;
  device_id: string;
  name: string;
  device_type: string;
  room: number | null;
  floor_label?: string;
  activity_label?: string;
  brand?: string | null;
  model?: string | null;
  capacity_watt?: number | null;
  is_active?: boolean;
};

export type ThresholdRuleRecord = {
  id: number;
  name: string;
  device: number | null;
  room: number | null;
  power_watt_gt: number | null;
  severity: "info" | "warning" | "critical";
  is_enabled: boolean;
};

export type ThresholdSettingsRecord = {
  id: number;
  dailyUsageLimit: number;
  peakDemand: number;
  budgetThreshold: number;
  usageSpikeAlert: number;
  created_at?: string;
  updated_at?: string;
};

export type EnergyReadingRecord = {
  id: number;
  device: number;
  timestamp: string;
  voltage: number | null;
  current: number | null;
  power_watt: number | null;
  energy_kwh: number | null;
};

export type CarbonFootprintRecord = {
  id: number;
  date: string;
  total_kwh: number;
  emission_factor: number;
  emission_kg_co2: number;
};

export type AlertRecord = {
  id: number;
  timestamp: string;
  device: number | null;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  is_resolved: boolean;
  resolved_at: string | null;
};

export type EnergyPredictionRecord = {
  id: number;
  date: string;
  predicted_kwh: number;
  ci_low: number | null;
  ci_high: number | null;
  model_version: string;
  created_at: string;
};

export type AuthUserRecord = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
};

export type AuthTokensRecord = {
  access: string;
  refresh: string;
};

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function parseJsonSafe(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function extractErrorMessage(data: unknown, fallback: string) {
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (typeof data !== "object") return fallback;

  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;

  const firstValue = Object.values(data as Record<string, unknown>)[0];
  if (typeof firstValue === "string") return firstValue;
  if (Array.isArray(firstValue) && typeof firstValue[0] === "string") return firstValue[0];

  return fallback;
}

function resolveUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const base = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;
  return `${base}${normalizePath(pathOrUrl)}`;
}

async function executeRequest(
  path: string,
  init?: RequestInit,
  options?: { withAuth?: boolean; timeoutMs?: number }
): Promise<{ response: Response; data: unknown }> {
  const withAuth = options?.withAuth ?? true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options?.timeoutMs ?? API_TIMEOUT_MS);

  try {
    const headers = new Headers(init?.headers ?? {});
    headers.set("Accept", "application/json");

    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (withAuth && authHandlers) {
      const accessToken = authHandlers.getAccessToken();
      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }
    }

    const response = await fetch(resolveUrl(path), {
      ...init,
      headers,
      signal: controller.signal,
    });

    const raw = await response.text();
    const data = parseJsonSafe(raw);
    return { response, data };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request timed out. Please try again.", 408, null);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
  options?: { withAuth?: boolean; canRefresh?: boolean }
): Promise<T> {
  const canRefresh = options?.canRefresh ?? true;
  const first = await executeRequest(path, init, { withAuth: options?.withAuth });

  if (first.response.status === 401 && canRefresh && options?.withAuth !== false && authHandlers) {
    const refreshedToken = await authHandlers.refreshAccessToken();
    if (!refreshedToken) {
      authHandlers.onUnauthorized();
      throw new ApiError("Your session has expired. Please sign in again.", 401, first.data);
    }

    const second = await executeRequest(path, init, { withAuth: true });
    if (!second.response.ok) {
      const message = extractErrorMessage(second.data, second.response.statusText || "Request failed");
      if (second.response.status === 401) {
        authHandlers.onUnauthorized();
      }
      throw new ApiError(message, second.response.status, second.data);
    }
    return second.data as T;
  }

  if (!first.response.ok) {
    const message = extractErrorMessage(first.data, first.response.statusText || "Request failed");
    throw new ApiError(message, first.response.status, first.data);
  }

  return first.data as T;
}

async function requestFirstAvailable<T>(
  paths: string[],
  init?: RequestInit,
  options?: { withAuth?: boolean; canRefresh?: boolean }
): Promise<T> {
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      return await request<T>(path, init, options);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error("No available endpoint was found.");
}

function monitorPath(path: string) {
  return `/monitoring/${path.replace(/^\/+/, "")}`;
}

function corePath(path: string) {
  return `/core/${path.replace(/^\/+/, "")}`;
}

function authPath(path: string) {
  return normalizePath(`${AUTH_PREFIX}/${path.replace(/^\/+/, "")}`);
}

function authPathCandidates(path: string) {
  const suffix = path.replace(/^\/+/, "");
  return [...new Set(AUTH_PREFIX_CANDIDATES.map((prefix) => normalizePath(`${prefix}/${suffix}`)))];
}

export async function getAll<T>(path: string, options?: { withAuth?: boolean; maxPages?: number }): Promise<T[]> {
  const results: T[] = [];
  const maxPages = options?.maxPages ?? 50;
  let currentPath: string | null = path;
  let page = 0;

  while (currentPath && page < maxPages) {
    const pageResponse: T[] | PaginatedResponse<T> = await request<T[] | PaginatedResponse<T>>(currentPath, undefined, {
      withAuth: options?.withAuth,
    });

    if (Array.isArray(pageResponse)) {
      return pageResponse;
    }

    results.push(...pageResponse.results);
    currentPath = pageResponse.next;
    page += 1;
  }

  return results;
}

export function isUnauthorizedError(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

export async function patchAlert(id: number, payload: Partial<AlertRecord>) {
  return request<AlertRecord>(monitorPath(`/alerts/${id}/`), {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function fetchBuildings() {
  return getAll<BuildingRecord>(corePath("/buildings/"));
}

export async function fetchRooms() {
  return getAll<RoomRecord>(corePath("/rooms/"));
}

export async function fetchDevices() {
  return getAll<DeviceRecord>(corePath("/devices/"));
}

export async function fetchThresholdRules() {
  return getAll<ThresholdRuleRecord>(corePath("/threshold-rules/"));
}

export async function fetchThresholdSettingsCurrent() {
  return request<ThresholdSettingsRecord>(corePath("/threshold-settings/current/"));
}

export async function patchThresholdSettingsCurrent(payload: Partial<ThresholdSettingsRecord>) {
  return request<ThresholdSettingsRecord>(corePath("/threshold-settings/current/"), {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function fetchReadings() {
  return getAll<EnergyReadingRecord>(monitorPath("/readings/"));
}

export async function fetchCarbonFootprints() {
  return getAll<CarbonFootprintRecord>(monitorPath("/carbon/"));
}

export async function fetchAlerts() {
  return getAll<AlertRecord>(monitorPath("/alerts/"));
}

export async function fetchPredictions() {
  return getAll<EnergyPredictionRecord>(monitorPath("/predictions/"));
}

export async function authSignIn(input: { username: string; password: string }) {
  return requestFirstAvailable<{ access: string; refresh: string; user?: AuthUserRecord }>(
    authPathCandidates("signin/"),
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    {
      withAuth: false,
      canRefresh: false,
    }
  );
}

export async function authRefreshToken(refresh: string) {
  return requestFirstAvailable<{ access: string; refresh?: string }>(
    authPathCandidates("token/refresh/"),
    {
      method: "POST",
      body: JSON.stringify({ refresh }),
    },
    {
      withAuth: false,
      canRefresh: false,
    }
  );
}

export async function authSignUp(input: {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
  first_name?: string;
  last_name?: string;
}) {
  const signupCandidates = [...new Set(["/auth/users/signup/", ...authPathCandidates("signup/")])];

  return requestFirstAvailable<{
    message?: string;
    tokens?: { access: string; refresh: string; user?: AuthUserRecord };
    user?: AuthUserRecord;
  }>(
    signupCandidates,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    {
      withAuth: false,
      canRefresh: false,
    }
  );
}

export async function authMe() {
  return requestFirstAvailable<AuthUserRecord>(authPathCandidates("me/"));
}

export async function authSignOut(refresh: string) {
  return requestFirstAvailable<{ detail?: string }>(
    authPathCandidates("signout/"),
    {
      method: "POST",
      body: JSON.stringify({ refresh }),
    },
    {
      withAuth: true,
      canRefresh: false,
    }
  );
}

export function toIsoDateKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));

  if (minutes < 60) {
    return `${Math.max(1, minutes)} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function formatFullDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatShortDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatMonthLabel(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
}

export function formatTimeLabel(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export { ApiError, authPath };