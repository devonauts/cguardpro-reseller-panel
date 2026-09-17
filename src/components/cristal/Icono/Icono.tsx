import "./Icono.scss";

/**
 * Los iconos del panel, dibujados a mano y en línea.
 *
 * ── POR QUÉ NO UNA LIBRERÍA ───────────────────────────────────────────────
 * Son nueve. Traerse un paquete de iconos por nueve trazos añade una
 * dependencia, un calendario de versiones ajeno y —si se carga por fuente o
 * por sprite— una petición más antes de que la pantalla de entrada se pueda
 * leer. En línea van con el marcado, heredan `currentColor` y no pueden
 * llegar tarde.
 *
 * Todos comparten lienzo de 24 y trazo de 1.5: mezclar grosores es lo que hace
 * que un conjunto de iconos parezca recortado de sitios distintos.
 */

export type NombreDeIcono =
  | "escudo" | "correo" | "candado" | "ojo" | "ojo-tachado"
  | "globo" | "galon" | "flecha" | "grafico";

const TRAZOS: Record<NombreDeIcono, JSX.Element> = {
  escudo: <path d="M12 3 4.5 6v5.5c0 4.3 3.1 8.2 7.5 9.5 4.4-1.3 7.5-5.2 7.5-9.5V6L12 3Z" />,
  correo: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="m3.8 7.4 7.3 5.2a1.6 1.6 0 0 0 1.8 0l7.3-5.2" />
    </>
  ),
  candado: (
    <>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    </>
  ),
  ojo: (
    <>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "ojo-tachado": (
    <>
      <path d="M9.9 5.9A9.6 9.6 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-3 3.8M6.2 7.9A17 17 0 0 0 2.5 12S6 18.2 12 18.2c1 0 1.9-.1 2.7-.4" />
      <path d="m4 4 16 16" />
    </>
  ),
  globo: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.2 2.3 3.3 5.3 3.3 8.5S14.2 18.2 12 20.5c-2.2-2.3-3.3-5.3-3.3-8.5S9.8 5.8 12 3.5Z" />
    </>
  ),
  galon: <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />,
  flecha: <path d="M4.5 12h15m0 0-5.5-5.5M19.5 12 14 17.5" />,
  grafico: (
    <>
      <path d="M5 19.5V12M12 19.5V5.5M19 19.5v-5" />
    </>
  ),
};

export function Icono({
  nombre, tamano = 20, className = "",
}: {
  nombre: NombreDeIcono;
  tamano?: number;
  className?: string;
}) {
  return (
    <svg
      className={`icono ${className}`.trim()}
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      /* Decorativo: quien lo acompaña ya lleva su texto o su `aria-label`. Un
         icono que se anuncia además del rótulo lo dice todo dos veces. */
      aria-hidden="true"
      focusable="false"
    >
      {TRAZOS[nombre]}
    </svg>
  );
}

export default Icono;
