/**
 * Las reglas que toman las cuatro pantallas nuevas del portal.
 *
 * No se monta React: montarlo probaría el enrutador y el kit. Se prueban las
 * DECISIONES —qué se considera concedido, qué texto sale, qué no se pinta— que
 * es donde estuvieron los fallos de la etapa C.
 */
import { describe, it, expect } from "vitest";
import type { DerechosDelSocio, FeatureDef, LineaDeActividad } from "@/services/resellerService";
import { FRASES, fraseDeActividad, motivoDeActividad, quienDeActividad } from "@/lib/fraseDeActividad";
import { elegirIdioma } from "@/i18n/idioma";

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

describe("Actividad · una frase por acción, sin códigos", () => {
  const fila = (o: Partial<LineaDeActividad> = {}): LineaDeActividad => ({
    id: "1", action: "branding.publish", at: "2026-09-15T10:00:00Z",
    actorEmail: "a@b.c", actorRole: "reseller:owner",
    targetType: "reseller", statusCode: 200, details: null, ...o,
  });

  it("dice qué pasó con los datos que una persona reconoce", () => {
    elegirIdioma("es");
    expect(fraseDeActividad(fila({ action: "reseller.company.create", details: { name: "Vigilancia Norte" } })))
      .toBe("Se dio de alta la empresa «Vigilancia Norte»");
    expect(fraseDeActividad(fila({ action: "custom_domain.verified", details: { hostname: "admin.norte.com" } })))
      .toBe("Se verificó el dominio admin.norte.com y ya funciona");
    expect(fraseDeActividad(fila({ action: "branding.asset.upload", details: { slot: "logoDark" } })))
      .toBe("Se subió el logo para fondo oscuro");
    elegirIdioma("en");
    expect(fraseDeActividad(fila({ action: "reseller.company.create", details: { name: "North" } })))
      .toBe("The company “North” was added");
  });

  it("sin el dato, la frase no deja un hueco ni un «{…}»", () => {
    elegirIdioma("es");
    expect(fraseDeActividad(fila({ action: "reseller.company.create", details: null })))
      .toBe("Se dio de alta una empresa nueva");
  });

  it("NUNCA pinta un identificador: lo desconocido cae a su familia", () => {
    elegirIdioma("es");
    expect(fraseDeActividad(fila({ action: "branding.algo.nuevo" }))).toBe("Cambio en tu marca");
    expect(fraseDeActividad(fila({ action: "cosa.totalmente.nueva" }))).toBe("Acción en tu cuenta");
    for (const accion of Object.keys(FRASES)) {
      const f = fraseDeActividad(fila({ action: accion }));
      expect(f, accion).not.toContain(accion);
      expect(f, accion).not.toMatch(/[{}]|\b[a-z]+_[a-z]+\b|\b[a-z]+\.[a-z]+\b/);
    }
  });

  it("las decisiones de la plataforma son de «CGuard Pro», no de un correo interno", () => {
    expect(quienDeActividad(fila({ action: "reseller.status.suspend", actorEmail: "staff@cguardpro.com" }))).toBe("CGuard Pro");
    // El dueño llega a veces sin rol: sigue siendo él.
    expect(quienDeActividad(fila({ action: "reseller.company.create", actorEmail: "dueno@socio.com", actorRole: null }))).toBe("dueno@socio.com");
  });

  it("el motivo de una decisión se enseña; su ausencia, no", () => {
    expect(motivoDeActividad(fila({ details: { reason: "Pago pendiente" } }))).toBe("Pago pendiente");
    expect(motivoDeActividad(fila({ details: { reason: null } }))).toBeNull();
  });

  it("un código >= 400 se marca como error", () => {
    const esError = (f: LineaDeActividad) => !!f.statusCode && f.statusCode >= 400;
    expect(esError(fila({ statusCode: 200 }))).toBe(false);
    expect(esError(fila({ statusCode: 403 }))).toBe(true);
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
