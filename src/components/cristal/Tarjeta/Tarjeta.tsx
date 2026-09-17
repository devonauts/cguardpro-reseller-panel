import { ReactNode } from "react";

import { Superficie, type Material } from "../Superficie";
import "./Tarjeta.scss";

/**
 * Una tarjeta: superficie con su respiro interior y, si hace falta, cabecera.
 *
 * No redefine el material — lo pide. Esa es toda la diferencia entre un sistema
 * de diseño y doce hojas que se parecen.
 */
export function Tarjeta({
  elevacion = "estandar", reactivo, className = "", children,
}: {
  elevacion?: Material;
  reactivo?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Superficie
      como="section"
      material={elevacion}
      reactivo={reactivo}
      className={`tarjeta ${className}`.trim()}
    >
      {children}
    </Superficie>
  );
}

export function TarjetaCabecera({ titulo, nota }: { titulo: string; nota?: ReactNode }) {
  return (
    <header className="tarjeta__cabecera">
      <h2 className="tarjeta__titulo">{titulo}</h2>
      {nota && <p className="tarjeta__nota">{nota}</p>}
    </header>
  );
}

/** Un dato con su rótulo. El rótulo es pequeño y espaciado; el valor manda. */
export function Dato({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div className="dato">
      <dt className="dato__etiqueta">{etiqueta}</dt>
      <dd className="dato__valor">{valor ?? "—"}</dd>
    </div>
  );
}

export default Tarjeta;
