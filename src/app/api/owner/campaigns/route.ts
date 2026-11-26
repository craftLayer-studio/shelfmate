import { handle, oneOf, readBody, str } from "@/server/http";
import { requireCtx } from "@/server/session";
import { sendCampaign } from "@/server/store";

export async function POST(request: Request) {
  return handle(async () => {
    const ctx = await requireCtx("owner");
    const b = await readBody(request);
    return sendCampaign(ctx, { message: str(b, "message", 300), segment: oneOf(b, "segment", ["all", "inactive_21d"] as const) });
  });
}
