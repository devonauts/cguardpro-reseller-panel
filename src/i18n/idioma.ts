/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL IDIOMA DEL PANEL DE SOCIO
 *
 * ── EL DEFECTO ES INGLÉS, Y NO SE ADIVINA ─────────────────────────────────
 * Quien abre el panel por primera vez lo ve en inglés. SIEMPRE. No se mira el
 * idioma del navegador, ni el país del socio, ni el de su empresa, ni la IP,
 * ni la zona horaria. Adivinar sale mal de una forma concreta y cara: un socio
 * en Miami con el portátil en español abre un producto que vende en inglés y
 * se encuentra su panel en otro idioma, sin haber pedido nada.
 *
 * Lo único que cambia el defecto es que ALGUIEN LO HAYA ELEGIDO. Esa elección
 * se guarda y manda por encima de todo lo demás.
 *
 * ── UNA SOLA TIENDA, DENTRO Y FUERA DE REACT ──────────────────────────────
 * El idioma vive en este módulo, no en un contexto. Lo necesitan pantallas
 * (que se repintan) pero también sitios sin componente: el cliente HTTP, la
 * tabla de estados de un miembro, el formateador de fechas. Con un contexto
 * haría falta un segundo camino para ésos, y dos caminos es cómo se llega a
 * que una mitad de la pantalla cambie de idioma y la otra no.
 * ════════════════════════════════════════════════════════════════════════════
 */

import { en, type Clave } from "./catalogo/en";
import { es } from "./catalogo/es";

export type Idioma = "en" | "es";

export const IDIOMAS: Idioma[] = ["en", "es"];

/** El defecto del producto. No se deduce de nada del visitante. */
export const IDIOMA_POR_DEFECTO: Idioma = "en";

/** Propia del panel: el CRM guarda la suya y no se pisan. */
const LLAVE = "cguard_reseller_lang";

const CATALOGOS: Record<Idioma, Record<Clave, string>> = { en, es };

function esIdioma(v: unknown): v is Idioma {
  return v === "en" || v === "es";
}

/**
 * Lo que la persona eligió alguna vez, si es que eligió.
 *
 * `null` significa «nunca lo ha elegido», que NO es lo mismo que «eligió
 * inglés»: se distingue para que el defecto pueda cambiar algún día sin
 * pisarle la elección a nadie.
 */
export function idiomaGuardado(): Idioma | null {
  try {
    const v = localStorage.getItem(LLAVE);
    return esIdioma(v) ? v : null;
  } catch {
    /* modo privado o almacenamiento bloqueado: se trabaja sin recordar */
    return null;
  }
}

let actual: Idioma = idiomaGuardado() ?? IDIOMA_POR_DEFECTO;

const oyentes = new Set<(i: Idioma) => void>();

export function idioma(): Idioma {
  return actual;
}

/** El `lang` del documento: los lectores de pantalla lo usan para pronunciar. */
function marcarDocumento(i: Idioma) {
  try {
    document.documentElement.lang = i;
  } catch {
    /* sin DOM (pruebas): no hay nada que marcar */
  }
}

/**
 * Cambiar de idioma es una ELECCIÓN EXPLÍCITA: sólo se llama desde el control
 * de idioma. Por eso aquí sí se guarda, y por eso no hace falta cerrar sesión
 * —no se toca el token, ni se recarga, ni se vuelve a preguntar `/me`—.
 */
export function elegirIdioma(i: Idioma) {
  if (!esIdioma(i) || i === actual) return;
  actual = i;
  try {
    localStorage.setItem(LLAVE, i);
  } catch {
    /* la elección vale para esta pestaña aunque no se pueda guardar */
  }
  marcarDocumento(i);
  for (const fn of oyentes) fn(i);
}

export function alCambiarIdioma(fn: (i: Idioma) => void): () => void {
  oyentes.add(fn);
  return () => { oyentes.delete(fn); };
}

/**
 * The translation of a key built from server data (a module key, a field id),
 * or `respaldo` when the catalog has none. `t()` would return the raw key.
 */
export function tOr(clave: string, respaldo: string): string {
  const texto = CATALOGOS[actual][clave as Clave] ?? en[clave as Clave];
  return texto ?? respaldo;
}

/**
 * La clave → el texto.
 *
 * Una clave que no exista se devuelve TAL CUAL. Es feo a propósito: un
 * identificador crudo en la pantalla se ve, se reporta y se arregla; una cadena
 * vacía se cuela en una versión y nadie se entera.
 */
export function t(clave: Clave, valores?: Record<string, string | number>): string {
  const plantilla = CATALOGOS[actual][clave] ?? en[clave] ?? String(clave);
  if (!valores) return plantilla;
  return plantilla.replace(/\{(\w+)\}/g, (crudo, nombre) =>
    nombre in valores ? String(valores[nombre]) : crudo);
}

/** El idioma en forma de etiqueta BCP-47, para `Intl`. */
export function etiquetaIntl(): string {
  return actual === "es" ? "es-EC" : "en-US";
}

marcarDocumento(actual);

export type { Clave };
