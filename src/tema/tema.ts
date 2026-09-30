import { useEffect, useState } from "react";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * CLARO U OSCURO
 *
 * El panel nació oscuro (negro mate y cristal). El claro (2026-09-30) es «estar
 * en una nube»: cielo de fondo, cristal blanco y sombras suaves. Lo elige cada
 * persona con el interruptor del menú de su perfil.
 *
 * Se aplica como `data-tema` en `<html>` ANTES de pintar (ver `main.tsx`): así
 * no hay un fotograma negro antes del claro. Las fichas de `tokens.css` hacen
 * el resto; ningún componente pregunta por el tema salvo los que eligen una
 * IMAGEN distinta (el fondo y el logotipo del socio).
 *
 * Se guarda en el navegador: es una preferencia de pantalla, no un dato de la
 * cuenta. Por defecto, oscuro — el panel que ya conocen.
 * ════════════════════════════════════════════════════════════════════════════
 */
export type Tema = "oscuro" | "claro";

const CLAVE = "cguard_reseller_tema";
const EVENTO = "tema-cambiado";

export function leerTema(): Tema {
  try {
    return localStorage.getItem(CLAVE) === "claro" ? "claro" : "oscuro";
  } catch {
    return "oscuro";
  }
}

export function aplicarTema(tema: Tema): void {
  const raiz = document.documentElement;
  raiz.dataset.tema = tema;
  // Los controles nativos (barras de desplazamiento, calendarios) del mismo lado.
  raiz.style.colorScheme = tema === "claro" ? "light" : "dark";
}

export function guardarTema(tema: Tema): void {
  try { localStorage.setItem(CLAVE, tema); } catch { /* sin almacenamiento: vale sólo esta visita */ }
  aplicarTema(tema);
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: tema }));
}

/** El tema actual, y avisa cuando cambia (también desde otra pestaña). */
export function useTema(): [Tema, (t: Tema) => void] {
  const [tema, setTema] = useState<Tema>(leerTema);
  useEffect(() => {
    const alCambiar = () => setTema(leerTema());
    window.addEventListener(EVENTO, alCambiar);
    window.addEventListener("storage", alCambiar);
    return () => {
      window.removeEventListener(EVENTO, alCambiar);
      window.removeEventListener("storage", alCambiar);
    };
  }, []);
  return [tema, guardarTema];
}
