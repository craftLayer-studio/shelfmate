import { handle } from "@/server/http";
import { requireCtx } from "@/server/session";
import { sendAllReminders } from "@/server/store";

export async function POST() {
  return handle(async () => sendAllReminders(await requireCtx()));
}
