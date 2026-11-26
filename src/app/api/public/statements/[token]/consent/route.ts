import { CONSENT_PURPOSES } from "@/domain";
import { getDb } from "@/server/db";
import { bool, handle, oneOf, readBody } from "@/server/http";
import { limit } from "@/server/ratelimit";
import { setConsentPublic, stopAllPublic } from "@/server/store";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  return handle(async () => {
    await limit("consent", 20);
    const { token } = await params;
    const b = await readBody(request);
    const db = await getDb();
    if (b.stop === true) return stopAllPublic(db, token);
    return setConsentPublic(db, token, oneOf(b, "purpose", CONSENT_PURPOSES), bool(b, "granted"));
  });
}
