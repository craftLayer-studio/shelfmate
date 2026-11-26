import { ORDER_STATUSES } from "@/domain";
import { handle, oneOf, readBody } from "@/server/http";
import { requireCtx } from "@/server/session";
import { transitionOrder } from "@/server/store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const ctx = await requireCtx();
    const { id } = await params;
    return transitionOrder(ctx, id, oneOf(await readBody(request), "to", ORDER_STATUSES));
  });
}
