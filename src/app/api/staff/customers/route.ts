import { bool, handle, int, optStr, phone, readBody, str } from "@/server/http";
import { requireCtx } from "@/server/session";
import { addCustomer } from "@/server/store";

export async function POST(request: Request) {
  return handle(async () => {
    const ctx = await requireCtx();
    const b = await readBody(request);
    return addCustomer(ctx, {
      phone: phone(b),
      name: str(b, "name", 80),
      address: optStr(b, "address", 300),
      khataEnabled: bool(b, "khataEnabled"),
      creditLimit: b.creditLimit === undefined ? 0 : int(b, "creditLimit", 0, 100_000_00),
      consentService: bool(b, "consentService"),
      consentMarketing: bool(b, "consentMarketing"),
    });
  });
}
