import { describe, it, expect } from "vitest";
import { toLocalDateStr, formatDateLabel } from "@/lib/date/local";

describe("toLocalDateStr", () => {
  it("returns YYYY-MM-DD", () => {
    const out = toLocalDateStr("2026-04-22T15:30:00.000Z");
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("zero-pads month and day", () => {
    const out = toLocalDateStr("2026-01-05T12:00:00.000Z");
    expect(out).toMatch(/^2026-01-0[45]$/); // TZ-dependent, but always padded
  });
});

describe("formatDateLabel", () => {
  it("returns Today when input matches today", () => {
    expect(formatDateLabel("2026-04-22", "2026-04-22", "2026-04-21")).toBe("Today");
  });

  it("returns Yesterday when input matches yesterday", () => {
    expect(formatDateLabel("2026-04-21", "2026-04-22", "2026-04-21")).toBe(
      "Yesterday",
    );
  });

  it("returns weekday + day + month for older dates", () => {
    const out = formatDateLabel("2026-04-15", "2026-04-22", "2026-04-21");
    // Locale-format e.g. "Wed, 15 Apr" or "Wed, Apr 15"
    expect(out).toMatch(/Apr/);
    expect(out).toMatch(/15/);
  });
});
