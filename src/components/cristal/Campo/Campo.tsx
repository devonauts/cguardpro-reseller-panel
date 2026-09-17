import { InputHTMLAttributes, forwardRef, useId } from "react";

import "./Campo.scss";

/**
 * Un campo de texto, hundido en el cristal.
 *
 * ── ETIQUETA REAL, SIEMPRE ────────────────────────────────────────────────
 * Unida al control por `htmlFor`. No un marcador de posición haciendo de
 * etiqueta: ése desaparece al escribir y deja al lector de pantalla —y a
 * cualquiera que se distraiga— sin saber qué campo está rellenando.
 *
 * El `id` sale de `useId` y NO de la etiqueta. Salía de ella, y como la
 * etiqueta ahora se traduce, cambiar de idioma cambiaba el `id` del control.
 */
interface Props extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string;
  error?: string | null;
  ayuda?: string;
}

export const Campo = forwardRef<HTMLInputElement, Props>(function Campo(
  { etiqueta, error, ayuda, id, className = "", ...resto }, ref,
) {
  const propio = useId();
  const idCampo = id || propio;
  const idAyuda = ayuda ? `${idCampo}-ayuda` : undefined;
  const idError = error ? `${idCampo}-error` : undefined;

  return (
    <div className={`campo ${className}`.trim()}>
      <label className="campo__etiqueta" htmlFor={idCampo}>{etiqueta}</label>
      <input
        ref={ref}
        id={idCampo}
        className={`campo__control${error ? " campo__control--error" : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={[idAyuda, idError].filter(Boolean).join(" ") || undefined}
        {...resto}
      />
      {ayuda && <span id={idAyuda} className="campo__ayuda">{ayuda}</span>}
      {/* `role="alert"`: el error se ANUNCIA al aparecer, no sólo se ve. */}
      {error && <span id={idError} role="alert" className="campo__error">{error}</span>}
    </div>
  );
});

export default Campo;
