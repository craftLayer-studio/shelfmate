import { DAY_MS, IST_OFFSET_MINUTES, formatTimeIST, startOfDayIST } from "./time";

export interface StoreHours {
  /** Minutes after IST midnight. 8:00 am = 480. */
  openMinute: number;
  closeMinute: number;
  slotMinutes: number;
}

export interface Slot {
  start: number;
  end: number;
  label: string;
}

/** Minimum time to pack an order before its slot starts. */
export const LEAD_MINUTES = 30;

/** Delivery or pickup slots for today and tomorrow (IST) that start at least LEAD_MINUTES from now. */
export function upcomingSlots(now: number, hours: StoreHours, days = 2): Slot[] {
  if (hours.slotMinutes < 15 || hours.closeMinute <= hours.openMinute) return [];
  const slots: Slot[] = [];
  const today = startOfDayIST(now);
  for (let d = 0; d < days; d++) {
    const day = today + d * DAY_MS;
    for (let m = hours.openMinute; m + hours.slotMinutes <= hours.closeMinute; m += hours.slotMinutes) {
      const start = day + m * 60_000;
      const end = start + hours.slotMinutes * 60_000;
      if (start < now + LEAD_MINUTES * 60_000) continue;
      slots.push({ start, end, label: `${d === 0 ? "Today" : "Tomorrow"} ${formatTimeIST(start)} to ${formatTimeIST(end)}` });
    }
  }
  return slots;
}

export function isValidSlot(now: number, hours: StoreHours, start: number): boolean {
  return upcomingSlots(now, hours).some((s) => s.start === start);
}

/** "8:00 am" from minutes after midnight. */
export function minuteLabel(minute: number): string {
  return formatTimeIST(minute * 60_000 - IST_OFFSET_MINUTES * 60_000);
}
