import { describe, expect, it } from "vitest";

import { aCentavos } from "@/lib/importeEscrito";
import { precio } from "@/lib/dinero";

describe("aCentavos: an amount reads the way its writer meant", () => {
  it.each([
    ["1500", 150000],
    ["1,500", 150000],
    ["1.500", 150000],
    ["1.500,50", 150050],
    ["1,500.50", 150050],
    ["12,5", 1250],
    ["12.50", 1250],
    ["$ 1.234.567,89", 123456789],
    ["1 500,00", 150000],
  ])("%s → %i cents", (texto, cents) => {
    expect(aCentavos(texto)).toBe(cents);
  });

  it("empty is null, nonsense is NaN", () => {
    expect(aCentavos("")).toBeNull();
    expect(aCentavos("abc")).toBeNaN();
    expect(aCentavos("1.5000")).toBeNaN();
    expect(aCentavos("12.345,6.7")).toBeNaN();
  });
});

describe("precio: punctuation follows the currency, and the code always shows", () => {
  it.each([
    [150000, "USD", "$1,500 USD"],
    [150050, "MXN", "$1,500.50 MXN"],
    [150050, "ARS", "$ 1.500,50 ARS"],
    [150000, "PEN", "S/ 1,500 PEN"],
  ])("%i %s → %s", (cents, moneda, texto) => {
    expect(precio(cents, moneda)).toBe(texto);
  });
});
