import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL ARMAZÓN NATIVO · LO QUE NO PUEDE DESHACERSE SIN QUERER
 *
 * Tres cosas se decidieron con una medición delante y las tres se pierden en
 * silencio: nadie ve que el paquete de la web ha crecido hasta que alguien se
 * queja de que el panel tarda.
 * ════════════════════════════════════════════════════════════════════════════
 */

const SRC = path.resolve(__dirname, "..", "..");

function fuentes(dir: string, salida: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "__tests__" || e.name === "node_modules") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) fuentes(p, salida);
    else if (/\.tsx?$/.test(e.name)) salida.push(p);
  }
  return salida;
}

const TODAS = fuentes(SRC);

/** Sin comentarios: se afirma sobre lo que el módulo HACE, no sobre lo que
 *  explica. `ionic.ts` dice por escrito que NO importa `typography.css`, y sin
 *  esto esa misma frase hace fallar la prueba que lo comprueba. */
const soloCodigo = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
const rel = (f: string) => path.relative(SRC, f);

describe("el armazón de la app instalada", () => {
  it("SÓLO `src/nativo` toca Ionic", () => {
    /* Ionic mide 809 kB medidos: importarlo desde cualquier sitio compartido
       lleva el paquete de entrada de 221 kB a 1.030 kB, y quien abre el panel
       en un navegador no usa una línea. Está detrás de `lazy()` en un único
       módulo; esto impide que aparezca un segundo. */
    const fuera = TODAS
      .filter((f) => !rel(f).startsWith("nativo/"))
      .filter((f) => /from\s+["']@ionic\//.test(fs.readFileSync(f, "utf8")))
      .map(rel);
    expect(fuera, "Ionic fuera de src/nativo").toEqual([]);
  });

  it("el armazón nativo se carga PEREZOSO, nunca de forma estática", () => {
    /* Un `import` normal a `@/nativo` mete Ionic en el paquete de entrada sin
       que nada falle: sólo se nota en el peso. */
    const estaticos = TODAS
      .filter((f) => !rel(f).startsWith("nativo/"))
      .filter((f) => /^import\s+[^(].*from\s+["']@\/nativo["']/m.test(fs.readFileSync(f, "utf8")))
      .map(rel);
    expect(estaticos, "importación estática de @/nativo").toEqual([]);
  });

  it("la pregunta «¿estoy en nativo?» se hace en UN solo sitio de la interfaz", () => {
    /* La app del vigilante acabó con 49 comprobaciones sueltas y ningún sitio
       donde entender qué se ve en cada plataforma. Aquí la rama se toma una
       vez, en el armazón, y las páginas no saben en qué corren. */
    const permitido = ["layouts/AppLayout.tsx"];
    const usan = TODAS
      .filter((f) => !rel(f).startsWith("plataforma/"))
      .filter((f) => !permitido.includes(rel(f)))
      .filter((f) => /\besNativo\b/.test(fs.readFileSync(f, "utf8")))
      .map(rel);
    expect(usan, "`esNativo` repartido por la interfaz").toEqual([]);
  });

  it("las secciones son UNA lista: el raíl y las pestañas beben de la misma", () => {
    /* Dos listas que empiezan iguales dejan de serlo a la primera sección
       nueva, y el síntoma —«en el móvil no aparece»— tarda semanas en llegar. */
    const rail = fs.readFileSync(path.join(SRC, "components/panel/Rail/Rail.tsx"), "utf8");
    const pest = fs.readFileSync(path.join(SRC, "nativo/BarraDePestanas.tsx"), "utf8");
    for (const [nombre, src] of [["el raíl", rail], ["las pestañas", pest]] as const) {
      expect(src, `${nombre} no lee de @/navegacion/secciones`)
        .toMatch(/from\s+["']@\/navegacion\/secciones["']/);
      /* Y ninguno declara rutas por su cuenta. */
      expect(src, `${nombre} declara rutas propias`).not.toMatch(/a:\s*["']\//);
    }
  });

  it("«Más» se calcula restando, así que una sección nueva no se queda fuera", () => {
    const sec = fs.readFileSync(path.join(SRC, "navegacion/secciones.ts"), "utf8");
    expect(sec).toMatch(/RESTO_MOVIL[\s\S]*TODAS\.filter/);
  });

  it("las zonas seguras se respetan donde el contenido toca el borde", () => {
    /* Sin esto, en un iPhone el nombre del socio queda debajo de la hora y la
       última fila de cada lista, debajo del indicador de inicio. */
    const cabecera = fs.readFileSync(path.join(SRC, "nativo/ArmazonNativo.scss"), "utf8");
    expect(cabecera).toMatch(/safe-area-inset-top/);
    expect(cabecera).toMatch(/safe-area-inset-bottom/);
    const barra = fs.readFileSync(path.join(SRC, "nativo/BarraDePestanas.scss"), "utf8");
    expect(barra).toMatch(/safe-area-inset-bottom/);
  });

  it("Ionic no trae su tipografía ni sus resets: el aspecto es nuestro", () => {
    /* `typography.css` y `normalize.css` pisarían la letra y los márgenes que
       ya decide el sistema de diseño. Ionic aquí pone el comportamiento. */
    const ionic = soloCodigo(fs.readFileSync(path.join(SRC, "nativo/ionic.ts"), "utf8"));
    expect(ionic).not.toMatch(/typography\.css/);
    expect(ionic).not.toMatch(/normalize\.css/);
  });
});
