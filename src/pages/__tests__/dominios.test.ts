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

/* El texto que LEE el socio ya no está en la pantalla: está en el catálogo. Las
   afirmaciones sobre cómo se le habla tienen que mirar ahí, y tienen que mirar
   LOS DOS idiomas — una fuga de proveedor en uno solo sigue siendo una fuga. */
const EN = bruto("../../i18n/catalogo/en.ts");
const ES = bruto("../../i18n/catalogo/es.ts");
const CATALOGOS: Array<[string, string]> = [["en", EN], ["es", ES]];

describe("Fase 16 · la pantalla de tu dirección", () => {
  it("LA QUE IMPORTA · no se nombra al proveedor en ningún sitio", () => {
    /* El socio contrata a CGuard Pro. Quién nos da el borde es problema
       nuestro, y ponerlo en su pantalla le obliga a entender nuestra
       infraestructura para configurar su dominio. */
    for (const fuga of ["Cloudflare", "cloudflare", "CNAME target", "zone", "fallback origin"]) {
      expect(P).not.toContain(fuga);
    }

    /* Y tampoco en el TEXTO, que es donde se le hablaría de verdad y adonde se
       ha mudado toda la copia.

       Aquí se busca la jerga concreta y no la palabra suelta: «time zone» es
       la zona horaria de una empresa y no tiene nada que ver con las zonas de
       un proveedor de DNS. Una prueba que confunde las dos se desactiva sola
       el día que alguien la ve fallar por un motivo tonto. */
    const JERGA = [
      /cloudflare/i,
      /\bzone id\b/i,
      /\bdns zone\b/i,
      /\bapi token\b/i,
      /\btunnel\b/i,
      /fallback origin/i,
      /custom hostname/i,
      /\borigin server\b/i,
    ];
    for (const [idioma, cat] of CATALOGOS) {
      for (const jerga of JERGA) {
        expect(cat, `${idioma} filtra ${jerga}`).not.toMatch(jerga);
      }
    }
  });

  it("se explica en la lengua del cliente, no en la del que administra DNS", () => {
    expect(ES).toMatch(/la empresa que gestiona tu dominio/i);
    expect(EN).toMatch(/the company that manages your domain/i);
    // y no se le suelta jerga a secas
    for (const [, cat] of CATALOGOS) {
      expect(cat).not.toMatch(/configura un CNAME/i);
      expect(cat).not.toMatch(/set up a CNAME/i);
    }
  });

  it("usa el vocabulario pactado para los dominios, en los dos idiomas", () => {
    /* Estos pares son producto, no estilo: son las palabras con las que se le
       explica a un socio qué le pasa a su dominio. Si alguien reescribe una
       mitad, el par se rompe aquí y no en la pantalla de un cliente. */
    const PARES: Array<[string, string]> = [
      ["Domains", "Dominios"],
      ["Connect a domain", "Conectar un dominio"],
      ["DNS configuration required", "Configuración DNS requerida"],
      ["Copy", "Copiar"],
      ["Copied", "Copiado"],
      ["Verifying", "Verificando"],
      ["Preparing SSL", "Preparando SSL"],
      ["Connected", "Conectado"],
      ["Needs attention", "Requiere atención"],
      ["Disabled", "Desactivado"],
      ["Make primary", "Establecer como principal"],
      ["Primary domain", "Dominio principal"],
      ["Check again", "Verificar nuevamente"],
      ["Remove domain", "Eliminar dominio"],
    ];
    for (const [ingles, castellano] of PARES) {
      expect(EN, `falta «${ingles}» en inglés`).toContain(`"${ingles}"`);
      expect(ES, `falta «${castellano}» en castellano`).toContain(`"${castellano}"`);
    }
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
