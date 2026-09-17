import { esNativo, soloNativo } from "./plataforma";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SALIR DE LA APLICACIÓN, POR UN SOLO SITIO
 *
 * ── POR QUÉ NO `window.open` REPARTIDO ────────────────────────────────────
 * En una app instalada, `window.open` navega DENTRO del WebView. La persona
 * acaba con cguardpro.com —o con el cliente de correo, o con el panel de su
 * proveedor de DNS— cargado encima de su sesión, sin barra de direcciones, sin
 * botón de atrás y sin forma de volver salvo matar la aplicación. Y si esa
 * página fuera hostil, estaría corriendo en el mismo WebView que la sesión.
 *
 * Aquí se decide una vez: lo externo se abre FUERA, en el navegador del
 * sistema, que sí tiene barra, atrás y su propio aislamiento.
 * ════════════════════════════════════════════════════════════════════════════
 */

/** Sólo estos esquemas salen. Nada de `javascript:`, `file:` ni `intent:`. */
const ESQUEMAS = new Set(["https:", "mailto:"]);

export async function abrirFuera(url: string): Promise<void> {
  let destino: URL;
  try {
    destino = new URL(url);
  } catch {
    return; // una dirección que no se puede leer no se abre
  }
  if (!ESQUEMAS.has(destino.protocol)) return;

  if (!esNativo) {
    /* `noopener,noreferrer`: sin el primero la pestaña abierta puede
       redirigir a la nuestra por `window.opener`; sin el segundo, el destino
       recibe de dónde viene la visita — y de dónde viene es el panel de un
       socio. */
    window.open(destino.toString(), "_blank", "noopener,noreferrer");
    return;
  }

  /* `mailto:` no lo abre un navegador: lo abre el cliente de correo. Se
     delega al sistema poniendo la dirección, que es como el WebView entrega
     los esquemas que no sabe manejar. */
  if (destino.protocol === "mailto:") {
    window.location.href = destino.toString();
    return;
  }

  /* `Browser.open` es SFSafariViewController en iOS y Custom Tabs en Android:
     navegador de verdad, con su barra, su botón de cerrar y su propio
     aislamiento — y vuelve a la aplicación al cerrarlo. `App.openUrl`, que
     sería lo obvio, ya no existe en Capacitor 6. */
  await soloNativo(async () => {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: destino.toString(), presentationStyle: "popover" });
  });
}

/** Para usarlo en un `onClick` sin tener que escribir el `void` cada vez. */
export const alAbrirFuera = (url: string) => (e: { preventDefault(): void }) => {
  e.preventDefault();
  void abrirFuera(url);
};
