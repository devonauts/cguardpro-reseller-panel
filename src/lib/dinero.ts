/**
 * ════════════════════════════════════════════════════════════════════════════
 * CENTAVOS ENTEROS → TEXTO PARA LEER
 *
 * El backend guarda y manda dinero en CENTAVOS ENTEROS. Éste es el único sitio
 * donde se convierten a algo que una persona lee, y la conversión va en UNA
 * sola dirección: de aquí no sale nada que vuelva a interpretarse como dinero.
 * El panel no manda importes a ninguna parte, así que ese camino de vuelta no
 * existe y no debe existir.
 *
 * ── POR QUÉ UNO Y NO TRES ─────────────────────────────────────────────────
 * Había dos: `dinero()` en Facturación —que evitaba la coma flotante a
 * propósito, pero escribía «1234,56 USD»— y `usd()` en el Resumen, que dividía
 * entre 100 y forzaba dólares, ignorando la moneda del contrato. Dos pantallas
 * del mismo panel enseñaban la misma cifra de dos formas. Añadir una tercera
 * para el Contrato era el momento en que eso deja de ser un detalle.
 *
 * ── SIN COMA FLOTANTE ─────────────────────────────────────────────────────
 * `cents / 100` es exacto para lo que maneja este producto, pero la división no
 * es la parte peligrosa: es que invita a operar. Aquí el entero se parte en
 * unidades y centavos y se formatea cada mitad, así que ningún importe pasa por
 * un `number` fraccionario.
 * ════════════════════════════════════════════════════════════════════════════
 */

import { etiquetaIntl, t } from "@/i18n/idioma";
import { abreviaturaDeLaPlataforma, zonaDeLaPlataforma, zonaPara } from "@/lib/horaDeLaPlataforma";

/**
 * El separador de miles y el decimal DEL IDIOMA ELEGIDO.
 *
 * Antes se usaba el del navegador. Eso daba una pantalla en inglés con los
 * importes escritos a la española —«1.234,56»— en cuanto el portátil estaba en
 * castellano, que es exactamente la mezcla que este panel no debe tener.
 */
/**
 * US dollars are written the way they are in the United States — «$1,500.00
 * USD» — whatever language the panel is in. Partners pay CGP in dollars; a
 * Spanish screen writing «1.500» made a registration look like one and a half
 * dollars.
 */
function esDolar(moneda: string): boolean {
  return String(moneda || "").toUpperCase() === "USD";
}

function separadores(moneda = ""): { miles: string; decimal: string } {
  if (esDolar(moneda)) return { miles: ",", decimal: "." };
  try {
    const partes = new Intl.NumberFormat(etiquetaIntl()).formatToParts(1234.5);
    return {
      miles: partes.find((p) => p.type === "group")?.value ?? ",",
      decimal: partes.find((p) => p.type === "decimal")?.value ?? ".",
    };
  } catch {
    return { miles: ",", decimal: "." };
  }
}

/**
 * Centavos enteros → «1.234,56 USD» (o «1,234.56 USD», según el idioma).
 *
 * La moneda va como código ISO detrás y no como símbolo: el mismo panel puede
 * tener contratos en monedas distintas, y «$» no distingue entre un dólar y
 * media docena de pesos.
 */
export function dinero(cents: number | null | undefined, moneda = "USD"): string {
  /* `null` y `undefined` NO son cero. `Number(null)` es 0, así que una simple
     comprobación de finitud pintaría «0,00» para un importe que el servidor no
     mandó — afirmando un cero que nadie calculó. Un importe ausente se dice
     con una raya. */
  if (cents === null || cents === undefined) return "—";
  const n = Number(cents);
  if (!Number.isFinite(n)) return "—";

  const negativo = n < 0;
  const abs = Math.abs(Math.trunc(n));
  const unidades = Math.floor(abs / 100);
  const centavos = String(abs % 100).padStart(2, "0");
  const { miles, decimal } = separadores(moneda);

  const conMiles = String(unidades).replace(/\B(?=(\d{3})+(?!\d))/g, miles);
  // `−` es el signo menos tipográfico, no el guion: se distingue de un rango.
  const simbolo = esDolar(moneda) ? "$" : "";
  return `${negativo ? "−" : ""}${simbolo}${conMiles}${decimal}${centavos} ${moneda}`;
}

/** Una fecha ISO (o `AAAA-MM-DD`) → texto en la hora de la PLATAFORMA (Texas),
 *  la misma de los correos. Un día civil `AAAA-MM-DD` no se mueve. Ver
 *  lib/horaDeLaPlataforma. `—` si no hay o no vale. */
export function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(etiquetaIntl(), {
    year: "numeric", month: "long", day: "numeric", timeZone: zonaPara(iso),
  });
}

/** La misma fecha, corta: la que cabe en una fila de tabla. */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(etiquetaIntl(), {
    year: "numeric", month: "short", day: "numeric", timeZone: zonaPara(iso),
  });
}

/** Fecha y hora, para el registro de actividad: en la hora de la plataforma
 *  y con su abreviatura (CDT/CST), para que nadie la lea como la suya. */
export function fechaYHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const texto = d.toLocaleString(etiquetaIntl(), {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: zonaDeLaPlataforma(),
  });
  // La abreviatura en inglés (CDT/CST), la misma que llevan los correos: en
  // español el navegador escribiría «GMT-5».
  return `${texto} ${abreviaturaDeLaPlataforma(d)}`;
}

/**
 * `2026-09` → «September 2026» / «septiembre de 2026».
 *
 * El orden de la palabra y el año NO es el mismo en los dos idiomas, así que la
 * plantilla entera vive en el catálogo y aquí sólo se rellenan los huecos.
 */
export function mesDelPeriodo(label: string | null | undefined): string {
  if (!label) return "—";
  const m = /^(\d{4})-(\d{2})$/.exec(label);
  if (!m) return label;
  const n = Number(m[2]);
  if (!(n >= 1 && n <= 12)) return label;
  return t("mes.de", { mes: t(`mes.${n}` as never), anio: m[1] });
}

/**
 * Un importe para LEER de un vistazo: «$1,500», «$2.50», «$499».
 *
 * `dinero` escribe siempre la moneda en código y los dos decimales, que es lo
 * correcto en una línea de factura. En un resumen pesa: «1,500.00 USD» se lee
 * más despacio que «$1,500». Aquí se usa el símbolo corto del idioma y los
 * decimales sólo cuando los hay.
 */
export function precio(
  cents: number | null | undefined,
  moneda = "USD",
  /** Con el código («MXN 60») en vez del símbolo: cuando conviven dos monedas
      con el mismo «$», el símbolo solo no dice cuál es. */
  conCodigo = false,
): string {
  if (cents === null || cents === undefined) return "—";
  const n = Number(cents);
  if (!Number.isFinite(n)) return "—";
  const entero = Math.trunc(n) % 100 === 0;
  if (esDolar(moneda)) {
    const us = new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", currencyDisplay: "narrowSymbol",
      minimumFractionDigits: entero ? 0 : 2, maximumFractionDigits: entero ? 0 : 2,
    }).format(n / 100);
    return `${us} USD`;
  }
  try {
    return new Intl.NumberFormat(etiquetaIntl(), {
      style: "currency",
      currency: moneda,
      currencyDisplay: conCodigo ? "code" : "narrowSymbol",
      minimumFractionDigits: entero ? 0 : 2,
      maximumFractionDigits: entero ? 0 : 2,
    }).format(n / 100);
  } catch {
    return dinero(n, moneda);
  }
}
