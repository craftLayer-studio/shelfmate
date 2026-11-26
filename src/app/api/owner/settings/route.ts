import { BadRequest, bool, handle, int, optStr, phone, readBody, str } from "@/server/http";
import { requireCtx } from "@/server/session";
import { updateSettings } from "@/server/store";

export async function PUT(request: Request) {
  return handle(async () => {
    const ctx = await requireCtx("owner");
    const b = await readBody(request);
    const gstin = optStr(b, "gstin", 15).toUpperCase();
    if (gstin && gstin.length !== 15) throw new BadRequest("GSTIN has 15 characters");
    return updateSettings(ctx, {
      name: str(b, "name", 100),
      address: optStr(b, "address", 200),
      city: optStr(b, "city", 100),
      whatsappPhone: phone(b, "whatsappPhone"),
      upiVpa: str(b, "upiVpa", 100),
      gstin: gstin || null,
      composition: bool(b, "composition"),
      deliveryRadiusKm: int(b, "deliveryRadiusKm", 0, 20),
      minOrder: int(b, "minOrder", 0, 10_000_00),
      openMinute: int(b, "openMinute", 0, 1440),
      closeMinute: int(b, "closeMinute", 0, 1440),
      slotMinutes: int(b, "slotMinutes", 30, 120),
    });
  });
}
