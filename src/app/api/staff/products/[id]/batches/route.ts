import { handle, int, readBody, str } from "@/server/http";
import { requireCtx } from "@/server/session";
import { addBatch } from "@/server/store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const ctx = await requireCtx();
    const { id } = await params;
    const b = await readBody(request);
    return addBatch(ctx, id, { batchNo: str(b, "batchNo", 40), expiry: str(b, "expiry", 10), qtyMilli: int(b, "qtyMilli", 1, 500_000) });
  });
}
