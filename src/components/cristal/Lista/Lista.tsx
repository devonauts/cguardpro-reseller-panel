import { ElementType, ReactNode } from "react";

import { Superficie } from "../Superficie";
import "./Lista.scss";

/**
 * UNA superficie para la lista entera, y filas transparentes dentro.
 *
 * ── POR QUÉ NO UNA TARJETA POR FILA ───────────────────────────────────────
 * Porque con veinte filas son veinte bordes, veinte sombras y veinte capas de
 * `backdrop-filter` apiladas: ruido a la vista y coste de GPU a cambio de nada.
 * Una lista es UN objeto; lo que separa las filas es una línea de un píxel.
 *
 * ── Y EN UN TELÉFONO NO SE ENCOGE: SE REORDENA ────────────────────────────
 * Una rejilla de cuatro columnas estrujada en 375 px no enseña ninguna. Las
 * filas pasan a una sola columna y cada campo se lee entero. Esa decisión vive
 * en el SCSS de cada consumidor, porque depende de QUÉ columnas son y no de
 * cuántas.
 */
export function Lista({
  como: Etiqueta = "div", className = "", children, ...resto
}: {
  como?: ElementType;
  className?: string;
  children: ReactNode;
  [otra: string]: unknown;
}) {
  return (
    <Superficie como={Etiqueta} className={`lista ${className}`.trim()} {...resto}>
      {children}
    </Superficie>
  );
}

export function ListaFila({
  como: Etiqueta = "div", className = "", children, ...resto
}: {
  como?: ElementType;
  className?: string;
  children: ReactNode;
  [otra: string]: unknown;
}) {
  return (
    <Etiqueta className={`lista__fila ${className}`.trim()} {...resto}>
      {children}
    </Etiqueta>
  );
}

export default Lista;
