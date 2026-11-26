/**
 * Indian mobile numbers in E.164 ("+91" + 10 digits starting 6-9).
 * Customers and staff are keyed by this form per org.
 */
export function normalizeIndianPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "");
  const m = /^(?:\+?91|0)?([6-9]\d{9})$/.exec(digits);
  return m ? `+91${m[1]}` : null;
}

/** "+919876543210" -> "+91 98765 43210" for display. */
export function formatPhone(e164: string): string {
  const m = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}

/** Mask all but the last 4 digits, for public pages. */
export function maskPhone(e164: string): string {
  return e164.length > 4 ? `${"•".repeat(6)}${e164.slice(-4)}` : e164;
}
