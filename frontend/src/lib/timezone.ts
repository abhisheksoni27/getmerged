/**
 * Timezone utilities for UTC and Local Browser Time conversions
 * Story 7.1 / IDEA-20260819-01
 */

export function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

export function format12Hour(hour: number, minute: number = 0): string {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const period = normalizedHour >= 12 ? "PM" : "AM";
  const h12 = normalizedHour % 12 === 0 ? 12 : normalizedHour % 12;
  return minute === 0 ? `${h12}:00 ${period}` : `${h12}:${padZero(minute)} ${period}`;
}

export function formatUTCHour(hourUTC: number): string {
  if (typeof hourUTC !== "number" || Number.isNaN(hourUTC)) {
    return "00:00 UTC (12:00 AM UTC)";
  }
  const h = ((Math.floor(hourUTC) % 24) + 24) % 24;
  const h24 = `${padZero(h)}:00`;
  const h12 = format12Hour(h, 0);
  return `${h24} UTC (${h12} UTC)`;
}

export function formatUTCHourToLocal(hourUTC: number): string {
  if (typeof hourUTC !== "number" || Number.isNaN(hourUTC)) {
    return "12:00 AM";
  }
  const normalizedHour = ((Math.floor(hourUTC) % 24) + 24) % 24;
  const now = new Date();
  // Create a Date object corresponding to today at UTC normalizedHour
  const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), normalizedHour, 0, 0));
  if (Number.isNaN(utcDate.getTime())) {
    return format12Hour(normalizedHour, 0);
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(utcDate);
  } catch {
    return format12Hour(normalizedHour, 0);
  }
}

export function formatUTCRangeToLocal(startHourUTC: number, endHourUTC: number): string {
  const start = typeof startHourUTC === "number" && !Number.isNaN(startHourUTC) ? startHourUTC : 0;
  const end = typeof endHourUTC === "number" && !Number.isNaN(endHourUTC) ? endHourUTC : 0;
  const startStr = formatUTCHourToLocal(start);
  const endStr = formatUTCHourToLocal(end);
  return `${startStr} - ${endStr}`;
}

export function getUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Local Time";
  } catch {
    return "Local Time";
  }
}

