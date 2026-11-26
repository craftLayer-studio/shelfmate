import { formatINR } from "./money";

/** wa.me click-to-chat link (free, opens WhatsApp with a pre-filled message). */
export function waMeLink(phoneE164: string, text: string): string {
  return `https://wa.me/${phoneE164.replace(/^\+/, "")}?text=${encodeURIComponent(text)}`;
}

export function orderPlacedText(p: { store: string; number: number; total: number; trackUrl: string }): string {
  return `Thank you! ${p.store} received your order #${p.number} for ${formatINR(p.total)}. Track it here: ${p.trackUrl}`;
}

export function orderStatusText(p: { store: string; number: number; statusLabel: string; trackUrl: string }): string {
  return `${p.store}: your order #${p.number} is now "${p.statusLabel}". ${p.trackUrl}`;
}

/** Message the customer sends to the store's own WhatsApp after placing an order. */
export function orderToStoreText(p: {
  number: number;
  name: string;
  lines: { name: string; qty: string }[];
  total: number;
  fulfilment: string;
  slot: string;
  payment: string;
}): string {
  const items = p.lines.map((l) => `- ${l.name} x ${l.qty}`).join("\n");
  return `New order #${p.number} from ${p.name}\n${items}\nTotal ${formatINR(p.total)}\n${p.fulfilment}, ${p.slot}\nPayment: ${p.payment}`;
}

export function khataReminderText(p: { store: string; name: string; balance: number; payUrl: string }): string {
  return `Namaste ${p.name}, your balance at ${p.store} is ${formatINR(p.balance)}. View and pay by UPI: ${p.payUrl}. Reply STOP to opt out.`;
}

export function offerText(p: { store: string; message: string; catalogUrl: string }): string {
  return `${p.store}: ${p.message} Order here: ${p.catalogUrl}. Reply STOP to opt out.`;
}
