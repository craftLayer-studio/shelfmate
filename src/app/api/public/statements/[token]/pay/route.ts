import { getDb } from "@/server/db";
import { handle, int, readBody } from "@/server/http";
import { limit } from "@/server/ratelimit";
import { payStatement } from "@/server/store";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  return handle(async () => {
    await limit("pay", 10);
    const { token } = await params;
    return payStatement(await getDb(), token, int(await readBody(request), "amount", 1, 10_000_000));
  });
}
