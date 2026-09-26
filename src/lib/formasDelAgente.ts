/**
 * The assistant's silhouettes a partner can choose (viewBox 0 0 48 54).
 *
 * Mirrors the CRM's `src/lib/formasDelAgente.ts`, WITHOUT the shield: the shield
 * is the platform's own assistant and a partner's customers never see it. The
 * server rejects it too (`validarForma`).
 */

export const FORMAS_DEL_AGENTE = ["orbe", "burbuja", "hexagono", "rombo", "chispa", "robot"] as const;
export type FormaDelAgente = (typeof FORMAS_DEL_AGENTE)[number];

export const FORMA_POR_DEFECTO: FormaDelAgente = "orbe";

export const SILUETAS: Record<FormaDelAgente, { d: string; cy: number }> = {
  orbe: { d: "M24 5a20 20 0 1 1 0 40 20 20 0 0 1 0-40z", cy: 25 },
  burbuja: {
    d: "M16 5h16a12 12 0 0 1 12 12v10a12 12 0 0 1-12 12H22l-9 8v-8.6A12 12 0 0 1 4 27V17A12 12 0 0 1 16 5z",
    cy: 22,
  },
  hexagono: { d: "M24 4 42 14.5v21L24 46 6 35.5v-21z", cy: 25 },
  rombo: { d: "M24 3 45 25 24 47 3 25z", cy: 25 },
  chispa: { d: "M24 3c2 10 8 16 20 22-12 6-18 12-20 22-2-10-8-16-20-22 12-6 18-12 20-22z", cy: 25 },
  robot: {
    d: "M24 3a3 3 0 0 1 1.5 5.6V12H36a8 8 0 0 1 8 8v16a8 8 0 0 1-8 8H12a8 8 0 0 1-8-8V20a8 8 0 0 1 8-8h10.5V8.6A3 3 0 0 1 24 3z",
    cy: 28,
  },
};

export function esForma(v: unknown): v is FormaDelAgente {
  return typeof v === "string" && (FORMAS_DEL_AGENTE as readonly string[]).includes(v);
}

/** Same rule as the CRM bubble: up to 6 characters whole, otherwise initials. */
export function siglaDelAgente(nombre: string): string {
  const limpio = (nombre || "").trim().replace(/\s+/g, " ");
  if (!limpio) return "IA";
  if (limpio.length <= 6) return limpio;
  const palabras = limpio.split(" ").filter(Boolean);
  if (palabras.length > 1) return palabras.slice(0, 3).map((p) => p[0]).join("").toUpperCase();
  return limpio.slice(0, 3);
}
