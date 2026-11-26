import { handle, readBody } from "@/server/http";
import { parseProduct } from "@/server/parse-product";
import { requireCtx } from "@/server/session";
import { saveProduct } from "@/server/store";

export async function POST(request: Request) {
  return handle(async () => saveProduct(await requireCtx("owner"), null, parseProduct(await readBody(request))));
}
