import { handle, int, oneOf, optStr, readBody } from "@/server/http";
import { requireCtx } from "@/server/session";
import { addKhataEntry } from "@/server/store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const ctx = await requireCtx();
    const { id } = await params;
    const b = await readBody(request);
    return addKhataEntry(ctx, id, {
      kind: oneOf(b, "kind", ["credit", "payment"] as const),
      amount: int(b, "amount", 1, 10_000_000),
      method: oneOf(b, "method", ["cash", "upi"] as const),
      note: optStr(b, "note", 200),
    });
  });
}
