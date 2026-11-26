import { handle } from "@/server/http";
import { requireCtx } from "@/server/session";
import { clearBatch } from "@/server/store";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const ctx = await requireCtx();
    const { id } = await params;
    return clearBatch(ctx, id);
  });
}
