/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL PANEL SE VISTE CON LA MARCA DE SU SOCIO — Y NUNCA CON LA DE CGUARDPRO
 *
 * Lo que se prueba es la regla, no el DOM: qué se elige para cada superficie y,
 * sobre todo, qué se elige cuando NO hay imagen. Ésa es la que protege la marca
 * blanca — con `showPlatformAttribution=false`, caer al logotipo de la
 * plataforma filtraría por accidente justo la identidad que el socio paga por
 * ocultar.
 * ════════════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from "vitest";
import { logoDeCabecera, marcaCompacta } from "../marcaDelSocio";
import type { MarcaParaPintar } from "@/services/resellerService";

const marca = (a: Partial<MarcaParaPintar["assets"]> = {}): MarcaParaPintar => ({
  platformName: "Socio Piloto", loginTagline: null,
  brandHue: 250, brandChroma: 0.09,
  supportEmail: null, supportUrl: null, supportPhone: null, publishedAt: null,
  assets: {
    fullLight: null, fullDark: null, markLight: null,
    markDark: null, favicon: null, email: null, ...a,
  },
});

describe("marca del socio · qué logotipo se pinta", () => {
  it("en claro usa el claro y en oscuro el oscuro", () => {
    const m = marca({ fullLight: "L", fullDark: "LD" });
    expect(logoDeCabecera(m, false)).toBe("L");
    expect(logoDeCabecera(m, true)).toBe("LD");
  });

  it("el servidor ya resolvió el respaldo: aquí no se vuelve a decidir", () => {
    /* Con sólo el claro configurado, el servidor manda el claro en las DOS
       ranuras. El panel no tiene una segunda cadena de respaldos. */
    const m = marca({ fullLight: "L", fullDark: "L" });
    expect(logoDeCabecera(m, true)).toBe("L");
  });

  it("LA QUE IMPORTA · sin imagen devuelve null, nunca un activo de CGuardPro", () => {
    const m = marca();
    expect(logoDeCabecera(m, false)).toBeNull();
    expect(logoDeCabecera(m, true)).toBeNull();
    expect(marcaCompacta(m, false)).toBeNull();
    expect(marcaCompacta(m, true)).toBeNull();
  });

  it("sin marca ninguna tampoco revienta", () => {
    for (const v of [null, undefined]) {
      expect(logoDeCabecera(v, false)).toBeNull();
      expect(marcaCompacta(v, true)).toBeNull();
    }
  });

  it("la marca compacta sigue su propia ranura", () => {
    const m = marca({ markLight: "M", markDark: "MD" });
    expect(marcaCompacta(m, false)).toBe("M");
    expect(marcaCompacta(m, true)).toBe("MD");
  });
});

describe("marca del socio · el nombre que se enseña", () => {
  /** La misma precedencia que aplica el armazón. */
  const nombre = (pub: string | null, display: string | null, legal: string | null) =>
    pub || display || legal || "Panel de socio";

  it("manda el nombre PUBLICADO", () => {
    expect(nombre("Mi Plataforma", "Socio S.A.", "Socio S.A. de C.V.")).toBe("Mi Plataforma");
  });
  it("sin publicar, el comercial", () => {
    expect(nombre(null, "Socio S.A.", "Socio S.A. de C.V.")).toBe("Socio S.A.");
  });
  it("y de último un rótulo neutro que NO nombra a CGuardPro", () => {
    const n = nombre(null, null, null);
    expect(n).toBe("Panel de socio");
    expect(n).not.toMatch(/CGuard/i);
  });
});
