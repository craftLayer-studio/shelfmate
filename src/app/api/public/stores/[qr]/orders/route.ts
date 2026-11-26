import { FULFILMENTS, PAYMENT_MODES } from "@/domain";
import { getDb } from "@/server/db";
import { bool, cartLines, handle, int, oneOf, optStr, phone, readBody, str } from "@/server/http";
import { limit } from "@/server/ratelimit";
import { placeOrder } from "@/server/store";

export async function POST(request: Request, { params }: { params: Promise<{ qr: string }> }) {
  return handle(async () => {
    await limit("order", 6);
    const { qr } = await params;
    const b = await readBody(request);
    const fulfilment = oneOf(b, "fulfilment", FULFILMENTS);
    return placeOrder(await getDb(), qr, {
      name: str(b, "name", 80),
      phone: phone(b),
      address: fulfilment === "delivery" ? str(b, "address", 300) : optStr(b, "address", 300),
      fulfilment,
      slotStart: int(b, "slotStart", 0),
      paymentMode: oneOf(b, "paymentMode", PAYMENT_MODES),
      note: optStr(b, "note", 300),
      lines: cartLines(b),
      consentService: bool(b, "consentService"),
      consentMarketing: bool(b, "consentMarketing"),
    });
  });
}
