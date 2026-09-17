import { useCallback, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";

import { Icono } from "@/components/cristal";
import { RESTO_MOVIL } from "@/navegacion/secciones";
import { toqueLeve, useAtras } from "@/plataforma";
import { useT } from "@/i18n/IdiomaProvider";
import "./HojaDeSecciones.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * «MÁS» — LAS SECCIONES QUE NO CABEN EN LA BARRA
 *
 * Sube desde abajo, que es de donde se ha pulsado. Un menú que aparece arriba
 * cuando el dedo está en el borde inferior obliga a cruzar la pantalla entera
 * para elegir.
 *
 * ── EL BOTÓN ATRÁS LA CIERRA ──────────────────────────────────────────────
 * En Android, atrás con una hoja abierta tiene que cerrar la hoja, no salirse
 * de la pantalla que hay detrás — y desde luego no cerrar la aplicación. Se
 * apunta en la pila de `useAtras`, que atiende primero al que está más arriba.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function HojaDeSecciones({
  abierta, onCerrar, onSalir,
}: {
  abierta: boolean;
  onCerrar: () => void;
  onSalir: () => void;
}) {
  const t = useT();
  const panel = useRef<HTMLDivElement>(null);

  /* Atrás cierra la hoja mientras esté abierta. Devuelve `true` porque se
     QUEDA con la pulsación: quien la atiende impide que siga bajando hasta
     «retrocede» o «cierra la aplicación». */
  const atras = useCallback(() => { onCerrar(); return true; }, [onCerrar]);
  useAtras(atras, abierta);

  /* Y Escape también: en una tableta con teclado es el gesto que se espera. */
  useEffect(() => {
    if (!abierta) return;
    const alPulsar = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [abierta, onCerrar]);

  /* El foco entra en la hoja al abrirse. Sin esto, quien navega con lector de
     pantalla sigue en el botón «Más» y no se entera de que se ha abierto nada. */
  useEffect(() => { if (abierta) panel.current?.focus(); }, [abierta]);

  if (!abierta) return null;

  return (
    <>
      <div className="hoja__fondo" aria-hidden="true" onClick={onCerrar} />
      <div
        ref={panel}
        className="hoja"
        role="menu"
        tabIndex={-1}
        aria-label={t("nav.mas")}
      >
        {/* El tirador. No hace nada al pulsarlo: dice «esto se arrastra», que es
            lo que un pulgar intenta antes de buscar un botón de cerrar. */}
        <div className="hoja__tirador" aria-hidden="true" />

        <ul className="hoja__lista">
          {RESTO_MOVIL.map((s) => (
            <li key={s.a}>
              <NavLink
                to={s.a}
                role="menuitem"
                className={({ isActive }) =>
                  `hoja__enlace${isActive ? " hoja__enlace--activo" : ""}`}
                onClick={() => { toqueLeve(); onCerrar(); }}
              >
                <Icono nombre={s.icono} tamano={19} />
                <span>{t(s.texto)}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <button
          type="button"
          role="menuitem"
          className="hoja__salir"
          onClick={() => { onCerrar(); onSalir(); }}
        >
          {t("armazon.cerrarSesion")}
        </button>
      </div>
    </>
  );
}

export default HojaDeSecciones;
