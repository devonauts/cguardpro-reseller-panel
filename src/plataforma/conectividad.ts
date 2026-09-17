import { useEffect, useState } from "react";

import { esNativo } from "./plataforma";

/**
 * ¿Hay conexión?
 *
 * ── DOS FUENTES, UNA RESPUESTA ────────────────────────────────────────────
 * En web, los eventos `online`/`offline` del navegador. En nativo, el plugin
 * de red de Capacitor, que sabe distinguir wifi de datos y avisa al volver del
 * modo avión — cosas que el navegador no cuenta.
 *
 * Quien lo usa no elige: pregunta y ya. Y NO hay sondeo: los dos caminos son
 * por evento. Un temporizador que pregunta «¿hay red?» cada pocos segundos
 * despierta la radio del teléfono para nada y se come la batería.
 */
export function useConectividad(): boolean {
  const [enLinea, setEnLinea] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    if (!esNativo) {
      const arriba = () => setEnLinea(true);
      const abajo = () => setEnLinea(false);
      window.addEventListener("online", arriba);
      window.addEventListener("offline", abajo);
      return () => {
        window.removeEventListener("online", arriba);
        window.removeEventListener("offline", abajo);
      };
    }

    let vivo = true;
    let quitar: (() => void) | undefined;

    void (async () => {
      try {
        const { Network } = await import("@capacitor/network");
        const estado = await Network.getStatus();
        if (vivo) setEnLinea(estado.connected);
        const oyente = await Network.addListener("networkStatusChange", (s) => {
          if (vivo) setEnLinea(s.connected);
        });
        /* Se quita SÓLO este oyente. `Network.removeAllListeners()` arrancaría
           también los de cualquier otra parte de la aplicación — el mismo
           error que dejó una nota en `worker-app/src/lib/deviceStatus.ts`. */
        quitar = () => { void oyente.remove(); };
      } catch {
        /* sin plugin, se asume que hay conexión: es mejor intentar la petición
           y fallar con un mensaje real que bloquear la pantalla por si acaso */
      }
    })();

    return () => { vivo = false; quitar?.(); };
  }, []);

  return enLinea;
}
