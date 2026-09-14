#!/usr/bin/env node
/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL CORTAFUEGOS DE IMPORTACIONES — CORRE ANTES DE COMPILAR
 *
 * El panel de socio es una aplicación aparte porque sirve a OTRO cliente. Esa
 * separación sólo es real mientras el código no se cruce: basta un
 * `import { Button } from '../../frontend/src/...'` para que a partir de ese día
 * un cambio en el CRM pueda romper el panel de un socio, y para que el panel
 * herede la caducidad de las decisiones de otro producto.
 *
 * Esto falla la CONSTRUCCIÓN, no una prueba que alguien pueda saltarse: si el
 * cruce existe, no hay artefacto.
 *
 * Se comprueban las dos direcciones. La de vuelta importa igual: el día que el
 * CRM importe algo del panel, el panel deja de poder cambiar solo.
 * ════════════════════════════════════════════════════════════════════════════
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PANEL = path.resolve(AQUI, "..");
const REPO = path.resolve(PANEL, "..");

const ROJO = "\x1b[31m";
const VERDE = "\x1b[32m";
const FIN = "\x1b[0m";

/** Todos los .ts/.tsx/.js/.jsx/.css bajo un directorio. */
function fuentes(dir, salida = []) {
  if (!fs.existsSync(dir)) return salida;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "dist" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) fuentes(p, salida);
    else if (/\.(tsx?|jsx?|css)$/.test(e.name)) salida.push(p);
  }
  return salida;
}

/** Lo que importa un archivo: `import ... from 'x'`, `require('x')`, `import('x')`, `@import 'x'`. */
function especificadores(texto) {
  const out = [];
  const patrones = [
    /\bfrom\s+["']([^"']+)["']/g,
    /\bimport\s+["']([^"']+)["']/g,
    /\brequire\(\s*["']([^"']+)["']\s*\)/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
    /@import\s+["']([^"']+)["']/g,
  ];
  for (const re of patrones) {
    let m;
    while ((m = re.exec(texto))) out.push(m[1]);
  }
  return out;
}

const PROHIBIDO_DESDE_EL_PANEL = [
  { patron: /(^|\/)frontend\/src(\/|$)/, nombre: "frontend/src (el CRM)" },
  { patron: /(^|\/)superadmin\/src(\/|$)/, nombre: "superadmin/src" },
];

const fallos = [];

/* ── 1 y 2. El panel no importa del CRM ni de superadmin ─────────────────── */
for (const archivo of fuentes(path.join(PANEL, "src"))) {
  const texto = fs.readFileSync(archivo, "utf8");
  for (const spec of especificadores(texto)) {
    // Un relativo que se sale del panel es tan cruce como una ruta explícita.
    const resuelto = spec.startsWith(".")
      ? path.resolve(path.dirname(archivo), spec)
      : spec;
    const normal = String(resuelto).split(path.sep).join("/");

    for (const { patron, nombre } of PROHIBIDO_DESDE_EL_PANEL) {
      if (patron.test(normal)) {
        fallos.push(`${path.relative(REPO, archivo)} importa de ${nombre}: "${spec}"`);
      }
    }
    if (spec.startsWith(".") && !path.resolve(resuelto).startsWith(PANEL + path.sep)) {
      fallos.push(
        `${path.relative(REPO, archivo)} importa FUERA del panel: "${spec}"`,
      );
    }
  }
}

/* ── 3 y 4. Ni el CRM ni superadmin importan del panel ───────────────────── */
for (const otro of ["frontend/src", "superadmin/src"]) {
  for (const archivo of fuentes(path.join(REPO, otro))) {
    const texto = fs.readFileSync(archivo, "utf8");
    for (const spec of especificadores(texto)) {
      const resuelto = spec.startsWith(".")
        ? path.resolve(path.dirname(archivo), spec)
        : spec;
      const normal = String(resuelto).split(path.sep).join("/");
      if (/(^|\/)reseller-panel(\/|$)/.test(normal)) {
        fallos.push(`${path.relative(REPO, archivo)} importa del panel: "${spec}"`);
      }
    }
  }
}

/* ── 5. Ninguna dependencia declarada escapa de la carpeta ───────────────── */
const pkg = JSON.parse(fs.readFileSync(path.join(PANEL, "package.json"), "utf8"));
for (const bloque of ["dependencies", "devDependencies"]) {
  for (const [nombre, version] of Object.entries(pkg[bloque] || {})) {
    if (/^(file:|link:|\.\.?\/)/.test(String(version))) {
      fallos.push(`package.json → ${nombre}: "${version}" apunta fuera del panel`);
    }
  }
}

/* ── 6. Ninguna ruta del panel registrada en el enrutador del CRM ─────────── */
const rutasCrm = path.join(REPO, "frontend", "src");
if (fs.existsSync(rutasCrm)) {
  for (const archivo of fuentes(rutasCrm)) {
    const texto = fs.readFileSync(archivo, "utf8");
    if (/path=["'`]\/?(panel|partner)(\/|["'`])/.test(texto)) {
      fallos.push(
        `${path.relative(REPO, archivo)} registra una ruta del panel dentro del CRM`,
      );
    }
  }
}

if (fallos.length) {
  console.error(`${ROJO}✗ CORTAFUEGOS DE IMPORTACIONES — ${fallos.length} cruce(s):${FIN}`);
  for (const f of fallos) console.error(`  · ${f}`);
  console.error(
    "\nEl panel de socio, el CRM y el panel de superadmin son tres aplicaciones\n" +
    "para tres clientes distintos. Si de verdad hacen falta piezas comunes,\n" +
    "van a un paquete compartido a propósito — nunca a una importación cruzada\n" +
    "del código de otra aplicación.",
  );
  process.exit(1);
}

console.log(`${VERDE}✓ cortafuegos de importaciones: sin cruces${FIN}`);
