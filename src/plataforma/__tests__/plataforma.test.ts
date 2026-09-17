import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * LA FRONTERA CON LA PLATAFORMA SIGUE SIENDO UNA FRONTERA
 *
 * Lo que estas pruebas protegen es una lección ya aprendida en este mismo
 * repositorio: `worker-app` tiene CUARENTA Y NUEVE llamadas a
 * `Capacitor.isNativePlatform()` repartidas por sus ficheros. No se llegó ahí
 * de golpe — se llega añadiendo una cada vez, y cada una parece razonable.
 *
 * Aquí la plataforma se pregunta en `src/plataforma/` y en ningún otro sitio.
 * ════════════════════════════════════════════════════════════════════════════
 */

const RAIZ = path.resolve(__dirname, "../..");

function ficheros(dir: string, salida: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "__tests__") ficheros(p, salida); }
    else if (/\.tsx?$/.test(e.name)) salida.push(p);
  }
  return salida;
}

const soloCodigo = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

const TODOS = ficheros(RAIZ);
const FRONTERA = path.join(RAIZ, "plataforma");

describe("la frontera de plataforma", () => {
  it("sólo `src/plataforma` importa Capacitor", () => {
    const fuera = TODOS
      .filter((f) => !f.startsWith(FRONTERA))
      .filter((f) => /@capacitor\//.test(soloCodigo(fs.readFileSync(f, "utf8"))))
      .map((f) => path.relative(RAIZ, f));

    expect(
      fuera,
      "los plugins nativos se piden desde `@/plataforma`, no desde una pantalla",
    ).toEqual([]);
  });

  it("nadie pregunta `isNativePlatform` por su cuenta", () => {
    const fuera = TODOS
      .filter((f) => !f.startsWith(FRONTERA))
      .filter((f) => /isNativePlatform|Capacitor\.getPlatform/.test(soloCodigo(fs.readFileSync(f, "utf8"))))
      .map((f) => path.relative(RAIZ, f));
    expect(fuera).toEqual([]);
  });

  it("el token sólo se persiste desde el almacén de credenciales", () => {
    /* `localStorage` para el idioma o para una preferencia está bien. Para la
       CREDENCIAL no: si se escribe en dos sitios, el día que el almacén nativo
       cambie de respaldo uno de los dos se queda atrás. */
    const malos = TODOS
      .filter((f) => !f.startsWith(FRONTERA))
      .filter((f) => {
        const src = soloCodigo(fs.readFileSync(f, "utf8"));
        return /localStorage\.[gs]etItem\(\s*["'`]cguard_reseller_token/.test(src)
          || /cguard_reseller_token/.test(src) === true && /localStorage/.test(src);
      })
      .map((f) => path.relative(RAIZ, f));
    expect(malos).toEqual([]);
  });

  it("los plugins nativos se importan BAJO DEMANDA, nunca arriba del fichero", () => {
    /* Un `import { Haptics } from "@capacitor/haptics"` estático mete el plugin
       en el paquete de la WEB, donde no sirve para nada y sólo pesa. Dentro de
       `await import(...)` Vite lo parte en un trozo aparte que un navegador
       nunca llega a pedir. */
    const estaticos: string[] = [];
    for (const f of ficheros(FRONTERA)) {
      const src = soloCodigo(fs.readFileSync(f, "utf8"));
      for (const m of src.matchAll(/^import[^\n]*from\s+["'](@capacitor\/[\w-]+)["']/gm)) {
        /* NINGUNO, ni siquiera `@capacitor/core`: la plataforma se detecta
           leyendo el global que Capacitor inyecta, que pesa cero. */
        estaticos.push(`${path.basename(f)}: ${m[1]}`);
      }
    }
    expect(estaticos).toEqual([]);
  });
});

describe("los enlaces externos", () => {
  const fuente = soloCodigo(
    fs.readFileSync(path.join(FRONTERA, "enlacesExternos.ts"), "utf8"));

  it("sólo dejan salir esquemas seguros", () => {
    expect(fuente).toMatch(/ESQUEMAS = new Set\(\["https:", "mailto:"\]\)/);
    /* Nada de `javascript:` ni `file:`: un enlace así dentro del WebView corre
       en el mismo origen que la sesión. */
    expect(fuente).not.toMatch(/javascript:/);
  });

  it("en web abren fuera y sin dejar rastro al destino", () => {
    expect(fuente).toMatch(/noopener,noreferrer/);
  });

  it("nadie más llama a `window.open`", () => {
    const malos = TODOS
      .filter((f) => !f.startsWith(FRONTERA))
      .filter((f) => /window\.open\(/.test(soloCodigo(fs.readFileSync(f, "utf8"))))
      .map((f) => path.relative(RAIZ, f));
    expect(malos, "se sale por `abrirFuera`, que decide una sola vez").toEqual([]);
  });
});
