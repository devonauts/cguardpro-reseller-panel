import { useRef, useState } from "react";

import { Icono } from "@/components/cristal";
import { IDIOMAS, type Idioma } from "./idioma";
import { useIdioma } from "./IdiomaProvider";
import "./SelectorDeIdioma.scss";

/**
 * El control de idioma, en dos formas.
 *
 *   `menu`       · globo + idioma + galón, y un desplegable de cristal.
 *                  Para la pantalla de entrada, donde es un objeto por derecho
 *                  propio y hay sitio de sobra.
 *   `segmentado` · dos botones en una píldora. Para DENTRO del menú de la
 *                  cuenta: un desplegable dentro de otro desplegable obliga a
 *                  cerrar uno para usar el otro.
 *
 * Es la misma decisión en los dos casos —y el mismo estado—, así que es un
 * componente con dos variantes y no dos componentes que se parecen.
 *
 * Cambiar de idioma NO cierra la sesión: es un `setState`, no una recarga.
 */

const NOMBRE: Record<Idioma, "idioma.en" | "idioma.es"> = {
  en: "idioma.en",
  es: "idioma.es",
};

export function SelectorDeIdioma({
  variante = "menu", compacto,
}: {
  variante?: "menu" | "segmentado";
  /** Mantiene el nombre antiguo: `compacto` era el segmentado pequeño. */
  compacto?: boolean;
}) {
  const { idioma, elegir, t } = useIdioma();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  if (variante === "segmentado" || compacto) {
    return (
      <div className="idiomas" role="group" aria-label={t("idioma.etiqueta")}>
        {IDIOMAS.map((i) => (
          <button
            key={i}
            type="button"
            className={`idiomas__opcion${i === idioma ? " idiomas__opcion--puesta" : ""}`}
            /* `aria-pressed` y no `aria-current`: es un interruptor de dos
               estados, no un sitio de la navegación. */
            aria-pressed={i === idioma}
            onClick={() => elegir(i)}
          >
            {t(NOMBRE[i])}
          </button>
        ))}
      </div>
    );
  }

  const cerrar = () => setAbierto(false);

  return (
    <div
      className="idioma-menu"
      ref={caja}
      /* Se cierra al salir con el tabulador: sin esto, el foco se va al
         formulario y el desplegable se queda abierto flotando. */
      onBlur={(e) => {
        if (!caja.current?.contains(e.relatedTarget as Node)) cerrar();
      }}
    >
      <button
        type="button"
        className="idioma-menu__boton"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-label={t("idioma.etiqueta")}
        onClick={() => setAbierto((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Escape") cerrar(); }}
      >
        <Icono nombre="globo" tamano={16} />
        <span className="idioma-menu__actual">{t(NOMBRE[idioma])}</span>
        <span className={`idioma-menu__galon${abierto ? " idioma-menu__galon--abierto" : ""}`}>
          <Icono nombre="galon" tamano={16} />
        </span>
      </button>

      {abierto && (
        <ul className="idioma-menu__lista" role="listbox" aria-label={t("idioma.etiqueta")}>
          {IDIOMAS.map((i) => (
            <li key={i}>
              <button
                type="button"
                role="option"
                aria-selected={i === idioma}
                className={`idioma-menu__opcion${i === idioma ? " idioma-menu__opcion--puesta" : ""}`}
                onClick={() => { elegir(i); cerrar(); }}
                onKeyDown={(e) => { if (e.key === "Escape") cerrar(); }}
              >
                {t(NOMBRE[i])}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SelectorDeIdioma;
