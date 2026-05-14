import { describe, it, expect } from "vitest";
import { escapeIlike } from "@/lib/text/escape";

describe("escapeIlike", () => {
  it("passes through plain text unchanged", () => {
    expect(escapeIlike("alice")).toBe("alice");
  });

  it("escapes percent wildcards", () => {
    expect(escapeIlike("%")).toBe("\\%");
    expect(escapeIlike("100%cool")).toBe("100\\%cool");
  });

  it("escapes underscore single-char wildcards", () => {
    expect(escapeIlike("a_b")).toBe("a\\_b");
  });

  it("escapes backslashes (so they cannot un-escape user input)", () => {
    expect(escapeIlike("\\%")).toBe("\\\\\\%");
  });

  it("returns empty string unchanged", () => {
    expect(escapeIlike("")).toBe("");
  });

  it("a bare % no longer matches everything when escaped", () => {
    // The reviewer-flagged attack was searching with just '%' to harvest the
    // whole user table. After escaping that pattern is a literal '%'.
    expect(escapeIlike("%")).not.toBe("%");
  });
});
