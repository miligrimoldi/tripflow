import { describe, expect, it } from "vitest";
import { ValidationError } from "../shared/errors";
import type { Currency } from "../shared/money";
import type { ExchangeRateSource } from "./exchange-rate";
import { invertRate, toRateString } from "./exchange-rate";
import { ExchangeRateService } from "./exchange-rate.service";

const source = (supported: [Currency, Currency], rate: string, failing = false): ExchangeRateSource => ({
  supports: (from, to) => from === supported[0] && to === supported[1],
  quotes: async () => {
    if (failing) throw new Error("down");
    return [{ id: "x", label: "X", rate }];
  },
});

describe("ExchangeRateService", () => {
  const service = new ExchangeRateService([source(["USD", "ARS"], "2099.5"), source(["EUR", "USD"], "1.09")]);

  it("asks the first source that supports the pair", async () => {
    expect(await service.quotes({ from: "USD", to: "ARS" })).toEqual([{ id: "x", label: "X", rate: "2099.5" }]);
    expect(await service.quotes({ from: "EUR", to: "USD" })).toEqual([{ id: "x", label: "X", rate: "1.09" }]);
  });

  it("has nothing to suggest for the same currency or unsupported pairs", async () => {
    expect(await service.quotes({ from: "ARS", to: "ARS" })).toEqual([]);
    expect(await service.quotes({ from: "CLP", to: "GBP" })).toEqual([]);
  });

  it("returns no suggestions (instead of failing) when a source is down", async () => {
    const down = new ExchangeRateService([source(["USD", "ARS"], "1", true)]);
    expect(await down.quotes({ from: "USD", to: "ARS" })).toEqual([]);
  });

  it("validates currencies", async () => {
    await expect(service.quotes({ from: "XXX", to: "ARS" })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("rate helpers", () => {
  it("normalizes floats to at most 8 decimals", () => {
    expect(toRateString(2099.5)).toBe("2099.5");
    expect(toRateString(1 / 3)).toBe("0.33333333");
    expect(toRateString(0)).toBeNull();
    expect(toRateString(1e-10)).toBeNull();
  });

  it("inverts rates", () => {
    expect(invertRate("1615")).toBe("0.0006192");
  });
});
