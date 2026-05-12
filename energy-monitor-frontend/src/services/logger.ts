const STORAGE_KEY = "em_api_logs";

export const ENABLE_API_LOGS =
  (import.meta.env.VITE_ENABLE_API_LOGS as string | undefined) === "1" ||
  (import.meta.env.VITE_ENABLE_API_LOGS as string | undefined) === "true";

function now() {
  return new Date().toISOString();
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function maskHeadersObj(h: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const k of Object.keys(h)) {
    if (k.toLowerCase() === "authorization") out[k] = "<redacted>";
    else out[k] = h[k];
  }
  return out;
}

function persistLog(entry: any) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    arr.push(entry);
    // keep only last 200 entries
    if (arr.length > 200) arr.splice(0, arr.length - 200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // ignore storage errors
  }
}

export function readLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearLogs() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function logRequest({ url, method, headers, body }: { url: string; method?: string; headers?: Record<string, string>; body?: unknown }) {
  if (!ENABLE_API_LOGS) return;
  const h = headers ? maskHeadersObj(headers) : undefined;
  const entry = { ts: now(), kind: "request", url, method: method ?? "GET", headers: h, body };
  try {
    console.groupCollapsed(`[API][Request] ${entry.method} ${url}`);
    if (h) console.log("headers:", h);
    if (body !== undefined) console.log("body:", body);
    console.groupEnd();
  } catch {}
  persistLog(entry);
}

export function logResponse({ url, status, data }: { url: string; status: number; data: unknown }) {
  if (!ENABLE_API_LOGS) return;
  const entry = { ts: now(), kind: "response", url, status, data };
  try {
    console.groupCollapsed(`[API][Response] ${status} ${url}`);
    console.log("data:", data);
    console.groupEnd();
  } catch {}
  persistLog(entry);
}

export function logError({ url, error }: { url: string; error: unknown }) {
  if (!ENABLE_API_LOGS) return;
  const entry = { ts: now(), kind: "error", url, error: safeJson(error) };
  try {
    console.error(`[API][Error] ${url}`, error);
  } catch {}
  persistLog(entry);
}

export function logPageView(path: string) {
  if (!ENABLE_API_LOGS) return;
  const entry = { ts: now(), kind: "pageview", path };
  try {
    console.log(`[Page] ${path}`);
  } catch {}
  persistLog(entry);
}

export default { readLogs, clearLogs, logRequest, logResponse, logError, logPageView };
