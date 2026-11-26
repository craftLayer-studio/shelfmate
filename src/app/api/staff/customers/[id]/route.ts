import { bool, handle, int, readBody } from "@/server/http";
import { requireCtx } from "@/server/session";
import { updateCustomerKhata } from "@/server/store";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const ctx = await requireCtx();
    const { id } = await params;
    const b = await readBody(request);
    return updateCustomerKhata(ctx, id, { khataEnabled: bool(b, "khataEnabled"), creditLimit: int(b, "creditLimit", 0, 100_000_00) });
  });
}
