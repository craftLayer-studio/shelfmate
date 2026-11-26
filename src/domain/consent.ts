/**
 * DPDP Act 2023 consent. Two separate purposes, each opted in with its own unticked box:
 * - service: order updates and khata payment reminders
 * - marketing: offers and new-stock messages
 */
export type ConsentPurpose = "service" | "marketing";
export type ConsentChannel = "qr" | "counter" | "statement" | "whatsapp";
export const CONSENT_PURPOSES: readonly ConsentPurpose[] = ["service", "marketing"];

/** Bump when the notice text changes; every consent record stores the version shown. */
export const NOTICE_VERSION = "2026-11-v1";

export const CONSENT_NOTICE: Record<ConsentPurpose, string> = {
  service: "Send me order updates and khata payment reminders on WhatsApp.",
  marketing: "Send me offers and new-stock messages on WhatsApp (at most a few a month).",
};

export interface ConsentRecordLike {
  purpose: ConsentPurpose;
  granted: boolean;
  createdAt: number;
}

/** Current state per purpose: the latest record wins; no record means not consented. */
export function currentConsent(records: readonly ConsentRecordLike[]): Record<ConsentPurpose, boolean> {
  const out: Record<ConsentPurpose, boolean> = { service: false, marketing: false };
  const latest: Partial<Record<ConsentPurpose, number>> = {};
  for (const r of records) {
    if (latest[r.purpose] === undefined || r.createdAt >= latest[r.purpose]!) {
      latest[r.purpose] = r.createdAt;
      out[r.purpose] = r.granted;
    }
  }
  return out;
}

/** Message categories map to consent purposes. OTPs go to staff, not customers. */
export type MessageKind = "order_update" | "khata_reminder" | "offer";

export function purposeFor(kind: MessageKind): ConsentPurpose {
  return kind === "offer" ? "marketing" : "service";
}

export function maySend(kind: MessageKind, consent: Record<ConsentPurpose, boolean>): boolean {
  return consent[purposeFor(kind)];
}

/** A customer reply of STOP (or common variants) withdraws all consent. */
export function isStopWord(text: string): boolean {
  return /^(stop|unsubscribe|band karo|bandh)$/i.test(text.trim());
}
