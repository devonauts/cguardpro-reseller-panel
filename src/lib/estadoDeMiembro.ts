/**
 * ════════════════════════════════════════════════════════════════════════════
 * CÓMO SE LLAMA EL ESTADO DE UN MIEMBRO DEL EQUIPO
 *
 * `active | invited | archived` son los tres estados que guarda el servidor.
 * Son identificadores, no texto para nadie: «archived» en una pantalla que lee
 * el socio es jerga, y además engaña —no es que su ficha esté archivada, es que
 * la persona ya no entra—. Por eso «Deactivated» / «Desactivado».
 *
 * Vive aquí y no dentro de una pantalla porque lo necesitan DOS: la de Equipo,
 * que pinta la insignia de cada fila, y la de Actividad, que tiene que nombrar
 * el estado con el que terminó una baja. Repetir la tabla en las dos es cómo se
 * llega a que una diga «Desactivado» y la otra «archived».
 *
 * ── EL TONO ES FIJO; EL TEXTO NO ──────────────────────────────────────────
 * El color no depende del idioma, así que la tabla de tonos sigue siendo una
 * constante. El texto se pide al catálogo en el momento de pintar: si se
 * congelara en una constante de módulo, se quedaría con el idioma que hubiera
 * al cargar el fichero y no cambiaría al pulsar el selector.
 *
 * SIN DEPENDENCIAS DE RED. Nada de `services/`: importar de allí arrastra el
 * cliente de axios, que toca `localStorage`, y las pruebas no tienen navegador.
 * ════════════════════════════════════════════════════════════════════════════
 */

import { t } from "@/i18n/idioma";

export type EstadoDeMiembro = "active" | "invited" | "archived";

export type TonoDeEstado = "ok" | "aviso" | "neutro";

export const TONO_DE_MIEMBRO: Record<string, TonoDeEstado> = {
  active: "ok",
  invited: "aviso",
  archived: "neutro",
};

/**
 * Un estado que no conocemos se enseña TAL CUAL. Si el servidor añade un cuarto
 * estado, es mejor que el socio lea un identificador raro —y lo reporte— a que
 * la pantalla se invente un nombre bonito para algo que no sabe qué es.
 */
export function textoDeEstado(estado: string | null | undefined): string {
  if (!estado) return "—";
  switch (estado) {
    case "active": return t("estadoMiembro.active");
    case "invited": return t("estadoMiembro.invited");
    case "archived": return t("estadoMiembro.archived");
    default: return estado;
  }
}

/** Texto y tono juntos, que es como los pide cada fila. `null` si no lo conocemos. */
export function estadoDeMiembro(
  estado: string | null | undefined,
): { texto: string; tono: TonoDeEstado } | null {
  if (!estado || !(estado in TONO_DE_MIEMBRO)) return null;
  return { texto: textoDeEstado(estado), tono: TONO_DE_MIEMBRO[estado] };
}
