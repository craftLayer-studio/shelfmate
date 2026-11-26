import { schema } from "../db";
import { newId, type Q } from "./core";

export type OutboxKind = "order_update" | "khata_reminder" | "offer" | "otp";

export interface OutgoingMessage {
  orgId: string;
  toPhone: string;
  customerId?: string | null;
  kind: OutboxKind;
  body: string;
  campaignId?: string;
}

/**
 * WhatsApp/SMS delivery sits behind this interface. The only adapter in the MVP is `simulated`:
 * it writes the message to the `outbox` table (shown in the app) and makes no network call.
 * A real BSP adapter would implement the same interface.
 */
export interface MessageAdapter {
  readonly name: string;
  send(q: Q, msg: OutgoingMessage, channel: "whatsapp" | "sms"): Promise<void>;
}

export const simulatedMessaging: MessageAdapter = {
  name: "simulated",
  async send(q, msg, channel) {
    await q.insert(schema.outbox).values({
      id: newId(),
      orgId: msg.orgId,
      channel,
      toPhone: msg.toPhone,
      customerId: msg.customerId ?? null,
      kind: msg.kind,
      body: msg.body,
      status: "sent",
      campaignId: msg.campaignId,
    });
  },
};

let adapter: MessageAdapter = simulatedMessaging;
export const messaging = (): MessageAdapter => adapter;
export function setMessagingAdapter(a: MessageAdapter): void {
  adapter = a;
}

/** Record a message we chose not to send (no consent), so the owner can see why. */
export async function recordSkipped(q: Q, msg: OutgoingMessage, reason: string): Promise<void> {
  await q.insert(schema.outbox).values({
    id: newId(),
    orgId: msg.orgId,
    channel: "whatsapp",
    toPhone: msg.toPhone,
    customerId: msg.customerId ?? null,
    kind: msg.kind,
    body: msg.body,
    status: "skipped",
    reason,
    campaignId: msg.campaignId,
  });
}
