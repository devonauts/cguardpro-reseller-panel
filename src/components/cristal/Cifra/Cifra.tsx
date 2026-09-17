import { ReactNode } from "react";

import { Superficie } from "../Superficie";
import "./Cifra.scss";

/**
 * Una cifra con su rótulo.
 *
 * EL NÚMERO es el elemento visual principal — no el color, no un icono, no un
 * fondo de acento. La jerarquía la hacen el tamaño y el peso tipográfico, que
 * es lo que sigue funcionando cuando hay cuatro de éstas en fila.
 */
export function Cifra({
  etiqueta, valor, nota, cargando,
}: {
  etiqueta: string;
  valor: ReactNode;
  nota?: ReactNode;
  cargando?: boolean;
}) {
  return (
    <Superficie className="cifra" reactivo>
      <span className="cifra__etiqueta">{etiqueta}</span>
      {cargando ? (
        <span className="cifra__esqueleto" aria-hidden="true" />
      ) : (
        <span className="cifra__valor">{valor}</span>
      )}
      {nota && !cargando && <span className="cifra__nota">{nota}</span>}
    </Superficie>
  );
}

/**
 * La rejilla de cifras.
 *
 * `auto-fit` + `minmax`: pasa de cuatro a dos y a una columna SOLA, según lo
 * que de verdad cabe. Sin un solo corte de pantalla — los cortes fijos aciertan
 * en los anchos que alguien probó y fallan en los demás.
 */
export function Cifras({ children }: { children: ReactNode }) {
  return <div className="cifras">{children}</div>;
}

export default Cifra;
