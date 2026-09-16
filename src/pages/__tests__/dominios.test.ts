import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * FASE 16 · LA PANTALLA DE DIRECCIONES
 *
 * El proyecto no monta DOM en las pruebas del panel, así que esto fija lo que
 * se puede afirmar sobre la FUENTE y que de verdad importa: que no se filtra
 * el proveedor, que las acciones que dependen del borde se apagan cuando no
 * está, que el permiso gobierna las mutaciones y que el socio no puede tocar
 * su dirección de CGuard Pro desde aquí.
 * ════════════════════════════════════════════════════════════════════════════
 */

const bruto = (rel: string) => fs.readFileSync(path.resolve(__dirname, rel), "utf8");

/** Sin comentarios: lo que se afirma es lo que la pantalla PINTA, no lo que
 *  explica el código. Sin esto, un comentario que dice «aquí no se nombra a
 *  Cloudflare» hace fallar la prueba que comprueba justamente eso. */
const soloCodigo = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const P = soloCodigo(bruto("../Dominios.tsx"));
const SRV = soloCodigo(bruto("../../services/resellerService.ts"));

describe("Fase 16 · la pantalla de tu dirección", () => {
  it("LA QUE IMPORTA · no se nombra al proveedor en ningún sitio", () => {
    /* El socio contrata a CGuard Pro. Quién nos da el borde es problema
       nuestro, y ponerlo en su pantalla le obliga a entender nuestra
       infraestructura para configurar su dominio. */
    for (const fuga of ["Cloudflare", "cloudflare", "CNAME target", "zone", "fallback origin"]) {
      expect(P).not.toContain(fuga);
    }
  });

  it("se explica en la lengua del cliente, no en la del que administra DNS", () => {
    expect(P).toMatch(/la empresa que gestiona tu dominio/i);
    // y no se le suelta jerga a secas
    expect(P).not.toMatch(/configura un CNAME/i);
  });

  it("las acciones que dependen del borde se APAGAN cuando no está", () => {
    /* Un botón que parece que funciona y no hace nada es peor que uno apagado
       que dice por qué. */
    expect(P).toMatch(/disabled=\{enviando \|\| !datos\?\.proveedorListo\}/);
    expect(P).toMatch(/motivoProveedor/);
  });

  it("las mutaciones sólo si el permiso lo permite", () => {
    expect(P).toMatch(/const gestiona = puede\("reseller\.domain\.manage"\)/);
    expect(P).toMatch(/\{gestiona && \(/);
  });

  it("la dirección de CGuard Pro se enseña, pero no se toca desde aquí", () => {
    /* Sólo los `custom` tienen acciones; la de plataforma se pinta y ya. */
    expect(P).toMatch(/filter\(\(d\) => d\.type === "custom"\)/);
    expect(P).toMatch(/filter\(\(d\) => d\.type !== "custom"\)/);
  });

  it("cada estado trae una explicación, no sólo una etiqueta", () => {
    for (const estado of [
      "activo", "pendiente_dns", "verificando", "pendiente_tls",
      "mal_configurado", "desactivado",
    ]) {
      expect(P).toContain(`${estado}:`);
    }
    expect(P).toMatch(/ayuda:/);
  });

  it("el valor del registro se puede COPIAR: nadie transcribe un token a mano", () => {
    expect(P).toMatch(/clipboard\.writeText\(paso\.valor\)/);
  });

  it("las rutas del servicio son las del árbol del socio", () => {
    for (const r of [
      '"/reseller/domains"',
      "`/reseller/domains/${id}`",
      "`/reseller/domains/${id}/check`",
      "`/reseller/domains/${id}/primary`",
      "`/reseller/domains/${id}/disable`",
    ]) {
      expect(SRV).toContain(r);
    }
  });

  it("el panel NUNCA manda un resellerId: su alcance sale de la sesión", () => {
    /* La pantalla no lo menciona en absoluto, y las llamadas de dominios
       tampoco: ninguna lleva el identificador del socio ni en la ruta ni en el
       cuerpo. (`resellerService` sí tiene el campo en tipos de LECTURA que
       vienen del servidor — eso es dato recibido, no autoridad enviada.) */
    expect(P).not.toMatch(/resellerId/);

    const bloque = SRV.slice(SRV.indexOf("export const domainsService"));
    expect(bloque).not.toMatch(/resellerId/);
  });
});
