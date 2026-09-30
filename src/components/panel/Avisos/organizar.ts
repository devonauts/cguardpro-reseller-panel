import type { Notificacion } from "@/services/resellerService";

/**
 * Cómo se ordena el cajón, como el centro de notificaciones de iOS y la campana
 * del CRM:
 *   · arriba lo NO leído («Nuevas»), siempre;
 *   · debajo lo leído, por día (hoy · ayer · antes);
 *   · dentro de cada bloque, los avisos SEGUIDOS del mismo tipo se apilan: tres
 *     «tu ticket tiene respuesta» son una pila con un «3», no tres filas.
 *
 * Pura y sin navegador, para poder probarla.
 */
export interface Pila {
  clave: string;
  tipo: string;
  avisos: Notificacion[];
}

export type Dia = "hoy" | "ayer" | "antes";

export interface Bandeja {
  nuevas: Pila[];
  secciones: Array<{ dia: Dia; pilas: Pila[] }>;
}

function apilar(avisos: Notificacion[], prefijo: string): Pila[] {
  const pilas: Pila[] = [];
  for (const a of avisos) {
    const ultima = pilas[pilas.length - 1];
    if (ultima && ultima.tipo === a.tipo) ultima.avisos.push(a);
    else pilas.push({ clave: `${prefijo}:${a.id}`, tipo: a.tipo, avisos: [a] });
  }
  return pilas;
}

function diaDe(iso: string, ahora: Date): Dia {
  const d = new Date(iso);
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
  if (d.getTime() >= inicioHoy) return "hoy";
  if (d.getTime() >= inicioHoy - 86_400_000) return "ayer";
  return "antes";
}

export function organizar(
  avisos: Notificacion[],
  quitados: ReadonlySet<string> = new Set(),
  ahora: Date = new Date(),
): Bandeja {
  const vivos = avisos
    .filter((a) => !quitados.has(a.id))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  const nuevas = apilar(vivos.filter((a) => !a.leido), "n");
  const secciones: Bandeja["secciones"] = [];
  for (const dia of ["hoy", "ayer", "antes"] as const) {
    const delDia = vivos.filter((a) => a.leido && diaDe(a.createdAt, ahora) === dia);
    if (delDia.length) secciones.push({ dia, pilas: apilar(delDia, dia) });
  }
  return { nuevas, secciones };
}
