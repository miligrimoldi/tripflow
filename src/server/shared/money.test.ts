import { describe, expect, it } from "vitest";
import { centsToInput, formatMoney, MAX_AMOUNT_CENTS, parseAmountToCents, splitEvenly } from "./money";

describe("parseAmountToCents", () => {
  it.each([
    ["1500", 150_000],
    ["1.500", 150_000],
    ["1.500.000", 150_000_000],
    ["1.234,50", 123_450],
    ["1,234.50", 123_450],
    ["12,5", 1_250],
    ["12.50", 1_250],
    ["0,99", 99],
    ["$ 2.000", 200_000],
    [" 75 ", 7_500],
    ["1 500", 150_000],
    // A single separator followed by 3 digits groups thousands, like "1.500".
    ["12,505", 1_250_500],
  ])("parses %j as %i cents", (input, cents) => {
    expect(parseAmountToCents(input)).toBe(cents);
  });

  it.each(["", "abc", "-100", "0", "0,00", "12,345,6", "1,2,3.4,5", "12.", "1.5e3", "1.5000", "1.50.000"])(
    "rejects %j",
    (input) => {
      expect(parseAmountToCents(input)).toBeNull();
    },
  );

  it("rejects absurdly large amounts", () => {
    expect(parseAmountToCents(String(MAX_AMOUNT_CENTS))).toBeNull();
  });
});

describe("centsToInput", () => {
  it("round-trips through parseAmountToCents", () => {
    for (const cents of [100, 150_000, 123_450, 99, 1_250]) {
      expect(parseAmountToCents(centsToInput(cents))).toBe(cents);
    }
  });
});

describe("formatMoney", () => {
  it("formats with the trip currency in Argentine style", () => {
    expect(formatMoney(123_450, "ARS").replace(/\s/g, " ")).toBe("$ 1.234,50");
    expect(formatMoney(150_000, "USD").replace(/\s/g, " ")).toBe("US$ 1.500,00");
  });
});

describe("splitEvenly", () => {
  it("never loses or invents a cent", () => {
    expect(splitEvenly(1000, 3)).toEqual([334, 333, 333]);
    expect(splitEvenly(1000, 3).reduce((a, b) => a + b, 0)).toBe(1000);
    expect(splitEvenly(5, 0)).toEqual([]);
  });
});
