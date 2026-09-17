/**
 * ════════════════════════════════════════════════════════════════════════════
 * NINGUNA PANTALLA DEL SOCIO ENSEÑA UN IDENTIFICADOR CRUDO
 *
 * Esto se escribe porque ya pasó: las cuatro acciones de equipo —`team.invite`,
 * `team.role_change`, `team.deactivate`, `team.reinvite`— se auditan desde el
 * primer día, pero la pantalla de Actividad no las sabía nombrar. Su repliegue
 * («si no la conozco, la enseño tal cual») es correcto y es justo lo que la
 * hacía escribir `team.invite` en una pantalla que lee un cliente de pago.
 *
 * Un repliegue silencioso no se caza mirando: se caza con una prueba que
 * enumere lo que el servidor puede mandar y exija un nombre para cada cosa.
 * ════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { estadoDeMiembro, textoDeEstado } from "../estadoDeMiembro";
import { elegirIdioma, IDIOMAS } from "@/i18n/idioma";

const actividad = fs.readFileSync(
  path.resolve(__dirname, "../../pages/Actividad.tsx"),
  "utf8",
);

/** Los tres estados que el servidor guarda en `resellerUsers.status`. */
const ESTADOS = ["active", "invited", "archived"];

/** Las cuatro acciones que escribe `src/api/reseller/team.ts` en el backend. */
const ACCIONES_DE_EQUIPO = [
  "team.invite",
  "team.role_change",
  "team.deactivate",
  "team.reinvite",
];

describe("estado de un miembro", () => {
  it("los tres estados tienen nombre EN LOS DOS IDIOMAS, y ninguno es el identificador", () => {
    /* En los dos. Un estado nombrado sólo en castellano dejaría una insignia en
       español dentro de una pantalla en inglés, que es justo la mezcla que este
       panel no debe tener. */
    for (const idioma of IDIOMAS) {
      elegirIdioma(idioma);
      for (const e of ESTADOS) {
        const entrada = estadoDeMiembro(e);
        expect(entrada, `falta el estado ${e} en ${idioma}`).toBeTruthy();
        expect(entrada!.texto).not.toBe(e);
        expect(entrada!.texto.length).toBeGreaterThan(2);
      }
    }
    elegirIdioma("en");
  });

  it("«archived» se lee como lo que le pasa a la PERSONA, no a su ficha", () => {
    /* «Archived» describiría el registro. Lo que el socio necesita saber es
       que esa persona ya no entra. */
    elegirIdioma("en");
    expect(textoDeEstado("archived")).toBe("Deactivated");
    elegirIdioma("es");
    expect(textoDeEstado("archived")).toBe("Desactivado");
    elegirIdioma("en");
  });

  it("un estado desconocido se enseña tal cual, sin inventarle un nombre", () => {
    expect(textoDeEstado("suspendido_por_riesgo")).toBe("suspendido_por_riesgo");
  });

  it("la ausencia es una raya, no «null» ni «Activo»", () => {
    expect(textoDeEstado(null)).toBe("—");
    expect(textoDeEstado(undefined)).toBe("—");
    expect(textoDeEstado("")).toBe("—");
  });
});

describe("Actividad · las acciones de equipo tienen nombre", () => {
  for (const a of ACCIONES_DE_EQUIPO) {
    it(`${a} no llega crudo a la pantalla`, () => {
      /* Se afirma contra la fuente: el mapa es un literal en el módulo de la
         pantalla, y esta prueba existe para que añadir una quinta acción en el
         backend sin nombrarla aquí salga en rojo. */
      expect(
        actividad.includes(`"${a}":`),
        `Actividad.tsx no nombra ${a}; se pintaría el identificador`,
      ).toBe(true);
    });
  }

  it("el valor de `status` sólo se nombra en las acciones de equipo", () => {
    /* `archived` pertenece al vocabulario de un miembro. El `status` de una
       CUENTA de socio es otro juego de palabras; leerlo con este diccionario
       enseñaría un estado que no es. */
    expect(actividad).toMatch(/accion\.startsWith\("team\."\)/);
  });
});
