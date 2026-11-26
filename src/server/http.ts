import { normalizeIndianPhone } from "@/domain";
import { StoreError } from "./store/core";

export class BadRequest extends Error {
  readonly status = 400;
}

/** Run a store call and turn the result or a StoreError into a JSON response. */
export async function handle(fn: () => unknown): Promise<Response> {
  try {
    return Response.json((await fn()) ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof StoreError || err instanceof BadRequest) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

const MAX_BODY_BYTES = 16_000;

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new BadRequest("Request too large");
  let value: unknown;
  try {
    value = text ? JSON.parse(text) : {};
  } catch {
    throw new BadRequest("Body must be JSON");
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new BadRequest("Body must be a JSON object");
  return value as Record<string, unknown>;
}

export function str(body: Record<string, unknown>, key: string, max = 200): string {
  const v = body[key];
  if (typeof v !== "string" || v.trim().length === 0 || v.length > max) throw new BadRequest(`${key} is required (up to ${max} characters)`);
  return v.trim();
}

export function optStr(body: Record<string, unknown>, key: string, max = 500): string {
  const v = body[key];
  if (v === undefined || v === null || v === "") return "";
  if (typeof v !== "string" || v.length > max) throw new BadRequest(`${key} must be text up to ${max} characters`);
  return v.trim();
}

export function int(body: Record<string, unknown>, key: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const v = body[key];
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) throw new BadRequest(`${key} must be a whole number from ${min} to ${max}`);
  return v;
}

export function bool(body: Record<string, unknown>, key: string): boolean {
  const v = body[key];
  if (v === undefined) return false;
  if (typeof v !== "boolean") throw new BadRequest(`${key} must be true or false`);
  return v;
}

export function oneOf<T extends string>(body: Record<string, unknown>, key: string, allowed: readonly T[]): T {
  const v = body[key];
  if (typeof v !== "string" || !allowed.includes(v as T)) throw new BadRequest(`${key} must be one of ${allowed.join(", ")}`);
  return v as T;
}

export function phone(body: Record<string, unknown>, key = "phone"): string {
  const v = body[key];
  const p = typeof v === "string" ? normalizeIndianPhone(v) : null;
  if (!p) throw new BadRequest("Enter a 10-digit Indian mobile number");
  return p;
}

const MAX_LINES = 60;

export function cartLines(body: Record<string, unknown>, key = "lines"): { productId: string; qtyMilli: number }[] {
  const v = body[key];
  if (!Array.isArray(v) || v.length === 0 || v.length > MAX_LINES) throw new BadRequest("Add at least one item");
  return v.map((line, i) => {
    if (typeof line !== "object" || line === null) throw new BadRequest(`Line ${i + 1} is invalid`);
    const { productId, qtyMilli } = line as Record<string, unknown>;
    if (typeof productId !== "string" || productId.length > 64 || typeof qtyMilli !== "number" || !Number.isInteger(qtyMilli)) {
      throw new BadRequest(`Line ${i + 1} is invalid`);
    }
    return { productId, qtyMilli };
  });
}
