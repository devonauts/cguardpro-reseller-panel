/**
 * ════════════════════════════════════════════════════════════════════════════
 * CÓMO SE LLAMA EN CASTELLANO EL ESTADO DE UN MIEMBRO DEL EQUIPO
 *
 * `active | invited | archived` son los tres estados que guarda el servidor.
 * Son identificadores, no texto para nadie: «archived» en una pantalla que lee
 * el socio es jerga, y además engaña —no es que su ficha esté archivada, es que
 * la persona ya no entra—. Por eso «Desactivado».
 *
 * Vive aquí y no dentro de una pantalla porque lo necesitan DOS: la de Equipo,
 * que pinta la insignia de cada fila, y la de Actividad, que tiene que nombrar
 * el estado con el que terminó una baja. Repetir la tabla en las dos es cómo se
 * llega a que una diga «Desactivado» y la otra «archived».
 *
 * SIN DEPENDENCIAS. Nada de `services/`: importar de allí arrastra el cliente
 * de axios, que toca `localStorage`, y las pruebas no tienen navegador.
 * ════════════════════════════════════════════════════════════════════════════
 */

export type EstadoDeMiembro = "active" | "invited" | "archived";

export type TonoDeEstado = "ok" | "aviso" | "neutro";

export const ESTADO_DE_MIEMBRO: Record<string, { texto: string; tono: TonoDeEstado }> = {
  active: { texto: "Activo", tono: "ok" },
  invited: { texto: "Invitado", tono: "aviso" },
  archived: { texto: "Desactivado", tono: "neutro" },
};

/**
 * Un estado que no conocemos se enseña TAL CUAL. Si el servidor añade un cuarto
 * estado, es mejor que el socio lea un identificador raro —y lo reporte— a que
 * la pantalla se invente un nombre bonito para algo que no sabe qué es.
 */
export function textoDeEstado(estado: string | null | undefined): string {
  if (!estado) return "—";
  return ESTADO_DE_MIEMBRO[estado]?.texto ?? estado;
}
