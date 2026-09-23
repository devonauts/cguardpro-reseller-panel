import type { Tono } from "@/components/cristal";
import type { Clave } from "@/i18n/idioma";

/**
 * Cómo se cuenta cada estado de un dominio: rótulo, tono y la frase de ayuda.
 *
 * Vive aquí y no en la pantalla de Dominios porque el tablero enseña el mismo
 * estado. Con dos mapas, el día que se añada un estado una de las dos pantallas
 * diría «Configuración DNS requerida» de un dominio que ya está conectado.
 */
export const ESTADO_DE_DOMINIO: Record<string, { texto: Clave; tono: Tono; ayuda: Clave }> = {
  activo: {
    texto: "dominios.conectado", tono: "ok", ayuda: "dominios.conectadoAyuda",
  },
  pendiente_dns: {
    texto: "dominios.dnsRequerida", tono: "aviso", ayuda: "dominios.dnsRequeridaAyuda",
  },
  verificando: {
    texto: "dominios.verificando", tono: "aviso", ayuda: "dominios.verificandoAyuda",
  },
  pendiente_tls: {
    texto: "dominios.preparandoSsl", tono: "aviso", ayuda: "dominios.preparandoSslAyuda",
  },
  mal_configurado: {
    texto: "dominios.requiereAtencion", tono: "peligro", ayuda: "dominios.requiereAtencionAyuda",
  },
  desactivado: {
    texto: "dominios.desactivado", tono: "neutro", ayuda: "dominios.desactivadoAyuda",
  },
};

export function estadoDeDominio(estado: string | null | undefined) {
  return ESTADO_DE_DOMINIO[estado ?? ""] ?? ESTADO_DE_DOMINIO.pendiente_dns;
}
