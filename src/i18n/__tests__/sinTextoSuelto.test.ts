import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL GUARDIÁN: NINGUNA PANTALLA VUELVE A LLEVAR TEXTO SUELTO
 *
 * El panel nació entero en castellano y se tradujo de golpe. Lo que hace que
 * eso NO se deshaga solo no es la traducción: es esto.
 *
 * Sin un guardián, el camino de vuelta es cómodo y silencioso. Alguien añade
 * una pantalla, escribe «Guardar» directamente en el JSX porque es una palabra
 * y no merece una clave, compila, pasa las pruebas y despliega. En inglés esa
 * palabra sigue diciendo «Guardar». No falla nada, no avisa nadie, y la
 * siguiente ya se escribe igual.
 *
 * ── QUÉ SE MIRA, Y POR QUÉ ASÍ ────────────────────────────────────────────
 * Este proyecto está escrito en castellano por dentro: los identificadores, los
 * comentarios y los nombres de fichero. Eso se queda como está — no es texto de
 * nadie. Lo que se busca es CASTELLANO EN POSICIÓN DE TEXTO: literales con
 * acentos o con palabras que sólo aparecen en prosa.
 *
 * Los comentarios se quitan antes de mirar. Si no, este mismo fichero —y todos
 * los demás, que explican en castellano lo que hacen— se denunciarían solos, y
 * la prueba acabaría desactivada por ruidosa.
 * ════════════════════════════════════════════════════════════════════════════
 */

const RAIZ = path.resolve(__dirname, "../..");

/** Lo que de verdad se pinta, sin lo que sólo se explica. */
function soloCodigo(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

function ficheros(dir: string, salida: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      /* El catálogo es el ÚNICO sitio donde el castellano es lo correcto, y las
         pruebas afirman sobre textos concretos a propósito. */
      if (e.name === "catalogo" || e.name === "__tests__") continue;
      ficheros(p, salida);
    } else if (/\.tsx?$/.test(e.name)) {
      salida.push(p);
    }
  }
  return salida;
}

/**
 * Las marcas de que un literal es PROSA en castellano.
 *
 * Los acentos y los signos de apertura no aparecen en código; las palabras de
 * la lista tampoco sobreviven a una traducción. Una clave del catálogo
 * (`"empresas.titulo"`) no cae aquí porque no lleva ni acentos ni espacios.
 */
const CASTELLANO = /[áéíóúüñ¿¡«»]|(^|\s)(el|la|los|las|un|una|de|del|que|para|con|sin|tus|tu|por|como|cuando|puedes|tienes|hay|está|están|se)(\s|$)/i;

/** Los literales de un fichero, ya sin comentarios. */
function literales(codigo: string): string[] {
  const salida: string[] = [];
  /* Comillas dobles y simples. Las plantillas se miran aparte porque llevan
     interpolaciones dentro. */
  for (const m of codigo.matchAll(/"([^"\\\n]{3,})"|'([^'\\\n]{3,})'/g)) {
    salida.push(m[1] ?? m[2]);
  }
  for (const m of codigo.matchAll(/`([^`\\]{3,})`/g)) salida.push(m[1]);
  return salida;
}

/**
 * Y el texto que va suelto entre etiquetas JSX: `<p>Guardar</p>`.
 *
 * SÓLO en `.tsx`. En un `.ts` no hay JSX, pero sí genéricos —`del<Algo>(…)`—,
 * y buscar «entre un `>` y un `<`» ahí dentro encuentra trozos de código que
 * no son texto de nadie.
 */
function textoJsx(codigo: string): string[] {
  const salida: string[] = [];
  for (const m of codigo.matchAll(/>([^<>{}\n]{3,})</g)) {
    const texto = m[1].trim();
    if (texto) salida.push(texto);
  }
  return salida;
}

describe("ninguna pantalla lleva castellano escrito a mano", () => {
  const todos = ficheros(RAIZ);

  it("hay ficheros que mirar (si esto falla, el barrido no está mirando nada)", () => {
    expect(todos.length).toBeGreaterThan(20);
  });

  for (const f of todos) {
    const rel = path.relative(RAIZ, f);
    it(rel, () => {
      const codigo = soloCodigo(fs.readFileSync(f, "utf8"));
      const sueltos = [
        ...literales(codigo),
        ...(f.endsWith(".tsx") ? textoJsx(codigo) : []),
      ]
        .filter((s) => CASTELLANO.test(s))
        /* `useIdioma fuera de IdiomaProvider` y compañía: son errores de
           programación que lee quien desarrolla, no el socio. Van marcados con
           `new Error(` y no llegan a ninguna pantalla. */
        .filter((s) => !codigo.includes(`new Error("${s}")`));

      expect(
        sueltos,
        `${rel} tiene texto en castellano fuera del catálogo. `
        + "Añádelo a src/i18n/catalogo/en.ts y es.ts y píntalo con t().",
      ).toEqual([]);
    });
  }
});
