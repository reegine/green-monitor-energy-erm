import { mockDb } from "./mockDb";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function mockFetch<T>(key: keyof typeof mockDb, ms = 600): Promise<T> {
  await sleep(ms);

  // Simulasi random latency + sedikit kemungkinan error (bisa dimatikan)
  // if (Math.random() < 0.03) throw new Error("Network error (simulated)");

  return mockDb[key] as T;
}