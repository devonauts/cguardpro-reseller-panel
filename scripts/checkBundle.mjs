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

/* Y que el ENRUTADOR tampoco se haya quedado en la dirección vieja. Esto no lo
   ve `index.html`: un `basename` desparejado deja la página en blanco sin dar
   ningún error, así que se busca el rastro en el paquete. */
const conPrefijo = archivos(DIST)
  .filter((f) => f.endsWith(".js"))
  .filter((f) => fs.readFileSync(f, "utf8").includes('"/panel"'));

if (conPrefijo.length) {
  console.error('✗ el paquete todavía menciona "/panel" — ¿quedó un `basename` viejo?');
  for (const f of conPrefijo) console.error(`  · ${path.basename(f)}`);
  process.exit(1);
}

/* ── Y QUE LA WEB NO PAGUE LA APP NATIVA ──────────────────────────────────
   §42: la web sigue siendo un producto de primera. Todo lo nativo se carga
   con `import()` dentro de un `if (esNativo)`, así que en el navegador vive
   en trozos aparte que nunca se piden — o no existe en absoluto.

   Esto se comprobó a mano una vez y salió mal: importar `@capacitor/core`
   sólo para preguntar «¿estoy en nativo?» costaba 32 kB al paquete de la web
   a cambio de una respuesta que en web siempre es «no». Se quitó (la
   plataforma se detecta leyendo el global que Capacitor inyecta), y esto es
   lo que impide que vuelva.

   Se mira el trozo de ENTRADA, no todos: los trozos dinámicos SÍ pueden —y
   deben— contener plugins; lo que no puede es que estén en lo que el
   navegador se descarga para pintar la primera pantalla. */
const entrada = /<script[^>]+src="(\/assets\/[^"]+\.js)"/.exec(html)?.[1];
if (!entrada) {
  console.error("✗ no se encontró el script de entrada en index.html");
  process.exit(1);
}

const jsEntrada = fs.readFileSync(path.join(DIST, entrada.slice(1)), "utf8");
/* Nombres de los plugins tal y como sobreviven al minificador. `Network` y
   `Keyboard` a secas NO valen: axios trae «Network Error» y cualquier
   biblioteca puede decir «Keyboard». Se busca el especificador del paquete,
   que es lo único que de verdad delata una importación estática. */
const NATIVO = [
  "@capacitor/core", "@capacitor/app", "@capacitor/status-bar",
  "@capacitor/splash-screen", "@capacitor/keyboard", "@capacitor/network",
  "@capacitor/haptics", "@capacitor/preferences", "@capacitor/browser",
  "capacitor-plugin", "registerPlugin",
  /* Ionic no deja su nombre de paquete en el resultado, pero sí los nombres de
     sus elementos, que son literales y sobreviven al minificador porque el
     navegador los necesita para registrarlos. Ionic mide 809 kB: es lo caro de
     verdad, así que es lo que más importa vigilar. */
  "ion-app", "ion-content", "ion-router-outlet", "IonApp",
];
const colados = NATIVO.filter((n) => jsEntrada.includes(n));
if (colados.length) {
  console.error(`✗ ${path.basename(entrada)} arrastra código nativo a la web:`);
  for (const c of colados) console.error(`  · ${c}`);
  console.error("  lo nativo se carga con import() detrás de `esNativo`.");
  process.exit(1);
}

/* Y la HOJA de entrada. El CSS se parte en trozos igual que el código, pero
   una importación mal puesta mete las 17 kB de Ionic en la hoja que la web
   carga de forma bloqueante — que es peor que en el JS, porque retrasa el
   primer pintado. */
const cssEntrada = /<link[^>]+rel="stylesheet"[^>]+href="(\/assets\/[^"]+\.css)"/.exec(html)?.[1];
if (cssEntrada) {
  const hoja = fs.readFileSync(path.join(DIST, cssEntrada.slice(1)), "utf8");
  const cssColado = ["ion-app", "ion-content", "ion-page", "--ion-background-color"]
    .filter((n) => hoja.includes(n));
  if (cssColado.length) {
    console.error(`✗ ${path.basename(cssEntrada)} arrastra estilos de Ionic a la web:`);
    for (const c of cssColado) console.error(`  · ${c}`);
    process.exit(1);
  }
}

console.log("✓ paquete limpio y servido desde la raíz de su anfitrión");
