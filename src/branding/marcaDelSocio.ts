/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL PANEL SE VISTE CON LA MARCA DE SU SOCIO
 *
 * `index.html` sale a propósito sin título ni icono: hasta que no se sabe QUIÉN
 * ha entrado no se sabe de quién es este panel. Aquí se aplica lo que `/me`
 * devuelve — y sólo lo PUBLICADO, nunca el borrador: lo que un socio está
 * probando no puede escaparse a su propio panel antes de que lo apruebe.
 *
 * ── NO SE RESUELVE NADA AQUÍ ──────────────────────────────────────────────
 * Qué logotipo toca en cada superficie lo decidió el servidor
 * (`resolverActivos`) y llega ya resuelto. Si aquí hubiera una segunda cadena
 * de respaldos, el día que cambie una regla habría dos respuestas distintas a
 * la misma pregunta — y la mitad de las veces la equivocada sería la que ve el
 * cliente de un socio.
 *
 * ── LA REGLA QUE PROTEGE LA MARCA BLANCA ──────────────────────────────────
 * Cuando falta una imagen NO se cae al logotipo de CGuardPro. Se enseña el
 * NOMBRE del socio en texto. Con `showPlatformAttribution=false` ese respaldo
 * filtraría justo la identidad que el socio paga por ocultar, y encima por
 * accidente. Un hueco es un defecto cosmético; el logotipo de otra empresa en
 * el panel de tus clientes es un incidente.
 * ════════════════════════════════════════════════════════════════════════════
 */
import type { MarcaParaPintar } from "@/services/resellerService";
import { t } from "@/i18n/idioma";

/**
 * El título de partida de la pestaña, para poder devolverlo al cerrar sesión.
 *
 * Es una función y no una constante: una constante de módulo se quedaría con el
 * idioma que hubiera al cargar el fichero, y la pestaña seguiría diciendo
 * «Panel de socio» después de pasar el panel a inglés.
 */
const tituloNeutro = () => t("armazon.tituloNeutro");

/**
 * Aplica el color de marca a las fichas de diseño.
 *
 * Las fichas ya razonan en oklch con tono y croma separados
 * (`--brand-h`, `--brand-c`), que es exactamente el par que guarda el backend.
 * No hay conversión: se escriben los dos valores y toda la paleta —hover, halo,
 * fondo suave— se recalcula sola porque está derivada de ellos.
 */
export function aplicarColor(hue: number | null, chroma: number | null): void {
  const raiz = document.documentElement;
  if (hue === null || hue === undefined) raiz.style.removeProperty("--brand-h");
  else raiz.style.setProperty("--brand-h", String(hue));

  if (chroma === null || chroma === undefined) raiz.style.removeProperty("--brand-c");
  else raiz.style.setProperty("--brand-c", String(chroma));
}

/** Pone el título de la pestaña. */
export function aplicarTitulo(nombre: string | null | undefined): void {
  document.title = (nombre && nombre.trim()) || tituloNeutro();
}

/**
 * Pone el icono de la pestaña.
 *
 * Se reutiliza SIEMPRE el mismo `<link>`: añadir uno nuevo en cada cambio deja
 * una pila de iconos y los navegadores no coinciden en cuál eligen de una
 * lista. Sin icono configurado se retira el enlace y el navegador enseña el
 * suyo por defecto — que es anónimo, y eso es lo correcto: mejor ninguno que el
 * de otra empresa.
 */
export function aplicarIcono(url: string | null | undefined): void {
  const id = "marca-del-socio-favicon";
  const existente = document.getElementById(id) as HTMLLinkElement | null;
  if (!url) {
    existente?.remove();
    return;
  }
  const link = existente ?? document.createElement("link");
  link.id = id;
  link.rel = "icon";
  link.href = url;
  if (!existente) document.head.appendChild(link);
}

/** Todo junto. Se llama al entrar y cada vez que la marca cambia. */
export function aplicarMarca(marca: MarcaParaPintar | null | undefined): void {
  aplicarColor(marca?.brandHue ?? null, marca?.brandChroma ?? null);
  aplicarTitulo(marca?.platformName ?? null);
  aplicarIcono(marca?.assets?.favicon ?? null);
}

/** Al cerrar sesión: el panel deja de ser de nadie hasta que alguien entre. */
export function limpiarMarca(): void {
  aplicarColor(null, null);
  aplicarTitulo(null);
  aplicarIcono(null);
}

/**
 * Qué logotipo toca en la cabecera, según el modo del sistema.
 *
 * `null` significa «no hay imagen»: quien llama enseña el nombre en texto. No
 * devuelve jamás un activo de la plataforma.
 */
export function logoDeCabecera(
  marca: MarcaParaPintar | null | undefined,
  oscuro: boolean,
): string | null {
  return (oscuro ? marca?.assets?.fullDark : marca?.assets?.fullLight) ?? null;
}

/** La marca compacta, para la barra plegada y los avatares. */
export function marcaCompacta(
  marca: MarcaParaPintar | null | undefined,
  oscuro: boolean,
): string | null {
  return (oscuro ? marca?.assets?.markDark : marca?.assets?.markLight) ?? null;
}
