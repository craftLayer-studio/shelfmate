import { getDb } from "@/server/db";
import { handle, phone, readBody } from "@/server/http";
import { limit } from "@/server/ratelimit";
import { isDemoMode } from "@/server/config";
import { requestOtp } from "@/server/store";

export async function POST(request: Request) {
  return handle(async () => {
    await limit("otp", 5);
    const p = phone(await readBody(request));
    const { code } = await requestOtp(await getDb(), p);
    // Demo only: show the code on screen. A real SMS adapter would deliver it instead.
    return { sent: true, demoCode: isDemoMode() ? code : null };
  });
}
