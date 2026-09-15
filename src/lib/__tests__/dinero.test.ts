/**
 * El dinero se pinta desde CENTAVOS ENTEROS y en un solo sitio.
 *
 * Había dos formateadores divergentes en el panel; el Contrato habría sido el
 * tercero. Lo que se prueba es que el entero se parte en unidades y centavos
 * sin pasar por coma flotante, y que la moneda del contrato se respeta.
 */
import { describe, it, expect } from "vitest";
import { dinero, fecha, fechaYHora } from "../dinero";

describe("dinero · centavos enteros a texto", () => {
  it("parte el entero en unidades y centavos", () => {
    expect(dinero(150000, "USD")).toMatch(/^1.234?\D?500?[.,]00 USD$|^1\D?500[.,]00 USD$/);
    expect(dinero(1000, "USD")).toMatch(/^10[.,]00 USD$/);
    expect(dinero(100, "USD")).toMatch(/^1[.,]00 USD$/);
  });

  it("los centavos sueltos no se pierden ni se redondean", () => {
    expect(dinero(1, "USD")).toMatch(/^0[.,]01 USD$/);
    expect(dinero(99, "USD")).toMatch(/^0[.,]99 USD$/);
    expect(dinero(101, "USD")).toMatch(/^1[.,]01 USD$/);
  });

  it("cero es cero, no vacío", () => {
    expect(dinero(0, "USD")).toMatch(/^0[.,]00 USD$/);
  });

  it("respeta la moneda del contrato, no fuerza dólares", () => {
    expect(dinero(1000, "EUR")).toContain("EUR");
    expect(dinero(1000, "COP")).toContain("COP");
  });

  it("un negativo lleva el signo menos tipográfico", () => {
    expect(dinero(-500, "USD")).toMatch(/^−5[.,]00 USD$/);
  });

  it("lo que no es un número es una raya, no «NaN»", () => {
    for (const v of [null, undefined, NaN, "hola" as never]) {
      expect(dinero(v as never, "USD")).toBe("—");
    }
  });

  it("no hay coma flotante por medio: 1/3 de dólar no existe", () => {
    // 3 centavos son 3 centavos, no 0.030000000000000002
    expect(dinero(3, "USD")).toMatch(/^0[.,]03 USD$/);
  });
});

describe("fechas", () => {
  it("una fecha válida se escribe; una inválida es una raya", () => {
    expect(fecha("2026-09-15")).not.toBe("—");
    expect(fecha("no es fecha")).toBe("—");
    expect(fecha(null)).toBe("—");
    expect(fechaYHora("2026-09-15T10:00:00Z")).not.toBe("—");
    expect(fechaYHora(undefined)).toBe("—");
  });
});
