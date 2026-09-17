import { useEffect } from "react";

import { esAndroid } from "./plataforma";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL BOTÓN ATRÁS DE ANDROID
 *
 * Android tiene un botón físico —o un gesto— que la web no tiene, y si nadie
 * lo atiende CIERRA LA APLICACIÓN. Cerrarla desde la tercera pantalla de un
 * flujo, perdiendo lo que se estaba haciendo, es la queja número uno de las
 * aplicaciones híbridas mal montadas.
 *
 * El orden es el que espera cualquiera que use Android:
 *
 *   1 · si hay algo abierto encima (menú, hoja, diálogo) → se cierra eso
 *   2 · si se puede retroceder en la navegación → se retrocede
 *   3 · si se está en la raíz → se sale, que ahí sí es lo correcto
 *
 * Quien abre una capa se registra con `atenderAtras`, y el más reciente gana.
 * Es una PILA y no un único manejador: con un solo hueco, abrir un menú dentro
 * de un diálogo haría que atrás cerrara el diálogo y dejara el menú flotando.
 * ════════════════════════════════════════════════════════════════════════════
 */

type Manejador = () => boolean;

const pila: Manejador[] = [];

/** Registra un manejador mientras el componente esté montado. */
export function useAtras(manejador: Manejador, activo = true): void {
  useEffect(() => {
    if (!activo) return undefined;
    pila.push(manejador);
    return () => {
      const i = pila.lastIndexOf(manejador);
      if (i >= 0) pila.splice(i, 1);
    };
  }, [manejador, activo]);
}

/**
 * Se engancha una vez, al arrancar. Devuelve cómo soltarlo.
 *
 * `irAtras` lo pone quien monta la aplicación, porque quien sabe navegar es el
 * enrutador y este módulo no debe conocerlo.
 */
export async function atenderAtras(
  irAtras: () => boolean,
): Promise<() => void> {
  if (!esAndroid) return () => {};

  try {
    const { App } = await import("@capacitor/app");
    const oyente = await App.addListener("backButton", () => {
      /* Del más reciente al más antiguo: el que devuelva `true` se lo queda. */
      for (let i = pila.length - 1; i >= 0; i -= 1) {
        if (pila[i]()) return;
      }
      if (irAtras()) return;
      void App.exitApp();
    });
    return () => { void oyente.remove(); };
  } catch {
    return () => {};
  }
}
