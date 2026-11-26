import { handle, int, readBody } from "@/server/http";
import { requireCtx } from "@/server/session";
import { adjustStock } from "@/server/store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const ctx = await requireCtx();
    const { id } = await params;
    return adjustStock(ctx, id, int(await readBody(request), "deltaMilli", -50_000, 500_000));
  });
}
