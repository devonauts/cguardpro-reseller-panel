/**
 * ════════════════════════════════════════════════════════════════════════════
 * LAS NOVEDADES DEL PANEL — «qué hay de nuevo», como en cualquier SaaS.
 *
 * Una novedad es una tarjeta que se ancla a la pieza de la pantalla que
 * presenta (con un anillo que la señala), aparece UNA vez por persona y se
 * cierra con un clic. Para anunciar algo nuevo basta con añadir una entrada
 * aquí: el componente `Novedades` enseña la primera que no se haya visto.
 *
 * Se recuerda en el navegador: es un aviso de producto, no un dato de la cuenta.
 * ════════════════════════════════════════════════════════════════════════════
 */
export interface Novedad {
  /** Único y para siempre: si cambia, se vuelve a enseñar a todo el mundo. */
  id: string;
  /** Selector de la pieza a la que apunta. Si no está en pantalla, no se enseña. */
  ancla: string;
  /** Hasta cuándo tiene sentido anunciarla (después, ya no es noticia). */
  caduca: string;
}

export const NOVEDADES: Novedad[] = [
  { id: "modo-claro-2026-09", ancla: ".barra__ficha", caduca: "2026-12-31" },
];

const CLAVE = "cguard_reseller_novedades_vistas";

export function vistas(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(CLAVE) || "[]")); } catch { return new Set(); }
}

export function marcarVista(id: string): void {
  try {
    const s = vistas();
    s.add(id);
    localStorage.setItem(CLAVE, JSON.stringify([...s]));
  } catch { /* sin almacenamiento: se enseñará otra vez, no pasa nada */ }
}

/** La que toca ahora: la primera no vista y no caducada. */
export function pendiente(
  lista: Novedad[] = NOVEDADES,
  yaVistas: ReadonlySet<string> = vistas(),
  hoy: Date = new Date(),
): Novedad | null {
  return lista.find((n) => !yaVistas.has(n.id) && new Date(`${n.caduca}T23:59:59`) >= hoy) ?? null;
}
