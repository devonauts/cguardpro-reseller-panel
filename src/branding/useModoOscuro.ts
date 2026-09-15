import { useEffect, useState } from "react";

/**
 * ¿Está el sistema en modo oscuro?
 *
 * Hace falta para elegir entre el logotipo claro y el oscuro del socio, y tiene
 * que ser REACTIVO: quien cambia el tema del sistema con el panel abierto
 * esperaría ver el logotipo correcto sin recargar, y si no cambia se queda con
 * un logotipo que no se lee sobre el fondo nuevo.
 *
 * Fuera de un navegador —o sin `matchMedia`, que alguna vista incrustada no
 * trae— se responde «claro», que es el modo en el que casi todo logotipo se ve.
 */
export default function useModoOscuro(): boolean {
  const [oscuro, setOscuro] = useState(() => {
    try {
      return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia("(prefers-color-scheme: dark)");
    } catch {
      return;
    }
    const alCambiar = (e: MediaQueryListEvent) => setOscuro(e.matches);
    /* `addEventListener` es lo moderno; `addListener` sigue siendo lo único que
       entienden algunas vistas incrustadas, y el panel se abre en más sitios
       que un Chrome de escritorio. */
    if (mq.addEventListener) mq.addEventListener("change", alCambiar);
    else mq.addListener?.(alCambiar);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", alCambiar);
      else mq.removeListener?.(alCambiar);
    };
  }, []);

  return oscuro;
}
