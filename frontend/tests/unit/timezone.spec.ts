import { test, expect } from "@playwright/test";
import { formatUTCHour, formatUTCRangeToLocal, formatUTCHourToLocal } from "../../src/lib/timezone";

test.describe("timezone conversion unit tests (IDEA-20260819-01)", () => {
  test("formatUTCHour returns standard 24h and 12h representation in UTC", () => {
    expect(formatUTCHour(14)).toBe("14:00 UTC (2:00 PM UTC)");
    expect(formatUTCHour(0)).toBe("00:00 UTC (12:00 AM UTC)");
    expect(formatUTCHour(9)).toBe("09:00 UTC (9:00 AM UTC)");
  });

  test("formatUTCHourToLocal converts UTC hour to user local time", () => {
    const formatted = formatUTCHourToLocal(14);
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe("string");
    expect(formatted.length).toBeGreaterThan(0);
  });

  test("formatUTCRangeToLocal converts UTC hour window to local time range", () => {
    const range = formatUTCRangeToLocal(14, 18);
    expect(range).toBeTruthy();
    expect(typeof range).toBe("string");
    expect(range).toContain(" - ");
  });
});
