import { ReactNode, useEffect, useRef } from "react";

import { Superficie } from "../Superficie";
import "./Emergente.scss";

/**
 * Lo que flota sobre el contenido: menús de cuenta, desplegables.
 *
 * Material ELEVADO, que es el más opaco de los tres. Debajo hay texto, y un
 * menú a través del cual se lee lo de atrás no se puede leer él. Aquí la
 * legibilidad gana a la transparencia.
 *
 * Cierra con Escape y al pulsar fuera: quien lo abrió con el teclado tiene que
 * poder salir con el teclado.
 */
export function Emergente({
  abierto, onCerrar, etiqueta, children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  etiqueta?: string;
  children: ReactNode;
}) {
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const alPulsarTecla = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    const alPulsarFuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) onCerrar();
    };
    document.addEventListener("keydown", alPulsarTecla);
    document.addEventListener("mousedown", alPulsarFuera);
    return () => {
      document.removeEventListener("keydown", alPulsarTecla);
      document.removeEventListener("mousedown", alPulsarFuera);
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  /* El `ref` va en un envoltorio y no en `Superficie`: la primitiva no reenvía
     referencias a propósito —su API es el material, no el nodo— y colarle una
     `ref` sólo produciría un aviso de React y una referencia vacía. */
  return (
    <div ref={caja} className="emergente-ancla">
      <Superficie material="elevado" className="emergente" role="menu" aria-label={etiqueta}>
        {children}
      </Superficie>
    </div>
  );
}

export default Emergente;
