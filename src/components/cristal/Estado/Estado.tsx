import { ReactNode } from "react";

import "./Estado.scss";

/**
 * El indicador de estado.
 *
 * ── NO SE FÍA SÓLO DEL COLOR ──────────────────────────────────────────────
 * Lleva punto, rótulo y, cuando hace falta, una explicación debajo. Un estado
 * que sólo se distingue por el color obliga a aprenderse la convención, y no
 * funciona para quien no separa bien el verde del rojo. La FORMA del punto y
 * el texto hacen el trabajo; el color sólo lo refuerza.
 */

export type Tono = "ok" | "aviso" | "peligro" | "neutro";

export function Pildora({ tono = "neutro", children }: { tono?: Tono; children: ReactNode }) {
  return <span className={`pildora pildora--${tono}`}>{children}</span>;
}

/** Estado con rótulo delante y explicación debajo: la versión completa. */
export function Estado({
  etiqueta, tono, texto, explicacion, extra,
}: {
  etiqueta?: string;
  tono: Tono;
  texto: ReactNode;
  explicacion?: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="estado-ind">
      <div className="estado-ind__fila">
        {etiqueta && <span className="estado-ind__etiqueta">{etiqueta}</span>}
        <Pildora tono={tono}>{texto}</Pildora>
        {extra}
      </div>
      {explicacion && <p className="estado-ind__explicacion">{explicacion}</p>}
    </div>
  );
}

export default Estado;
