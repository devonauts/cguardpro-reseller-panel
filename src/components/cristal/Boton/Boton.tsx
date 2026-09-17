import { ButtonHTMLAttributes } from "react";

import "./Boton.scss";

/**
 * El botón del panel.
 *
 * ── LA PRIMARIA ES CLARA, NO DE COLOR ─────────────────────────────────────
 * Sobre negro mate, lo que más resalta no es un color saturado: es la LUZ. Una
 * superficie casi blanca sobre un entorno negro da el contraste más fuerte que
 * existe en esta paleta, y de paso deja el acento libre para significar algo.
 * Cuando el acento viste todos los botones importantes, deja de señalar cuál lo
 * es — que es exactamente cómo un panel acaba «siendo azul».
 */

type Variante = "primario" | "suave" | "fantasma" | "peligro";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  cargando?: boolean;
  bloque?: boolean;
}

export function Boton({
  variante = "primario", cargando, bloque, children, disabled, className = "", ...resto
}: Props) {
  return (
    <button
      /* `type="button"` por defecto: el defecto de HTML es `submit`, y un botón
         suelto dentro de un formulario acaba enviándolo sin que nadie lo pida. */
      type="button"
      className={[
        "btn", `btn--${variante}`, bloque ? "btn--bloque" : "", className,
      ].filter(Boolean).join(" ")}
      disabled={disabled || cargando}
      /* Se ANUNCIA el estado ocupado, no sólo se pinta el giro. */
      aria-busy={cargando || undefined}
      {...resto}
    >
      {cargando && <span className="btn__giro" aria-hidden="true" />}
      {children}
    </button>
  );
}

export default Boton;
