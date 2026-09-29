import type { Clave } from "@/i18n/idioma";

/**
 * EL FALLO DE UN COBRO, EN PALABRAS DE PERSONA.
 *
 * El servidor ya no manda el texto de la pasarela («Invalid API Key provided…»,
 * queja del dueño 2026-09-29): manda DE QUIÉN es el fallo (`kind`) y un código
 * estable (`code`). Aquí se elige la frase, en el idioma del panel, y si el
 * fallo es de la pasarela del SOCIO se dice qué tiene que hacer él.
 */
const POR_CODIGO: Record<string, Clave> = {
  insufficient_funds: "fallo.fondos",
  expired_card: "fallo.vencida",
  incorrect_details: "fallo.datos",
  card_blocked: "fallo.bloqueada",
  card_missing: "fallo.sinTarjeta",
  authentication_required: "fallo.confirmar",
  card_declined: "fallo.rechazada",
  gateway_auth: "fallo.clavesDeLaPasarela",
  gateway_request: "fallo.configuracionDeLaPasarela",
  gateway_unavailable: "fallo.pasarelaNoResponde",
};

const POR_TIPO: Record<string, Clave> = {
  tarjeta: "fallo.rechazada",
  autenticacion: "fallo.confirmar",
  configuracion: "fallo.configuracionDeLaPasarela",
  temporal: "fallo.pasarelaNoResponde",
};

export function claveDelFallo(kind?: string | null, code?: string | null): Clave | null {
  if (!kind && !code) return null;
  return (code && POR_CODIGO[code]) || (kind && POR_TIPO[kind]) || "fallo.rechazada";
}

/** ¿Lo tiene que arreglar el SOCIO (su pasarela), no el cliente? */
export const esDelSocio = (kind?: string | null) => kind === "configuracion";
