import { describe, expect, it } from "vitest";
import { correoValido, webValida } from "@/lib/formato";

describe("formato", () => {
  it("correoValido", () => {
    expect(correoValido("ana@guardia.mx")).toBe(true);
    expect(correoValido(" ana@guardia.mx ")).toBe(true);
    expect(correoValido("ana@guardia")).toBe(false);
    expect(correoValido("ana guardia@x.mx")).toBe(false);
    expect(correoValido("")).toBe(false);
  });
  it("webValida", () => {
    expect(webValida("https://ayuda.guardia.mx")).toBe(true);
    expect(webValida("ayuda.guardia.mx")).toBe(false);
    expect(webValida("javascript:alert(1)")).toBe(false);
    expect(webValida("https://localhost")).toBe(false);
  });
});
