import { createHash, randomInt } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { schema, type Db } from "../db";
import { StoreError, newId, type Role } from "./core";

const OTP_TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;

const hash = (phone: string, code: string) => createHash("sha256").update(`${phone}:${code}`).digest("hex");

/**
 * Start a phone + OTP sign-in. The code goes out through the SMS adapter (simulated: outbox).
 * Unknown numbers get the same response so staff phone numbers cannot be probed.
 */
export async function requestOtp(db: Db, phone: string, now = Date.now()): Promise<{ code: string | null }> {
  const [staff] = await db.select().from(schema.staffUsers).where(eq(schema.staffUsers.phone, phone));
  if (!staff) return { code: null };
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(schema.otpCodes).values({ id: newId(), phone, codeHash: hash(phone, code), expiresAt: new Date(now + OTP_TTL_MS), createdAt: new Date(now) });
  await db.insert(schema.outbox).values({
    id: newId(),
    orgId: staff.orgId,
    channel: "sms",
    toPhone: phone,
    kind: "otp",
    body: `Your ShelfMate sign-in code is ${code}. It expires in 5 minutes.`,
    status: "sent",
  });
  return { code };
}

export async function verifyOtp(db: Db, phone: string, code: string, now = Date.now()): Promise<{ userId: string; orgId: string; role: Role; name: string }> {
  const [otp] = await db
    .select()
    .from(schema.otpCodes)
    .where(and(eq(schema.otpCodes.phone, phone), isNull(schema.otpCodes.usedAt)))
    .orderBy(desc(schema.otpCodes.createdAt))
    .limit(1);
  if (!otp || otp.expiresAt.getTime() < now || otp.attempts >= MAX_ATTEMPTS) throw new StoreError("Code expired. Request a new one.", 401);
  if (otp.codeHash !== hash(phone, code)) {
    await db.update(schema.otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(schema.otpCodes.id, otp.id));
    throw new StoreError("Wrong code", 401);
  }
  await db.update(schema.otpCodes).set({ usedAt: new Date(now) }).where(eq(schema.otpCodes.id, otp.id));
  const [staff] = await db.select().from(schema.staffUsers).where(eq(schema.staffUsers.phone, phone));
  if (!staff) throw new StoreError("No store account for this number", 401);
  return { userId: staff.id, orgId: staff.orgId, role: staff.role, name: staff.name };
}

/** Re-read the staff row on every request so a removed user or changed role takes effect at once. */
export async function loadStaff(db: Db, userId: string, orgId: string) {
  const [s] = await db.select().from(schema.staffUsers).where(and(eq(schema.staffUsers.id, userId), eq(schema.staffUsers.orgId, orgId)));
  return s ?? null;
}
