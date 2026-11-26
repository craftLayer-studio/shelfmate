import { handle, readBody } from "@/server/http";
import { parseProduct } from "@/server/parse-product";
import { requireCtx } from "@/server/session";
import { saveProduct } from "@/server/store";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const ctx = await requireCtx("owner");
    const { id } = await params;
    return saveProduct(ctx, id, parseProduct(await readBody(request)));
  });
}
