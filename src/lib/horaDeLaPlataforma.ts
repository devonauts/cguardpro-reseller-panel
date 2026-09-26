/**
 * ════════════════════════════════════════════════════════════════════════════
 * LA HORA EN LA QUE EL PANEL ESCRIBE FECHAS: LA DE LA PLATAFORMA (TEXAS).
 *
 * Decisión del dueño (2026-09-26): todo lo que CGuardPro le enseña a un socio
 * con fecha y hora va en la hora de la plataforma — la misma que los correos,
 * las facturas y el PDF del contrato (backend `lib/horaDeLaPlataforma`). Antes
 * el panel usaba la zona del navegador de quien mirara, y la misma factura
 * decía un día en el correo y otro en pantalla.
 *
 * La zona la manda el servidor en `/reseller/me` (`platformTimezone`) y se fija
 * aquí al cargar la sesión: si el dueño cambia PLATFORM_TIMEZONE en
 * Credenciales, el panel se mueve con los correos. Hasta que llega, Texas.
 *
 * ── LOS DOS TIPOS DE FECHA ──────────────────────────────────────────────────
 *  - un INSTANTE (`2026-09-26T06:59:00Z`): se escribe en la zona de la
 *    plataforma;
 *  - un DÍA CIVIL (`2026-09-01`, el inicio de un periodo o una fecha de
 *    vigencia): es el día escrito y NO se mueve. `new Date("2026-09-01")` es
 *    medianoche UTC; aplicarle cualquier zona al oeste de Greenwich lo
 *    convertía en el 31 de agosto.
 * ════════════════════════════════════════════════════════════════════════════
 */

const POR_DEFECTO = "America/Chicago";
let zona = POR_DEFECTO;

export function fijarZonaDeLaPlataforma(tz: string | null | undefined): void {
  const z = String(tz || "").trim();
  if (!z) return;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: z });
    zona = z;
  } catch {
    /* una zona que este navegador no conoce: se queda la anterior */
  }
}

export function zonaDeLaPlataforma(): string {
  return zona;
}

const DIA_CIVIL = /^\d{4}-\d{2}-\d{2}$/;

/** La zona con la que se escribe ESTE valor: un día civil no se mueve. */
export function zonaPara(valor: string): string {
  return DIA_CIVIL.test(valor.trim()) ? "UTC" : zona;
}

/** Año y mes (1-12) en que cae un instante, en la zona de la plataforma. */
export function anioYMes(d: Date): { anio: number; mes: number } {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit" }).formatToParts(d);
  return {
    anio: Number(p.find((x) => x.type === "year")?.value),
    mes: Number(p.find((x) => x.type === "month")?.value),
  };
}

/** CDT en verano, CST en invierno: la abreviatura que llevan también los correos. */
export function abreviaturaDeLaPlataforma(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: zona, timeZoneName: "short" })
    .formatToParts(d).find((x) => x.type === "timeZoneName")?.value ?? "";
}
