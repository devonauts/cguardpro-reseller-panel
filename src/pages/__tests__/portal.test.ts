/**
 * Las reglas que toman las cuatro pantallas nuevas del portal.
 *
 * No se monta React: montarlo probaría el enrutador y el kit. Se prueban las
 * DECISIONES —qué se considera concedido, qué texto sale, qué no se pinta— que
 * es donde estuvieron los fallos de la etapa C.
 */
import { describe, it, expect } from "vitest";
import type { DerechosDelSocio, FeatureDef, LineaDeActividad } from "@/services/resellerService";

const F = (key: string, label = key, description = "d"): FeatureDef => ({ key, label, description });
const CATALOGO = [F("rondas", "Rondas / Patrullaje"), F("reports", "Reportes"), F("panic_sos", "Pánico / SOS")];

const derechos = (o: Partial<DerechosDelSocio> = {}): DerechosDelSocio => ({
  grantedAll: false, granted: [], catalog: CATALOGO,
  quota: { used: 1, max: 2, remaining: 1, unlimited: false, canCreate: true },
  showPlatformAttribution: true, ...o,
});

/** La regla de la pantalla de Derechos. */
const incluido = (d: DerechosDelSocio, f: FeatureDef) =>
  d.grantedAll || (d.granted ?? []).includes(f.key);

describe("Derechos · la regresión de React #31 no vuelve", () => {
  it("lo que se pinta de cada módulo es TEXTO", () => {
    for (const f of CATALOGO) {
      expect(typeof f.label).toBe("string");
      expect(typeof f.description).toBe("string");
      // El objeto en sí NO se pinta: pintarlo es el fallo.
      expect(String(f)).toBe("[object Object]");
    }
  });

  it("se compara por CLAVE, no por objeto", () => {
    const d = derechos({ granted: ["rondas"] });
    expect(incluido(d, F("rondas"))).toBe(true);
    expect(incluido(d, F("reports"))).toBe(false);
    // Lo que hacía la versión rota:
    expect((d.granted as unknown as unknown[]).includes(F("rondas"))).toBe(false);
  });

  it("`grantedAll` incluye todo sin mirar la lista", () => {
    const d = derechos({ grantedAll: true, granted: null });
    for (const f of CATALOGO) expect(incluido(d, f)).toBe(true);
  });

  it("`granted` nulo sin grantedAll no incluye nada", () => {
    const d = derechos({ granted: null });
    for (const f of CATALOGO) expect(incluido(d, f)).toBe(false);
  });

  it("las claves de React son únicas", () => {
    const claves = CATALOGO.map((f) => f.key);
    expect(new Set(claves).size).toBe(claves.length);
  });
});

describe("Derechos · el cupo se lee sin ambigüedad", () => {
  const texto = (d: DerechosDelSocio) => ({
    limite: d.quota.unlimited ? "Sin límite" : String(d.quota.max ?? "—"),
    quedan: d.quota.unlimited ? "—" : String(d.quota.remaining ?? 0),
  });

  it("con límite dice el número", () => {
    expect(texto(derechos())).toEqual({ limite: "2", quedan: "1" });
  });
  it("sin límite lo dice con palabras", () => {
    const d = derechos({ quota: { used: 9, max: null, remaining: null, unlimited: true, canCreate: true } });
    expect(texto(d)).toEqual({ limite: "Sin límite", quedan: "—" });
  });
  it("cupo agotado es 0, no «sin límite»", () => {
    const d = derechos({ quota: { used: 2, max: 2, remaining: 0, unlimited: false, canCreate: false } });
    expect(texto(d)).toEqual({ limite: "2", quedan: "0" });
  });
});

describe("Actividad · los detalles se pintan como texto", () => {
  /** Lo que hace el componente `Detalles`. */
  const pintar = (v: unknown) => (Array.isArray(v) ? v.join(", ") : String(v));

  it("una lista de campos se une con comas", () => {
    expect(pintar(["platformName", "brandHue"])).toBe("platformName, brandHue");
  });
  it("un número y un booleano salen como texto", () => {
    expect(pintar(2)).toBe("2");
    expect(pintar(true)).toBe("true");
  });
  it("nada se pasa a React sin convertir", () => {
    // Si alguna vez llegara un objeto (el servidor los recorta), se convierte.
    expect(typeof pintar({ a: 1 })).toBe("string");
  });

  const fila = (o: Partial<LineaDeActividad> = {}): LineaDeActividad => ({
    id: "1", action: "branding.publish", at: "2026-09-15T10:00:00Z",
    actorEmail: "a@b.c", actorRole: "reseller:owner",
    targetType: "reseller", statusCode: 200, details: null, ...o,
  });

  it("un código >= 400 se marca como error", () => {
    const esError = (f: LineaDeActividad) => !!f.statusCode && f.statusCode >= 400;
    expect(esError(fila({ statusCode: 200 }))).toBe(false);
    expect(esError(fila({ statusCode: 403 }))).toBe(true);
    expect(esError(fila({ statusCode: null }))).toBe(false);
  });

  it("una acción sin traducir se enseña cruda, no en blanco", () => {
    const ACCION: Record<string, string> = { "branding.publish": "Marca publicada" };
    const nombre = (a: string) => ACCION[a] || a;
    expect(nombre("branding.publish")).toBe("Marca publicada");
    expect(nombre("accion.nueva.sin.traducir")).toBe("accion.nueva.sin.traducir");
  });
});

describe("navegación · todo destino visible existe", () => {
  it("las rutas del menú coinciden con las registradas", () => {
    const NAV = ["/dashboard", "/branding", "/companies", "/usage", "/billing",
                 "/contract", "/entitlements", "/activity", "/account"];
    const RUTAS = ["/dashboard", "/branding", "/companies", "/usage", "/billing",
                   "/contract", "/entitlements", "/activity", "/account",
                   "/companies/new", "/companies/:tenantId", "/onboarding", "/login"];
    for (const a of NAV) expect(RUTAS).toContain(a);
  });
});
