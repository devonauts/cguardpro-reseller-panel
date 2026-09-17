import { esAndroid, esNativo, siNativo, soloNativo } from "./plataforma";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * LO QUE HAY QUE DECIRLE AL SISTEMA AL ARRANCAR
 *
 * Barra de estado, splash y teclado. Se hace UNA vez, aquí, y no repartido por
 * las pantallas: son ajustes del proceso, no de una vista.
 *
 * Todos los plugins se importan DENTRO de la función y bajo `soloNativo`. Así
 * el paquete de la web no los incluye: Vite los parte en trozos aparte que un
 * navegador nunca llega a pedir.
 * ════════════════════════════════════════════════════════════════════════════
 */
export async function arrancarNativo(): Promise<void> {
  if (!esNativo) return;

  /* ── La barra de estado ───────────────────────────────────────────────
     El panel es negro mate, así que el contenido de la barra va en CLARO. Y se
     le dice que NO superponga: con superposición el contenido se mete debajo
     del reloj y hay que compensarlo a mano en cada pantalla. Lo hace el
     sistema, que sabe la altura real del aparato. */
  await soloNativo(async () => {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setOverlaysWebView({ overlay: false });
    if (esAndroid) {
      /* Android sí pinta un fondo detrás de la barra; iOS lo ignora. Se le da
         el mismo negro del lienzo para que no aparezca la franja gris del
         sistema encima de la aplicación. */
      await StatusBar.setBackgroundColor({ color: "#0a0a0a" });
    }
  });

  /* ── El teclado ───────────────────────────────────────────────────────
     `resize: native` deja que el sistema encoja la vista. La alternativa
     (`body`) reescribe el alto del documento y hace saltar el diseño con cada
     apertura. Y el acento oscuro para que la barra de sugerencias de iOS no
     salga blanca sobre un formulario negro. */
  await soloNativo(async () => {
    const { Keyboard, KeyboardResize, KeyboardStyle } = await import("@capacitor/keyboard");
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
    await Keyboard.setStyle({ style: KeyboardStyle.Dark });
    await Keyboard.setAccessoryBarVisible({ isVisible: true });
  });
}

/**
 * Quitar el splash — y esto se llama cuando la aplicación PUEDE PINTARSE, no
 * cuando ha terminado de cargar datos.
 *
 * Dejarlo puesto mientras se resuelve la sesión convierte una pantalla de marca
 * en una pantalla de carga encubierta: si la red va lenta, el arranque parece
 * colgado y no hay nada que tocar. Fuera el splash, y lo que falte que se
 * enseñe con esqueletos, que sí se pueden mirar.
 */
export function ocultarSplash(): void {
  siNativo(() => {
    void import("@capacitor/splash-screen").then(({ SplashScreen }) =>
      SplashScreen.hide().catch(() => { /* ya estaba oculto */ }));
  });
}
