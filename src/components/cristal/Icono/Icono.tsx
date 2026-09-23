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
  | "globo" | "galon" | "flecha" | "grafico"
  | "casa" | "edificio" | "paleta" | "personas" | "tarjeta" | "engranaje"
  | "lupa" | "corona" | "libro" | "auriculares" | "bocadillo" | "mas"
  | "sol" | "puntos" | "visto";

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
  grafico: <path d="M5 19.5V12M12 19.5V5.5M19 19.5v-5" />,
  casa: <path d="M4 10.2 12 4l8 6.2V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.8Z" />,
  edificio: (
    <>
      <path d="M4.5 20.5V5.2a1.2 1.2 0 0 1 1.2-1.2h7.1a1.2 1.2 0 0 1 1.2 1.2v15.3" />
      <path d="M14 10.5h4.3a1.2 1.2 0 0 1 1.2 1.2v8.8M3 20.5h18" />
      <path d="M7.6 8h3M7.6 12h3M7.6 16h3" />
    </>
  ),
  paleta: (
    <>
      <path d="M12 3.5a8.5 8.5 0 0 0 0 17c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6h1.9a4.2 4.2 0 0 0 4.2-4.2c0-4.1-3.8-7.4-8.5-7.4Z" />
      <circle cx="7.8" cy="11.6" r="1" />
      <circle cx="10.4" cy="7.8" r="1" />
      <circle cx="15" cy="8.4" r="1" />
    </>
  ),
  personas: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 20.2a6.2 6.2 0 0 1 12.4 0" />
      <path d="M16.2 5.2a3.2 3.2 0 0 1 0 5.9M17.6 14.6a6.2 6.2 0 0 1 3.6 5.6" />
    </>
  ),
  tarjeta: (
    <>
      <rect x="2.8" y="5.5" width="18.4" height="13" rx="2.4" />
      <path d="M2.8 10h18.4M6.4 14.6h3.4" />
    </>
  ),
  engranaje: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 14.4a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
    </>
  ),
  lupa: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.4-4.4" />
    </>
  ),
  corona: <path d="M4 17.5h16M4.6 6.4l3.2 3.4L12 5l4.2 4.8 3.2-3.4-1.2 9.1H5.8L4.6 6.4Z" />,
  libro: (
    <>
      <path d="M4 5.2A1.2 1.2 0 0 1 5.2 4H10a2.8 2.8 0 0 1 2 .9 2.8 2.8 0 0 1 2-.9h4.8A1.2 1.2 0 0 1 20 5.2v12.4a1.2 1.2 0 0 1-1.2 1.2H14a2 2 0 0 0-2 1.2 2 2 0 0 0-2-1.2H5.2A1.2 1.2 0 0 1 4 17.6Z" />
      <path d="M12 5.9v14" />
    </>
  ),
  auriculares: (
    <>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <path d="M4 14.2a2 2 0 0 1 2-2h.8v5.6H6a2 2 0 0 1-2-2ZM20 14.2a2 2 0 0 0-2-2h-.8v5.6H18a2 2 0 0 0 2-2Z" />
      <path d="M20 17.8v.6a2.6 2.6 0 0 1-2.6 2.6H13" />
    </>
  ),
  bocadillo: <path d="M20.5 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.4-5.1A7.5 7.5 0 1 1 20.5 12Z" />,
  mas: <path d="M12 5.5v13M5.5 12h13" />,
  sol: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.6v2M12 19.4v2M2.6 12h2M19.4 12h2M5.4 5.4l1.4 1.4M17.2 17.2l1.4 1.4M18.6 5.4l-1.4 1.4M6.8 17.2l-1.4 1.4" />
    </>
  ),
  visto: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  puntos: (
    <>
      <circle cx="5.5" cy="12" r="1.3" />
      <circle cx="12" cy="12" r="1.3" />
      <circle cx="18.5" cy="12" r="1.3" />
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
