import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL SISTEMA DE DISEÑO ES UNO SOLO
 *
 * `tokens.css` decía, en un comentario, que había una prueba que impedía los
 * colores sueltos. NO LA HABÍA. Y eso no fue un detalle: seis hojas de página
 * habían acabado usando un vocabulario de fichas INVENTADO —`--texto-2`,
 * `--linea`, `--fondo-2`— con un hex de respaldo detrás. Como esas fichas no
 * existen en ninguna parte, lo que se pintaba era siempre el respaldo. El panel
 * tenía un sistema de diseño impecable que media aplicación no usaba, y por eso
 * se leía gris y con un aviso azul en Dominios por más fichas que hubiera.
 *
 * Un comentario no es un guardián. Esto sí.
 * ════════════════════════════════════════════════════════════════════════════
 */

const RAIZ = path.resolve(__dirname, "../..");
const TOKENS = path.join(RAIZ, "styles/tokens.css");
const MATERIAL = path.join(RAIZ, "design/_material.scss");

function hojas(dir: string, salida: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) hojas(p, salida);
    else if (e.name.endsWith(".css") || e.name.endsWith(".scss")) salida.push(p);
  }
  return salida;
}

/** Sin comentarios: lo que se afirma es lo que PINTA, no lo que se explica. */
const soloCodigo = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, " ");

const TODAS = hojas(RAIZ).filter((f) => f !== TOKENS);

