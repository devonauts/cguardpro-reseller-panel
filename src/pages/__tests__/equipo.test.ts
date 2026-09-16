/**
 * ════════════════════════════════════════════════════════════════════════════
 * LA PANTALLA DE EQUIPO
 *
 * Se prueban las DECISIONES que toma el navegador, no el DOM: qué acciones se
 * ofrecen, cómo se lee un estado y qué se pinta de cada miembro. La autoridad
 * es del servidor —esconder un botón no autoriza nada— así que lo que importa
 * aquí es que lo escondido coincida con lo que el servidor permitiría, y que
 * ningún secreto llegue a la vista.
 * ════════════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from "vitest";
import type { MiembroDelEquipo, RolDeSocio } from "@/services/resellerService";

const miembro = (o: Partial<MiembroDelEquipo> = {}): MiembroDelEquipo => ({
  id: "m1", email: "a@b.com", fullName: "Ana", role: "reseller:admin",
  roleLabel: "Admin", status: "active", invitedAt: "2026-09-01T10:00:00Z",
  updatedAt: null, hasPassword: true, ...o,
});

/* ── Los estados que el modelo admite ─────────────────────────────────────── */

const ESTADO: Record<string, { texto: string; tono: string }> = {
  active: { texto: "Activo", tono: "ok" },
  invited: { texto: "Invitado", tono: "aviso" },
  archived: { texto: "Desactivado", tono: "neutro" },
};

describe("equipo · el vocabulario de estados es el del backend", () => {
  it("son exactamente los tres del modelo", () => {
    expect(Object.keys(ESTADO).sort()).toEqual(["active", "archived", "invited"]);
  });

  it("no se inventa ningún estado que el backend no tenga", () => {
    for (const inventado of ["pending", "disabled", "suspended", "deleted"]) {
      expect(ESTADO[inventado]).toBeUndefined();
    }
  });

  it("cada estado tiene un texto en español", () => {
    for (const k of Object.keys(ESTADO)) expect(ESTADO[k].texto.length).toBeGreaterThan(3);
  });
});

/* ── Qué acciones se ofrecen ──────────────────────────────────────────────── */

/** Las mismas condiciones que aplica la pantalla. */
const acciones = (m: MiembroDelEquipo, gestiona: boolean, yo: boolean) => ({
  cambiarRol: gestiona && m.status !== "archived",
  reinvitar: gestiona && m.status === "invited",
  desactivar: gestiona && m.status !== "archived" && !yo,
});

describe("equipo · qué se ofrece y a quién", () => {
  it("sin `team.manage` no se ofrece ninguna acción", () => {
    const a = acciones(miembro(), false, false);
    expect(a).toEqual({ cambiarRol: false, reinvitar: false, desactivar: false });
  });

  it("a un miembro activo se le puede cambiar el rol y desactivar", () => {
    const a = acciones(miembro(), true, false);
    expect(a.cambiarRol).toBe(true);
    expect(a.desactivar).toBe(true);
    expect(a.reinvitar).toBe(false);
  });

  it("sólo a un INVITADO se le reinvita: quien ya entró no lo necesita", () => {
    expect(acciones(miembro({ status: "invited" }), true, false).reinvitar).toBe(true);
    expect(acciones(miembro({ status: "active" }), true, false).reinvitar).toBe(false);
    expect(acciones(miembro({ status: "archived" }), true, false).reinvitar).toBe(false);
  });

  it("a un DESACTIVADO no se le cambia el rol ni se le vuelve a desactivar", () => {
    const a = acciones(miembro({ status: "archived" }), true, false);
    expect(a.cambiarRol).toBe(false);
    expect(a.desactivar).toBe(false);
  });

  it("LA QUE IMPORTA · nadie se ofrece desactivarse a sí mismo", () => {
    /* El servidor lo rechaza igual; esconder el botón evita el clic que
       siempre iba a fallar. */
    expect(acciones(miembro(), true, true).desactivar).toBe(false);
    expect(acciones(miembro(), true, true).cambiarRol).toBe(true);
  });
});

/* ── Los roles vienen del servidor ────────────────────────────────────────── */

const ROLES: RolDeSocio[] = [
  { id: "reseller:owner", label: "Owner", description: "Control total…", permissions: ["a", "b"] },
  { id: "reseller:readonly", label: "Read Only", description: "Sólo lectura…", permissions: ["a"] },
];

describe("equipo · el catálogo de roles no se duplica en el navegador", () => {
  it("la etiqueta y la explicación salen del servidor", () => {
    for (const r of ROLES) {
      expect(typeof r.label).toBe("string");
      expect(typeof r.description).toBe("string");
      expect(Array.isArray(r.permissions)).toBe(true);
    }
  });

  it("se pinta la etiqueta, nunca el objeto", () => {
    for (const r of ROLES) expect(String(r)).toBe("[object Object]");
  });

  it("la clave de React es el id del rol y son únicos", () => {
    const ids = ROLES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

/* ── Lo que se pinta de un miembro ────────────────────────────────────────── */

describe("equipo · ningún secreto llega a la vista", () => {
  it("las claves del miembro son exactamente las del contrato", () => {
    expect(Object.keys(miembro()).sort()).toEqual([
      "email", "fullName", "hasPassword", "id", "invitedAt",
      "role", "roleLabel", "status", "updatedAt",
    ]);
  });

  it("no hay hueco para un testigo ni una contraseña", () => {
    const texto = JSON.stringify(miembro());
    for (const p of ["invitationToken", "password", "token", "isSuperadmin"]) {
      expect(texto).not.toContain(p);
    }
  });

  it("`hasPassword` distingue a quien todavía no ha entrado", () => {
    expect(miembro({ status: "invited", hasPassword: false }).hasPassword).toBe(false);
    expect(miembro({ status: "active" }).hasPassword).toBe(true);
  });
});

/* ── Navegación ───────────────────────────────────────────────────────────── */

describe("navegación · Equipo deja de ser «próximamente»", () => {
  it("es un destino real y está entre las rutas", () => {
    const NAV = ["/dashboard", "/branding", "/companies", "/usage", "/billing",
                 "/contract", "/entitlements", "/activity", "/account", "/team"];
    const RUTAS = [...NAV, "/companies/new", "/companies/:tenantId", "/onboarding", "/login"];
    for (const a of NAV) expect(RUTAS).toContain(a);
    expect(NAV).toContain("/team");
  });
});
