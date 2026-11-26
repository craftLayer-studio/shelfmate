/** India Standard Time is UTC+5:30 all year (no daylight saving). */
export const IST_OFFSET_MINUTES = 330;
export const DAY_MS = 86_400_000;
const OFFSET_MS = IST_OFFSET_MINUTES * 60_000;

/** Epoch ms of the most recent IST midnight. */
export function startOfDayIST(now: number): number {
  return Math.floor((now + OFFSET_MS) / DAY_MS) * DAY_MS - OFFSET_MS;
}

/** Epoch ms of the first IST midnight of the month containing `now`. */
export function startOfMonthIST(now: number): number {
  const d = new Date(now + OFFSET_MS);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - OFFSET_MS;
}

/** IST calendar date as "YYYY-MM-DD". */
export function istDate(now: number): string {
  return new Date(now + OFFSET_MS).toISOString().slice(0, 10);
}

/** Whole days from date `a` to date `b` (both "YYYY-MM-DD"). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

/** Add days to a "YYYY-MM-DD" date. */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "4:30 pm" in IST. */
export function formatTimeIST(ms: number): string {
  const d = new Date(ms + OFFSET_MS);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

/** "25 Nov 2026" in IST. */
export function formatDateIST(ms: number): string {
  const d = new Date(ms + OFFSET_MS);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "25 Nov, 4:30 pm" in IST. */
export function formatDateTimeIST(ms: number): string {
  const d = new Date(ms + OFFSET_MS);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${formatTimeIST(ms)}`;
}

/** Indian financial year (April to March) for a moment, e.g. "2026-27". */
export function financialYear(ms: number): string {
  const d = new Date(ms + OFFSET_MS);
  const y = d.getUTCFullYear();
  const start = d.getUTCMonth() >= 3 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}
