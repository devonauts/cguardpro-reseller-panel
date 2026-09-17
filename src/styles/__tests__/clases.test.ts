import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * NINGÚN MARCADO PIDE UN ESTILO QUE NO EXISTE
 *
 * Esto se escribe porque pasó, y porque no dio ni un error.
 *
 * Cinco pantallas —Cuenta, Contrato, Plan y derechos, Equipo, Actividad—
 * montaban `<section className="pagina">` con `pagina__cabecera` y
 * `pagina__nota` dentro. Esas tres clases NO ESTABAN DEFINIDAS en ninguna hoja
 * del repositorio. El navegador no se queja de una clase inexistente: aplica
 * nada. Resultado, las tarjetas salían pegadas unas a otras y el título apoyado
 * en la primera, sin un píxel de aire. Compilaba, pasaba las pruebas y se
 * desplegó así.
 *
 * Es el mismo fallo silencioso que las fichas fantasma (`--texto-2` y
 * compañía), en la otra punta: allí el valor no existía, aquí la regla entera.
 * Los dos se ven igual de poco leyendo el código y los dos se cazan igual de
 * fácil comparando las dos listas.
 * ════════════════════════════════════════════════════════════════════════════
 */

const RAIZ = path.resolve(__dirname, "../..");

function ficheros(dir: string, ext: RegExp, salida: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "__tests__") ficheros(p, ext, salida);
    } else if (ext.test(e.name)) salida.push(p);
  }
  return salida;
}

/** Lo que el marcado PIDE. */
function clasesUsadas(): Map<string, Set<string>> {
  const usadas = new Map<string, Set<string>>();
  for (const f of ficheros(RAIZ, /\.tsx$/)) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(/className=(?:"([^"]+)"|\{`([^`]+)`\})/g)) {
      /* Lo interpolado se descarta: `pildora--${tono}` no es una clase, es una
         familia, y sus miembros sí están definidos uno a uno. */
      const crudo = (m[1] ?? m[2] ?? "").replace(/\$\{[^}]*\}/g, " ");
      for (const c of crudo.split(/\s+/)) {
        if (!c || c.endsWith("--")) continue;
        if (!usadas.has(c)) usadas.set(c, new Set());
        usadas.get(c)!.add(path.relative(RAIZ, f));
      }
    }
  }
  return usadas;
}

/** Lo que las hojas DEFINEN, contando el anidamiento de SCSS (`&__x`, `&--x`). */
function clasesDefinidas(): Set<string> {
  const definidas = new Set<string>();
  for (const f of ficheros(RAIZ, /\.s?css$/)) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(/\.([a-zA-Z][\w-]*)/g)) definidas.add(m[1]);
    const bases = [...src.matchAll(/\.([a-zA-Z][\w-]*)\s*\{/g)].map((m) => m[1]);
    const sufijos = [...src.matchAll(/&(--|__)([\w-]+)/g)];
    for (const b of bases) for (const s of sufijos) definidas.add(b + s[1] + s[2]);
  }
  return definidas;
}

describe("el marcado y las hojas dicen lo mismo", () => {
  const usadas = clasesUsadas();
  const definidas = clasesDefinidas();

  it("hay clases que mirar", () => {
    expect(usadas.size).toBeGreaterThan(100);
    expect(definidas.size).toBeGreaterThan(100);
  });

  it("ninguna clase del marcado se queda SIN ESTILO", () => {
    const huerfanas = [...usadas.entries()]
      .filter(([c]) => !definidas.has(c))
      .map(([c, donde]) => `${c} — ${[...donde].join(", ")}`);

    expect(
      huerfanas,
      "una clase sin regla no da error: simplemente no aplica nada, y el hueco "
      + "que debía separar dos tarjetas desaparece sin que nadie se entere",
    ).toEqual([]);
  });
});