describe("las fichas de diseño", () => {
  it("hay hojas que mirar", () => {
    expect(TODAS.length).toBeGreaterThan(20);
  });

  it("ninguna hoja fuera de tokens.css escribe un color literal", () => {
    const sucias: string[] = [];
    for (const f of TODAS) {
      const css = soloCodigo(fs.readFileSync(f, "utf8"));
      /* `oklch(var(--brand-l) …)` se admite: está COMPUESTO con fichas y es
         cómo la rampa de tono enseña los colores con la luminosidad real del
         sistema. Lo que no se admite es un valor inventado. */
      const literales = [
        ...(css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []),
        ...(css.match(/\brgba?\(/g) ?? []),
        ...(css.match(/\bhsla?\(/g) ?? []),
      ];
      if (literales.length) sucias.push(`${path.relative(RAIZ, f)}: ${literales.join(", ")}`);
    }
    expect(sucias, "los colores viven en tokens.css y en ningún otro sitio").toEqual([]);
  });

  it("ninguna hoja usa una ficha que no existe", () => {
    /* El fallo que estuvo vivo meses: `var(--inventada, #9aa1ab)` compila, no
       avisa de nada y pinta el respaldo para siempre. */
    const declaradas = new Set(
      [...fs.readFileSync(TOKENS, "utf8").matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)]
        .map((m) => m[1]),
    );
    /* Las que el propio componente se define en línea (la vista previa de
       marca escribe `--brand-h` y `--brand-c` en su contenedor). */
    const enLinea = new Set(["--brand-h", "--brand-c"]);

    const huerfanas: string[] = [];
    for (const f of [...TODAS, TOKENS]) {
      const css = soloCodigo(fs.readFileSync(f, "utf8"));
      const propias = new Set(
        [...css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)].map((m) => m[1]),
      );
      for (const m of css.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) {
        const ficha = m[1];
        if (declaradas.has(ficha) || propias.has(ficha) || enLinea.has(ficha)) continue;
        huerfanas.push(`${path.relative(RAIZ, f)}: ${ficha}`);
      }
    }
    expect(huerfanas, "una ficha inexistente pinta su respaldo en silencio").toEqual([]);
  });

  it("el ambiente del lienzo es NEUTRO: el acento no tiñe el fondo", () => {
    /* Ésta es la que impide que vuelva el panel azul. El degradado de antes se
       componía con `--brand-h`, así que la página entera tomaba el tono de la
       marca — con el azul de plataforma, un panel azul. El acento viste
       acciones; el ambiente es neutro elija el socio el color que elija. */
    const tokens = soloCodigo(fs.readFileSync(TOKENS, "utf8"));
    const ambiente = /--ambiente:([\s\S]*?);\s*$/m.exec(tokens)?.[1] ?? "";
    expect(ambiente, "no se encontró la ficha --ambiente").not.toBe("");
    expect(ambiente).not.toMatch(/--brand/);
    /* Y sus luces son acromáticas: croma 0 en oklch. */
    for (const luz of ambiente.match(/oklch\([^)]*\)/g) ?? []) {
      expect(luz, `la luz ${luz} tiene color`).toMatch(/oklch\(\s*[\d.]+\s+0\s+0\s*\//);
    }
  });

  it("el entorno es ACROMÁTICO: sólo tienen color el acento y los tres estados", () => {
    /* El criterio duro: el panel no puede LEERSE azul.
       Todo lo que compone el entorno —lienzo, cristal, bordes, texto, luces y
       sombras— va con croma 0. El color queda para el acento (que es del
       socio) y para verde/ámbar/rojo, que significan algo. Si mañana alguien
       tiñe una superficie «un poquito», esto se pone rojo. */
    const tokens = soloCodigo(fs.readFileSync(TOKENS, "utf8"));

    /* Los únicos tonos con color permitidos, y qué son. */
    const SEMANTICOS = [155, 80, 25];

    const teñidos: string[] = [];
    for (const [linea] of tokens.matchAll(/^\s*--[a-z0-9-]+\s*:[^;]+;/gim)) {
      for (const m of linea.matchAll(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/g)) {
        const croma = Number(m[2]);
        const tono = Number(m[3]);
        if (croma === 0) continue;
        if (SEMANTICOS.includes(tono)) continue;
        teñidos.push(linea.trim());
      }
    }
    expect(teñidos, "hay color fuera del acento y de los tres estados").toEqual([]);
  });

  it("el cristal es cristal: translúcido Y con desenfoque", () => {
    /* `backdrop-filter` sobre un fondo opaco no hace NADA: no hay nada que
       atravesar. Era el estado anterior del panel, y es la forma más fácil de
       creer que se ha hecho un cristal cuando no se ha hecho ninguno. */
    const tokens = soloCodigo(fs.readFileSync(TOKENS, "utf8"));
    const NIVELES = ["--glass-standard", "--glass-interactive", "--glass-subtle",
      "--glass-elevated", "--glass-sunken"];
    for (const ficha of NIVELES) {
      const valor = new RegExp(`${ficha}\\s*:\\s*([^;]+);`).exec(tokens)?.[1] ?? "";
      expect(valor, `falta ${ficha}`).not.toBe("");
      expect(valor, `${ficha} es opaco: no puede haber cristal`).toMatch(/\//);
    }

    const material = soloCodigo(fs.readFileSync(MATERIAL, "utf8"));
    expect(material).toMatch(/backdrop-filter/);
    /* Con prefijo, porque Safari todavía lo pide. */
    expect(material).toMatch(/-webkit-backdrop-filter/);
    /* Y un repliegue a opaco: si el navegador no compone, se lee igual. */
    expect(material).toMatch(/@supports not/);
  });

  it("LA REGLA ANTIDUPLICACIÓN · la receta del cristal vive en UN solo sitio", () => {
    /* Ésta es la que sostiene el sistema entero.
     *
     * Antes de esto, la receta —fondo translúcido + desenfoque + borde +
     * sombra— estaba copiada en once hojas. Copiada, las once empiezan iguales
     * y acaban distintas: alguien sube el desenfoque de las tarjetas y no el de
     * los menús, y el producto deja de parecer un material para parecer once.
     *
     * `backdrop-filter` sólo puede aparecer en el mixin (que la define) y en
     * las fichas (que guardan los valores). En cualquier otro sitio significa
     * que alguien volvió a escribirla a mano. */
    const PERMITIDAS = new Set(["design/_material.scss", "styles/tokens.css"]);
    const copias: string[] = [];
    for (const f of [...TODAS, TOKENS]) {
      const rel = path.relative(RAIZ, f);
      if (PERMITIDAS.has(rel)) continue;
      if (/backdrop-filter/.test(soloCodigo(fs.readFileSync(f, "utf8")))) copias.push(rel);
    }
    expect(
      copias,
      "la receta del cristal se pide con @include m.cristal(), no se reescribe",
    ).toEqual([]);
  });

  it("cada componente del sistema visual trae su propio SCSS", () => {
    /* La arquitectura, comprobada: una pieza reutilizable con su material
       enterrado en una hoja de página no es reutilizable. */
    const base = path.join(RAIZ, "components/cristal");
    const piezas = fs.readdirSync(base, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name !== "__tests__")
      .map((e) => e.name);

    expect(piezas.length).toBeGreaterThan(8);
    const incompletas: string[] = [];
    for (const pieza of piezas) {
      for (const necesario of [`${pieza}.tsx`, `${pieza}.scss`, "index.ts"]) {
        if (!fs.existsSync(path.join(base, pieza, necesario))) {
          incompletas.push(`${pieza}/${necesario}`);
        }
      }
    }
    expect(incompletas, "cada componente lleva su .tsx, su .scss y su index.ts").toEqual([]);
  });
});
