#!/usr/bin/env node
/**
 * Después de construir: que en el paquete no haya entrado nada del CRM ni del
 * panel de superadmin.
 *
 * El cortafuegos de antes mira el CÓDIGO FUENTE; esto mira el RESULTADO. Son
 * dos preguntas distintas: un alias mal puesto, una dependencia enlazada o un
 * `resolve` creativo pueden meter en el artefacto algo que en las fuentes no se
 * veía.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(AQUI, "..", "dist");

if (!fs.existsSync(DIST)) {
  console.error("✗ no hay dist/ — ¿se construyó?");
  process.exit(1);
}

function archivos(dir, salida = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) archivos(p, salida);
    else salida.push(p);
  }
  return salida;
}

// Rastros que dejaría un módulo de otra aplicación: rollup escribe la ruta de
// origen en los comentarios de los trozos y en los mapas de código.
const RASTROS = [/frontend\/src\//, /superadmin\/src\//];

const sucios = [];
for (const f of archivos(DIST)) {
  if (!/\.(js|css|map|html)$/.test(f)) continue;
  const texto = fs.readFileSync(f, "utf8");
  for (const r of RASTROS) {
    if (r.test(texto)) sucios.push(`${path.basename(f)} contiene ${r}`);
  }
}

if (sucios.length) {
  console.error("✗ el paquete del panel contiene código de otra aplicación:");
  for (const s of sucios) console.error(`  · ${s}`);
  process.exit(1);
}

// Y que la base sea la correcta: con `/` los recursos los serviría el CRM.
const html = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
/* El panel vive en su PROPIO anfitrión (`partners.cguardpro.com`), así que sus
   recursos cuelgan de la raíz. Lo que se comprueba es que `base` siga siendo
   absoluta: con rutas relativas, un enlace profundo como
   `/domains` pediría `domains/assets/...` y no cargaría nada. */
if (!/(src|href)="\/assets\//.test(html)) {
  console.error('✗ index.html no referencia "/assets/" — ¿se perdió `base`?');
  process.exit(1);
}

if (/(src|href)="\/panel\//.test(html)) {
  console.error('✗ quedan recursos bajo "/panel/": el panel ya no vive ahí.');
  process.exit(1);
}

console.log("✓ paquete limpio y servido desde la raíz de su anfitrión");
