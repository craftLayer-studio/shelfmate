import { randomBytes } from "node:crypto";

/**
 * Payment confirmation sits behind this interface. Customers pay with a UPI intent link (free);
 * confirming that money arrived needs a gateway webhook. The MVP ships only the `simulated`
 * adapter, which confirms instantly and makes no network call.
 */
export interface PaymentAdapter {
  readonly name: string;
  confirm(p: { amount: number; reference: string }): Promise<{ ok: boolean; reference: string }>;
}

export const simulatedPayments: PaymentAdapter = {
  name: "simulated",
  async confirm() {
    return { ok: true, reference: `SIM${randomBytes(4).toString("hex").toUpperCase()}` };
  },
};

let adapter: PaymentAdapter = simulatedPayments;
export const payments = (): PaymentAdapter => adapter;
export function setPaymentAdapter(a: PaymentAdapter): void {
  adapter = a;
}
