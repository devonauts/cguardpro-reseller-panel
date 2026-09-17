import { ReactNode } from "react";

import { Superficie } from "../Superficie";
import "./Panel.scss";

/**
 * El contenedor grande: una sección entera de una página.
 *
 * Es de material SUTIL a propósito. Dentro va a haber tarjetas, y si el
 * contenedor pesara lo mismo que su contenido la jerarquía se invertiría — lo
 * que envuelve pasaría a competir con lo que importa.
 */
export function Panel({
  titulo, nota, acciones, className = "", children,
}: {
  titulo?: ReactNode;
  nota?: ReactNode;
  acciones?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Superficie como="section" material="sutil" className={`panel ${className}`.trim()}>
      {(titulo || acciones) && (
        <header className="panel__cabecera">
          <div className="panel__texto">
            {titulo && <h2 className="panel__titulo">{titulo}</h2>}
            {nota && <p className="panel__nota">{nota}</p>}
          </div>
          {acciones && <div className="panel__acciones">{acciones}</div>}
        </header>
      )}
      {children}
    </Superficie>
  );
}

export default Panel;
