import { IDIOMAS } from "./idioma";
import { useIdioma } from "./IdiomaProvider";
import "./SelectorDeIdioma.css";

/**
 * El control de idioma.
 *
 * Va en la pantalla de entrada Y dentro del panel: quien todavía no ha entrado
 * también tiene que poder leerla, y quien ya entró no debería salirse para
 * cambiarla. Cambiar de idioma no cierra la sesión.
 *
 * Son dos botones y no un desplegable: con dos opciones, un `select` esconde la
 * que no está puesta y añade un clic para ver que existe.
 */
export function SelectorDeIdioma({ compacto }: { compacto?: boolean }) {
  const { idioma, elegir, t } = useIdioma();

  return (
    <div
      className={`idiomas${compacto ? " idiomas--compacto" : ""}`}
      role="group"
      aria-label={t("idioma.etiqueta")}
    >
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
          {t(i === "en" ? "idioma.en" : "idioma.es")}
        </button>
      ))}
    </div>
  );
}

export default SelectorDeIdioma;
