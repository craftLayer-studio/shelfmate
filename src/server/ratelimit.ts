import { headers } from "next/headers";
import { StoreError } from "./store/core";

/** Fixed-window in-memory limiter. Good enough for one server process; swap for Redis when scaled out. */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function hit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    return true;
  }
  b.count++;
  return b.count <= limit;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/** Throw 429 when the caller exceeds `limit` requests per minute for this bucket. */
export async function limit(bucket: string, perMinute: number): Promise<void> {
  if (!hit(`${bucket}:${await clientIp()}`, perMinute, 60_000)) throw new StoreError("Too many requests. Please wait a minute.", 429);
}
