import { InputHTMLAttributes, forwardRef, useId, useState } from "react";

import { Icono, type NombreDeIcono } from "../Icono";
import { useT } from "@/i18n/IdiomaProvider";
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
 *
 * ── EL OJO DE LA CONTRASEÑA ───────────────────────────────────────────────
 * `revelable` añade el botón de ver/ocultar. Existe porque teclear a ciegas una
 * contraseña larga en un teléfono es la causa número uno de «no me deja
 * entrar», y porque el navegador ya no la autocompleta si el campo cambia de
 * `type` por su cuenta — aquí el cambio lo pide la persona.
 */
interface Props extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string;
  error?: string | null;
  ayuda?: string;
  icono?: NombreDeIcono;
  revelable?: boolean;
}

export const Campo = forwardRef<HTMLInputElement, Props>(function Campo(
  { etiqueta, error, ayuda, icono, revelable, id, className = "", type = "text", ...resto }, ref,
) {
  const t = useT();
  const propio = useId();
  const [visible, setVisible] = useState(false);
  const idCampo = id || propio;
  const idAyuda = ayuda ? `${idCampo}-ayuda` : undefined;
  const idError = error ? `${idCampo}-error` : undefined;

  return (
    <div className={`campo ${className}`.trim()}>
      <label className="campo__etiqueta" htmlFor={idCampo}>{etiqueta}</label>

      <div
        className={[
          "campo__caja",
          icono ? "campo__caja--con-icono" : "",
          revelable ? "campo__caja--con-boton" : "",
          error ? "campo__caja--error" : "",
        ].filter(Boolean).join(" ")}
      >
        {icono && <span className="campo__icono"><Icono nombre={icono} tamano={18} /></span>}

        <input
          ref={ref}
          id={idCampo}
          className="campo__control"
          type={revelable && visible ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={[idAyuda, idError].filter(Boolean).join(" ") || undefined}
          {...resto}
        />

        {revelable && (
          <button
            type="button"
            className="campo__ojo"
            onClick={() => setVisible((v) => !v)}
            aria-label={t(visible ? "login.ocultarContrasena" : "login.mostrarContrasena")}
            aria-pressed={visible}
          >
            <Icono nombre={visible ? "ojo-tachado" : "ojo"} tamano={18} />
          </button>
        )}
      </div>

      {ayuda && <span id={idAyuda} className="campo__ayuda">{ayuda}</span>}
      {/* `role="alert"`: el error se ANUNCIA al aparecer, no sólo se ve. */}
      {error && <span id={idError} role="alert" className="campo__error">{error}</span>}
    </div>
  );
});

export default Campo;
