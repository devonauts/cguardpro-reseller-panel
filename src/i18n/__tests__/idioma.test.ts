import fs from "node:fs";
import path from "node:path";

import { describe, expect, it, beforeEach } from "vitest";

import { en } from "../catalogo/en";
import { es } from "../catalogo/es";
import {
  alCambiarIdioma, elegirIdioma, etiquetaIntl, idioma,
  IDIOMA_POR_DEFECTO, IDIOMAS, t,
} from "../idioma";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL IDIOMA DEL PANEL — LO QUE NO PUEDE CAMBIAR SIN QUE ALGUIEN SE ENTERE
 *
 * Son tres cosas distintas y las tres han sido errores reales en productos de
 * este tipo: que el defecto deje de ser inglés, que el panel se ponga a adivinar
 * el idioma del visitante, y que una clave nueva sólo exista en uno de los dos
 * catálogos —que es como aparece media pantalla en el idioma que no es—.
 * ════════════════════════════════════════════════════════════════════════════
 */

beforeEach(() => { elegirIdioma("en"); });

describe("el defecto", () => {
  it("es inglés", () => {
    expect(IDIOMA_POR_DEFECTO).toBe("en");
  });

  it("sin elección previa, el panel arranca en inglés", () => {
    /* El módulo se carga sin nada guardado (las pruebas no tienen navegador),
       así que esto comprueba justo el caso del visitante nuevo. */
    expect(idioma()).toBe("en");
  });

  it("son dos idiomas y el inglés va primero", () => {
    expect(IDIOMAS).toEqual(["en", "es"]);
  });
});

describe("NO se adivina el idioma del visitante", () => {
  it("el módulo no mira el navegador, ni la zona horaria, ni el país", () => {
    /* Un `navigator.language` aquí convertiría a un socio con el portátil en
       castellano en un usuario al que nadie preguntó. */
    const fuente = fs.readFileSync(path.resolve(__dirname, "../idioma.ts"), "utf8");
    for (const adivinanza of [
      "navigator.language", "navigator.languages", "userLanguage",
      "resolvedOptions", "timeZone", "geolocation", "country",
    ]) {
      expect(fuente, `idioma.ts mira ${adivinanza}`).not.toContain(adivinanza);
    }
  });
});

describe("los dos catálogos dicen lo mismo", () => {
  it("ninguna clave existe en un idioma y falta en el otro", () => {
    const enKeys = Object.keys(en).sort();
    const esKeys = Object.keys(es).sort();
    expect(esKeys).toEqual(enKeys);
  });

  it("ninguna traducción está vacía", () => {
    for (const k of Object.keys(en) as Array<keyof typeof en>) {
      expect(String(en[k]).trim(), `en.${k} vacío`).not.toBe("");
      expect(String(es[k]).trim(), `es.${k} vacío`).not.toBe("");
    }
  });

  it("los huecos de una clave son los MISMOS en los dos idiomas", () => {
    /* `{n}` en inglés y `{num}` en castellano compila igual y deja un «{num}»
       literal en la pantalla. Sólo se ve mirando las dos a la vez. */
    const huecos = (s: string) =>
      (s.match(/\{(\w+)\}/g) ?? []).map((h) => h.slice(1, -1)).sort();
    for (const k of Object.keys(en) as Array<keyof typeof en>) {
      expect(huecos(es[k]), `los huecos de ${k} no cuadran`).toEqual(huecos(en[k]));
    }
  });

  it("el inglés no se ha quedado copiado del castellano", () => {
    /* Una clave nueva que se añade a los dos catálogos con el MISMO texto
       castellano compila, cuadra de claves y deja inglés falso en la pantalla.
       Se admiten las que de verdad coinciden —«Total», «Email» no, pero los
       códigos de moneda y los nombres propios sí— siempre que no lleven
       marcas de castellano. */
    const castellano = /[áéíóúñ¿¡«»]|\b(que|para|tus|tu|los|las|del|una|sólo|está|puedes|cuenta|empresa|empresas)\b/i;

    /* Los nombres de los idiomas NO se traducen: en un selector, cada idioma se
       escribe en el suyo. Quien busca «Español» no está leyendo inglés, y
       poner «Spanish» le obliga a saber inglés para salir de él. */
    const APROPOSITO = new Set(["idioma.en", "idioma.es"]);

    const sospechosas: string[] = [];
    for (const k of Object.keys(en) as Array<keyof typeof en>) {
      if (APROPOSITO.has(k)) continue;
      if (en[k] === es[k] && castellano.test(en[k])) sospechosas.push(`${k} → «${en[k]}»`);
    }
    expect(sospechosas, "estas claves están en castellano dentro del catálogo inglés").toEqual([]);
  });
});

describe("elegir idioma", () => {
  it("cambia lo que devuelve `t`", () => {
    expect(t("nav.empresas")).toBe("Companies");
    elegirIdioma("es");
    expect(t("nav.empresas")).toBe("Empresas");
  });

  it("rellena los huecos", () => {
    expect(t("actividad.paginaDe", { a: 2, b: 7 })).toBe("Page 2 of 7");
    elegirIdioma("es");
    expect(t("actividad.paginaDe", { a: 2, b: 7 })).toBe("Página 2 de 7");
  });

  it("un hueco sin valor se deja a la vista en vez de desaparecer", () => {
    /* «Page {a} of 7» delata el fallo. «Page  of 7» lo esconde. */
    expect(t("actividad.paginaDe", { b: 7 })).toBe("Page {a} of 7");
  });

  it("arrastra el formato de fechas y números", () => {
    expect(etiquetaIntl()).toBe("en-US");
    elegirIdioma("es");
    expect(etiquetaIntl()).toBe("es-EC");
  });

  it("avisa a quien esté escuchando", () => {
    const visto: string[] = [];
    const quitar = alCambiarIdioma((i) => visto.push(i));
    elegirIdioma("es");
    elegirIdioma("en");
    quitar();
    elegirIdioma("es");
    expect(visto).toEqual(["es", "en"]);
  });
});
