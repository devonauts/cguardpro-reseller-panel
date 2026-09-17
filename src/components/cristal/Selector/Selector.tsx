import { SelectHTMLAttributes, forwardRef, useId } from "react";

import "./Selector.scss";

/**
 * Un desplegable con el mismo material que el resto.
 *
 * La LISTA que se abre la dibuja el sistema operativo y no se puede vestir. Lo
 * que sí se puede es decirle al navegador que estamos en oscuro —eso lo hace
 * `color-scheme` en la hoja global—, y sin ello esa lista se abre BLANCA: el
 * único rectángulo claro de la pantalla, justo encima del cristal.
 */
interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  etiqueta?: string;
  /** Sólo para lectores de pantalla: la fila ya dice de quién es el control. */
  etiquetaOculta?: string;
  compacto?: boolean;
}

export const Selector = forwardRef<HTMLSelectElement, Props>(function Selector(
  { etiqueta, etiquetaOculta, compacto, id, className = "", children, ...resto }, ref,
) {
  const propio = useId();
  const idCampo = id || propio;

  return (
    <div className={`selector ${className}`.trim()}>
      {etiqueta && (
        <label className="selector__etiqueta" htmlFor={idCampo}>{etiqueta}</label>
      )}
      {etiquetaOculta && (
        <label className="sr-only" htmlFor={idCampo}>{etiquetaOculta}</label>
      )}
      <select
        ref={ref}
        id={idCampo}
        className={`selector__control${compacto ? " selector__control--compacto" : ""}`}
        {...resto}
      >
        {children}
      </select>
    </div>
  );
});

export default Selector;
