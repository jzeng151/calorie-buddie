import { describe, it, expect } from "vitest";
import {
  isValidMealType,
  parsePrefillCalories,
  parsePrefillName,
} from "@/lib/log/prefill";

describe("isValidMealType", () => {
  it("accepts known meal types", () => {
    expect(isValidMealType("breakfast")).toBe(true);
    expect(isValidMealType("lunch")).toBe(true);
    expect(isValidMealType("dinner")).toBe(true);
    expect(isValidMealType("snack")).toBe(true);
  });
  it("rejects unknown and null", () => {
    expect(isValidMealType("brunch")).toBe(false);
    expect(isValidMealType(null)).toBe(false);
    expect(isValidMealType("")).toBe(false);
  });
});

describe("parsePrefillCalories", () => {
  it('returns "" for null or empty', () => {
    expect(parsePrefillCalories(null)).toBe("");
    expect(parsePrefillCalories("")).toBe("");
  });
  it("parses positive integers", () => {
    expect(parsePrefillCalories("450")).toBe(450);
  });
  it("rounds decimals", () => {
    expect(parsePrefillCalories("450.6")).toBe(451);
  });
  it('rejects NaN-producing strings as ""', () => {
    expect(parsePrefillCalories("foo")).toBe("");
    expect(parsePrefillCalories("12abc")).toBe("");
  });
  it('rejects negatives and zero as ""', () => {
    expect(parsePrefillCalories("-1")).toBe("");
    expect(parsePrefillCalories("0")).toBe("");
  });
  it('rejects absurdly large values as ""', () => {
    expect(parsePrefillCalories("9999999")).toBe("");
  });
  it('rejects Infinity as ""', () => {
    expect(parsePrefillCalories("Infinity")).toBe("");
  });
});

describe("parsePrefillName", () => {
  it("returns empty when null", () => {
    expect(parsePrefillName(null)).toBe("");
  });
  it("truncates long names to 200 chars", () => {
    const long = "x".repeat(500);
    expect(parsePrefillName(long).length).toBe(200);
  });
  it("passes through normal names", () => {
    expect(parsePrefillName("Avocado Toast")).toBe("Avocado Toast");
  });
});
