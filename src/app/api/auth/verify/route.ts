import { getDb } from "@/server/db";
import { BadRequest, handle, phone, readBody } from "@/server/http";
import { limit } from "@/server/ratelimit";
import { setSessionCookie } from "@/server/session";
import { verifyOtp } from "@/server/store";

export async function POST(request: Request) {
  return handle(async () => {
    await limit("verify", 10);
    const body = await readBody(request);
    const p = phone(body);
    const code = body.code;
    if (typeof code !== "string" || !/^\d{6}$/.test(code)) throw new BadRequest("Enter the 6-digit code");
    const s = await verifyOtp(await getDb(), p, code);
    await setSessionCookie(s);
    return { role: s.role, name: s.name };
  });
}
