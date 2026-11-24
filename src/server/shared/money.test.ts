import { describe, expect, it } from "vitest";
import {
  centsToInput,
  convertCents,
  currencySymbol,
  formatMoney,
  formatRate,
  MAX_AMOUNT_CENTS,
  parseAmountToCents,
  parseRate,
  splitEvenly,
} from "./money";

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

describe("exchange rates", () => {
  it.each([
    ["2.099,5", "2099.5"],
    ["2099.5", "2099.5"],
    ["1615", "1615"],
    ["1.615", "1615"], // in Argentina, the dot groups thousands
    ["1,615.25", "1615.25"],
    ["269,9577", "269.9577"],
    ["0,00062", "0.00062"],
    ["6.4349", "6.4349"],
    ["1,50", "1.5"],
    ["$ 1.450", "1450"],
  ])("parses %j as %s", (input, rate) => {
    expect(parseRate(input)).toBe(rate);
  });

  it.each(["", "0", "0,000", "-5", "abc", "1,123456789", "2.0995,5", "9999999999"])("rejects %j", (input) => {
    expect(parseRate(input)).toBeNull();
  });

  it("converts exactly, rounding half up to the cent", () => {
    expect(convertCents(12_000, "2099.5")).toBe(25_194_000); // US$ 120 at tarjeta
    expect(convertCents(120_000, "269.9577")).toBe(32_394_924); // R$ 1.200 → $ 323.949,24
    expect(convertCents(100, "0.005")).toBe(1); // 0,5 cents rounds up
    expect(convertCents(100, "0.004")).toBeNull(); // rounds to nothing
    // A float would drift here: 10^11 units × 1.1 = 110000000000.00000001…
    expect(convertCents(10_000_000_000_000 / 2, "1.1")).toBe(5_500_000_000_000);
  });

  it("formats rates for display and round-trips them", () => {
    expect(formatRate("2099.5")).toBe("2.099,5");
    expect(formatRate("1615")).toBe("1.615");
    expect(formatRate("0.00062")).toBe("0,00062");
    for (const rate of ["2099.5", "1615", "0.00062", "1234567.891"]) expect(parseRate(formatRate(rate))).toBe(rate);
  });

  it("knows each currency's symbol", () => {
    expect(currencySymbol("ARS")).toBe("$");
    expect(currencySymbol("USD")).toBe("US$");
    // es-AR shows less common currencies by their code, like formatMoney does.
    expect(currencySymbol("BRL")).toBe("BRL");
  });
});
