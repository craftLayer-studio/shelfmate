import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "./db";
import { StoreError, loadStaff, type Ctx, type Role } from "./store";

export const SESSION_COOKIE = "sm_session";
const MAX_AGE_S = 7 * 24 * 3600;
let warned = false;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE === "off") throw new Error("SESSION_SECRET must be set (32+ characters)");
  if (!warned) {
    console.warn("[shelfmate] SESSION_SECRET is not set; using an insecure development fallback.");
    warned = true;
  }
  return "shelfmate-dev-only-insecure-session-secret";
}

interface Payload {
  uid: string;
  org: string;
  role: Role;
  exp: number;
}

export function signSession(p: Payload): string {
  const body = Buffer.from(JSON.stringify(p)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySession(token: string | undefined, now = Date.now()): Payload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    return p.exp > now ? p : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(p: { userId: string; orgId: string; role: Role }): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signSession({ uid: p.userId, org: p.orgId, role: p.role, exp: Date.now() + MAX_AGE_S * 1000 }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && (process.env.APP_URL ?? "").startsWith("https://"),
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Current staff context, re-checked against the database (role changes apply at once). */
export async function currentCtx(): Promise<(Ctx & { name: string }) | null> {
  const p = verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!p) return null;
  const db = await getDb();
  const staff = await loadStaff(db, p.uid, p.org);
  if (!staff) return null;
  return { db, orgId: staff.orgId, userId: staff.id, role: staff.role, name: staff.name };
}

/** For API routes: 401 when signed out, 403 when the role is not allowed. */
export async function requireCtx(role?: Role): Promise<Ctx> {
  const ctx = await currentCtx();
  if (!ctx) throw new StoreError("Please sign in", 401);
  if (role === "owner" && ctx.role !== "owner") throw new StoreError("Only the owner can do this", 403);
  return ctx;
}

/** For pages: redirect to sign-in when signed out; owner-only pages send staff to the queue. */
export async function pageCtx(role?: Role) {
  const ctx = await currentCtx();
  if (!ctx) redirect("/login");
  if (role === "owner" && ctx.role !== "owner") redirect("/app/orders");
  return ctx;
}
