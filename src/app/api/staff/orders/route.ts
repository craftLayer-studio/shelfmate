import { handle } from "@/server/http";
import { requireCtx } from "@/server/session";
import { listOrders } from "@/server/store";

export async function GET() {
  return handle(async () => listOrders(await requireCtx()));
}
