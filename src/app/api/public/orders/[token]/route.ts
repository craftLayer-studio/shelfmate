import { getDb } from "@/server/db";
import { handle } from "@/server/http";
import { limit } from "@/server/ratelimit";
import { getOrderPublic } from "@/server/store";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  return handle(async () => {
    await limit("track", 60);
    const { token } = await params;
    return getOrderPublic(await getDb(), token);
  });
}
