export type Fulfilment = "delivery" | "pickup";
export type PaymentMode = "cod" | "upi" | "khata";
export type OrderStatus = "placed" | "accepted" | "packed" | "out_for_delivery" | "delivered" | "cancelled";

export const ORDER_STATUSES: readonly OrderStatus[] = ["placed", "accepted", "packed", "out_for_delivery", "delivered", "cancelled"];
export const FULFILMENTS: readonly Fulfilment[] = ["delivery", "pickup"];
export const PAYMENT_MODES: readonly PaymentMode[] = ["cod", "upi", "khata"];

export const PAYMENT_LABELS: Record<PaymentMode, string> = {
  cod: "Cash on delivery",
  upi: "UPI",
  khata: "Add to khata",
};

export function statusLabel(status: OrderStatus, fulfilment: Fulfilment): string {
  switch (status) {
    case "placed":
      return "New";
    case "accepted":
      return "Accepted";
    case "packed":
      return fulfilment === "pickup" ? "Ready for pickup" : "Packed";
    case "out_for_delivery":
      return "Out for delivery";
    case "delivered":
      return fulfilment === "pickup" ? "Picked up" : "Delivered";
    case "cancelled":
      return "Cancelled";
  }
}

/**
 * Allowed next states. Delivery: placed, accepted, packed, out for delivery, delivered.
 * Pickup skips "out for delivery". Cancel is allowed until the order leaves the shop.
 */
export function nextStatuses(status: OrderStatus, fulfilment: Fulfilment): OrderStatus[] {
  switch (status) {
    case "placed":
      return ["accepted", "cancelled"];
    case "accepted":
      return ["packed", "cancelled"];
    case "packed":
      return fulfilment === "delivery" ? ["out_for_delivery", "cancelled"] : ["delivered", "cancelled"];
    case "out_for_delivery":
      return ["delivered"];
    default:
      return [];
  }
}

export function canTransition(from: OrderStatus, to: OrderStatus, fulfilment: Fulfilment): boolean {
  return nextStatuses(from, fulfilment).includes(to);
}

export function isOpen(status: OrderStatus): boolean {
  return status !== "delivered" && status !== "cancelled";
}

/** The main forward action for the staff queue (the big button). */
export function primaryAction(status: OrderStatus, fulfilment: Fulfilment): { to: OrderStatus; label: string } | null {
  const next = nextStatuses(status, fulfilment).find((s) => s !== "cancelled");
  if (!next) return null;
  const labels: Record<OrderStatus, string> = {
    placed: "",
    accepted: "Accept",
    packed: fulfilment === "pickup" ? "Mark ready" : "Mark packed",
    out_for_delivery: "Out for delivery",
    delivered: fulfilment === "pickup" ? "Picked up" : "Delivered",
    cancelled: "",
  };
  return { to: next, label: labels[next] };
}
