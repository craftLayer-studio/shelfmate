import { bool, handle, oneOf, readBody } from "@/server/http";
import { requireCtx } from "@/server/session";
import { setCustomerConsent } from "@/server/store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const ctx = await requireCtx();
    const { id } = await params;
    const b = await readBody(request);
    return setCustomerConsent(ctx, id, oneOf(b, "purpose", ["service", "marketing", "stop"] as const), bool(b, "granted"));
  });
}
