/**
 * ════════════════════════════════════════════════════════════════════════════
 * DÓNDE SE ESTÁ EJECUTANDO ESTO
 *
 * Un único sitio que lo sabe. El resto del panel pregunta aquí.
 *
 * ── POR QUÉ NO SE LLAMA A CAPACITOR DIRECTAMENTE ──────────────────────────
 * Porque ya sabemos cómo acaba: la app del vigilante tiene CUARENTA Y NUEVE
 * llamadas a `Capacitor.isNativePlatform()` repartidas por sus ficheros. Cada
 * una es una decisión tomada por separado, imposible de auditar de un vistazo y
 * imposible de simular en una prueba sin parchear el módulo de Capacitor.
 *
 * Aquí se resuelve UNA vez al cargar. Los valores no cambian durante la vida
 * del proceso —una app nativa no se convierte en web a mitad de sesión—, así
 * que son constantes y no hace falta un hook para leerlas.
 *
 * ── Y EN WEB NO PESA NADA ─────────────────────────────────────────────────
 * Ni siquiera se importa `@capacitor/core`. Se hizo así primero y costó 32 kB
 * al paquete de la web por responder a una pregunta cuya respuesta en web es
 * siempre «no».
 *
 * No hace falta: en una app instalada, Capacitor INYECTA `window.Capacitor`
 * antes de que arranque nada. Leer ese global dice lo mismo y pesa cero. En un
 * navegador el global no existe y la respuesta es «web», que es la correcta.
 *
 * Los plugins —barra de estado, teclado, red, háptica— sí pesan, y por eso se
 * cargan bajo demanda y sólo cuando `esNativo` es cierto.
 * ════════════════════════════════════════════════════════════════════════════
 */

export type Plataforma = "web" | "ios" | "android";

/** Lo que Capacitor inyecta en el WebView de una app instalada. */
interface GlobalDeCapacitor {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
}

const global = (): GlobalDeCapacitor | undefined =>
  (globalThis as { Capacitor?: GlobalDeCapacitor }).Capacitor;

const cual = (): Plataforma => {
  const p = global()?.getPlatform?.();
  return p === "ios" || p === "android" ? p : "web";
};

export const plataforma: Plataforma = cual();

/** Dentro de la aplicación instalada (no un navegador, ni siquiera en móvil). */
export const esNativo: boolean = global()?.isNativePlatform?.() === true;

export const esIOS: boolean = plataforma === "ios";
export const esAndroid: boolean = plataforma === "android";
export const esWeb: boolean = !esNativo;

/**
 * Ejecuta algo SÓLO en nativo, y nunca deja que un fallo del plugin tumbe la
 * pantalla.
 *
 * En web devuelve `undefined` sin importar nada: es la pieza que hace que el
 * resto del código pueda pedir háptica o barra de estado sin preguntar antes
 * dónde está, y sin arrastrar el plugin al paquete de la web.
 *
 * Los errores se TRAGAN a propósito. Un plugin nativo que falla —permiso
 * denegado, versión de sistema vieja, simulador sin motor háptico— no puede
 * impedir que alguien entre en su panel. Es decoración de plataforma, no
 * funcionalidad.
 */
export async function soloNativo<T>(fn: () => Promise<T>): Promise<T | undefined> {
  if (!esNativo) return undefined;
  try {
    return await fn();
  } catch {
    return undefined;
  }
}

/** El mismo trato para lo que no es asíncrono. */
export function siNativo(fn: () => void): void {
  if (!esNativo) return;
  try { fn(); } catch { /* ver `soloNativo` */ }
}
