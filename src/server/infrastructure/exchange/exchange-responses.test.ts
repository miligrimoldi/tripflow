import { describe, expect, it } from "vitest";
import { parseDolarApiQuotes } from "./dolarapi-response";
import { parseFrankfurterQuote } from "./frankfurter-response";

const dolares = [
  { moneda: "USD", casa: "oficial", nombre: "Oficial", compra: 1565, venta: 1615 },
  { moneda: "USD", casa: "blue", nombre: "Blue", compra: 1670, venta: 1690 },
  { moneda: "USD", casa: "bolsa", nombre: "Bolsa", compra: 1683.7, venta: 1685.2 },
  { moneda: "USD", casa: "mayorista", nombre: "Mayorista", compra: 1584, venta: 1593 },
  { moneda: "USD", casa: "tarjeta", nombre: "Tarjeta", compra: 2034.5, venta: 2099.5 },
];

describe("parseDolarApiQuotes", () => {
  it("returns the dollar rates people use, card first, at the selling price", () => {
    expect(parseDolarApiQuotes(dolares, { inverse: false })).toEqual([
      { id: "tarjeta", label: "Tarjeta", rate: "2099.5" },
      { id: "oficial", label: "Oficial", rate: "1615" },
      { id: "blue", label: "Blue", rate: "1690" },
      { id: "mep", label: "MEP", rate: "1685.2" },
    ]);
  });

  it("reads a single currency quote (euros, reales…)", () => {
    const brl = { moneda: "BRL", casa: "oficial", nombre: "Real Brasileño", compra: 260.1, venta: 269.9577 };
    expect(parseDolarApiQuotes(brl, { inverse: false })).toEqual([
      { id: "oficial", label: "Oficial", rate: "269.9577" },
    ]);
  });

  it("inverts rates for expenses paid in pesos on trips kept in another currency", () => {
    expect(parseDolarApiQuotes(dolares, { inverse: true })[1]).toEqual({
      id: "oficial",
      label: "Oficial",
      rate: "0.0006192",
    });
  });

  it("rejects unexpected responses", () => {
    expect(() => parseDolarApiQuotes({ error: "not found" }, { inverse: false })).toThrow();
  });
});

describe("parseFrankfurterQuote", () => {
  it("reads the ECB rate for the target currency", () => {
    const json = { amount: 1, base: "EUR", date: "2026-11-24", rates: { USD: 1.0963 } };
    expect(parseFrankfurterQuote(json, "USD")).toEqual([{ id: "bce", label: "Oficial (BCE)", rate: "1.0963" }]);
    expect(parseFrankfurterQuote(json, "BRL")).toEqual([]);
  });
});
