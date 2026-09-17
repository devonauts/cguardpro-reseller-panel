import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { arrancarNativo, ocultarSplash } from "./arranqueNativo";
import { atenderAtras } from "./botonAtras";
import { esNativo } from "./plataforma";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL CICLO DE VIDA DE LA APP INSTALADA
 *
 * Va DENTRO del enrutador porque atrás necesita saber navegar, y fuera de todo
 * lo demás porque no pinta nada. En web no hace absolutamente nada: las tres
 * llamadas se cortan solas en `esNativo`.
 *
 * ── LA PANTALLA DE ARRANQUE SE QUITA AQUÍ, NO ANTES ───────────────────────
 * Si se quita al cargar el JavaScript, se ve un instante de aplicación vacía
 * mientras React monta y la sesión guardada se lee del almacén —que ahora es
 * asíncrono—. Quitarla cuando este componente ya está montado significa que
 * detrás hay algo pintado.
 *
 * ── Y ATRÁS NO CIERRA LA APLICACIÓN ───────────────────────────────────────
 * Se le da al módulo la única cosa que no puede saber por su cuenta: cómo
 * retroceder. Devuelve `false` cuando ya no hay a dónde, y sólo entonces se
 * sale — que en la raíz sí es lo que espera cualquiera en Android.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function CicloNativo() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!esNativo) return undefined;

    let soltar: (() => void) | undefined;
    let vivo = true;

    void (async () => {
      await arrancarNativo();
      /* `history.state.idx` lo lleva react-router: 0 es la primera entrada de
         la sesión, y desde ahí atrás tiene que salir y no quedarse quieto. */
      const quitar = await atenderAtras(() => {
        const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
        if (idx <= 0) return false;
        navigate(-1);
        return true;
      });
      if (!vivo) { quitar(); return; }
      soltar = quitar;
      await ocultarSplash();
    })();

    return () => { vivo = false; soltar?.(); };
  }, [navigate]);

  return null;
}

export default CicloNativo;
