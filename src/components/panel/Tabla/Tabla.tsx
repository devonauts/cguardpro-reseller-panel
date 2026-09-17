import { ReactNode } from "react";

import "./Tabla.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * UNA TABLA DE VERDAD, QUE EN EL TELÉFONO SE CONVIERTE EN FICHAS
 *
 * Es `<table>` real —`thead`, `th` con `scope`— y no una rejilla de `div`:
 * quien navega con lector de pantalla necesita que las celdas digan a qué
 * columna pertenecen, y eso sólo lo da el marcado.
 *
 * ── Y EN ESTRECHO NO SE ENCOGE ────────────────────────────────────────────
 * Cuatro columnas estrujadas en 375 px no enseñan ninguna. Por debajo del
 * corte, cada fila pasa a ser una ficha apilada y cada celda lleva delante su
 * rótulo de columna, que se saca de `data-etiqueta` con `::before`. La cabecera
 * se esconde de la VISTA pero sigue en el árbol de accesibilidad.
 *
 * Se usa `content: attr(...)` y no un segundo marcado para el móvil: dos
 * marcados es cómo se llega a que uno diga «Alta» y el otro «Creado».
 * ════════════════════════════════════════════════════════════════════════════
 */
export function Tabla({
  columnas, children, etiqueta,
}: {
  columnas: string[];
  children: ReactNode;
  etiqueta?: string;
}) {
  return (
    <div className="tabla__marco">
      <table className="tabla" aria-label={etiqueta}>
        <thead>
          <tr>
            {columnas.map((c) => <th key={c} scope="col">{c}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function TablaFila({ children }: { children: ReactNode }) {
  return <tr className="tabla__fila">{children}</tr>;
}

export function TablaCelda({
  etiqueta, children, principal,
}: {
  /** El rótulo de su columna: es lo que se pinta delante en el teléfono. */
  etiqueta: string;
  children: ReactNode;
  principal?: boolean;
}) {
  return (
    <td className={`tabla__celda${principal ? " tabla__celda--principal" : ""}`} data-etiqueta={etiqueta}>
      {children}
    </td>
  );
}

export default Tabla;
