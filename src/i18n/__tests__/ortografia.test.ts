import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { en } from "../catalogo/en";
import { es } from "../catalogo/es";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * LA COPIA SE ESCRIBE IGUAL EN TODAS PARTES
 *
 * Dos cosas que no dan error, no rompen nada y se ven fatal:
 *
 *   1 · MEZCLAR INGLÉS BRITÁNICO Y AMERICANO. El catálogo tenía «colour»,
 *       «catalogue» y «recognise» conviviendo con «Customize». Nadie lo nota
 *       leyendo una pantalla suelta; se nota leyendo dos seguidas, y entonces
 *       parece que lo escribieron dos personas que no se hablan. El producto
 *       se vende en América, así que la norma es la americana.
 *
 *   2 · JERGA DE INFRAESTRUCTURA EN LA PANTALLA DE UN CLIENTE. «Control plane»
 *       es un término de arquitectura —el plano de control de un sistema
 *       distribuido— y aquí lo lee el dueño de una empresa de seguridad. Lo que
 *       está mirando es un PANEL de control.
 * ════════════════════════════════════════════════════════════════════════════
 */

const BRITANICAS: Record<string, string> = {
  colour: "color", colours: "colors", coloured: "colored",
  recognise: "recognize", recognised: "recognized",
  organise: "organize", organisation: "organization",
  customise: "customize", authorise: "authorize",
  behaviour: "behavior", favourite: "favorite",
  analyse: "analyze", catalogue: "catalog", defence: "defense",
  cancelled: "canceled", labelled: "labeled", fulfil: "fulfill",
  travelling: "traveling", apologise: "apologize", enrolment: "enrollment",
};

describe("la ortografía del catálogo inglés", () => {
  it("es americana, sin mezclar con la británica", () => {
    const mezcla: string[] = [];
    for (const [clave, texto] of Object.entries(en)) {
      for (const palabra of String(texto).match(/[A-Za-z][A-Za-z']*/g) ?? []) {
        const us = BRITANICAS[palabra.toLowerCase()];
        if (us) mezcla.push(`${clave}: «${palabra}» → «${us}»`);
      }
    }
    expect(mezcla, "el producto se vende en América: norma americana").toEqual([]);
  });
});

describe("no se le habla al socio en jerga de infraestructura", () => {
  /* Lo que lee es un PANEL de control. «Control plane» es el plano de control
     de un sistema distribuido, y viene de la plantilla con la que se diseñó
     esta pantalla — por eso vuelve solo si nadie lo vigila. */
  const JERGA = [/control plane/i, /plano de control/i, /data plane/i];

  for (const [nombre, catalogo] of [["en", en], ["es", es]] as const) {
    it(`${nombre} no la usa`, () => {
      const malas = Object.entries(catalogo)
        .filter(([, v]) => JERGA.some((j) => j.test(String(v))))
        .map(([k, v]) => `${k}: ${v}`);
      expect(malas).toEqual([]);
    });
  }

  it("tampoco se cuela en el marcado escrito a mano", () => {
    const raiz = path.resolve(__dirname, "../..");
    const malas: string[] = [];
    const mirar = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== "__tests__") mirar(p); continue; }
        if (!/\.tsx?$/.test(e.name)) continue;
        const src = fs.readFileSync(p, "utf8")
          /* Los comentarios se quitan: este fichero explica el problema, y sin
             esto se denunciaría a sí mismo. */
          .replace(/\/\*[\s\S]*?\*\//g, " ")
          .replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
        if (/control plane/i.test(src)) malas.push(path.relative(raiz, p));
      }
    };
    mirar(raiz);
    expect(malas).toEqual([]);
  });
});
