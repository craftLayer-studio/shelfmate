import { cartLines, handle, oneOf, optStr, phone, readBody } from "@/server/http";
import { requireCtx } from "@/server/session";
import { createBill } from "@/server/store";

export async function POST(request: Request) {
  return handle(async () => {
    const ctx = await requireCtx();
    const b = await readBody(request);
    const hasPhone = typeof b.customerPhone === "string" && b.customerPhone.trim() !== "";
    return createBill(ctx, {
      lines: cartLines(b),
      paymentMode: oneOf(b, "paymentMode", ["cash", "upi", "khata"] as const),
      customerPhone: hasPhone ? phone(b, "customerPhone") : undefined,
      customerName: optStr(b, "customerName", 80) || undefined,
    });
  });
}
