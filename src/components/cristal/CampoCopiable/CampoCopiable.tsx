import { useRef, useState } from "react";

import { useT } from "@/i18n/IdiomaProvider";
import "./CampoCopiable.scss";

/**
 * Un valor técnico que se copia entero.
 *
 * ── LO QUE SE COPIA ES EL ORIGINAL, SIEMPRE ───────────────────────────────
 * El texto se PARTE en pantalla para que quepa, pero lo que va al portapapeles
 * es la cadena completa tal cual llegó: nunca lo que se ve, nunca recortado.
 * Un valor de DNS copiado a medias no falla en el momento — falla media hora
 * después, cuando la verificación no pasa y nadie sabe por qué.
 *
 * Y por eso tampoco se trunca con puntos suspensivos: un valor recortado a la
 * vista invita a seleccionarlo con el ratón y copiar sólo el trozo visible.
 */
export function CampoCopiable({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const t = useT();
  const [copiado, setCopiado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout>>();

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => setCopiado(false), 1600);
    } catch {
      /* Sin permiso de portapapeles el valor sigue ENTERO a la vista para
         copiarlo a mano: no se bloquea nada por esto. */
    }
  };

  return (
    <div className="copiable">
      <div className="copiable__cabecera">
        <span className="copiable__etiqueta">{etiqueta}</span>
        <button
          type="button"
          className={`copiable__boton${copiado ? " copiable__boton--hecho" : ""}`}
          onClick={copiar}
          aria-label={t("dominios.copiarCampo", { campo: etiqueta })}
        >
          {t(copiado ? "comun.copiado" : "comun.copiar")}
        </button>
      </div>
      <code className="copiable__valor">{valor}</code>
      {/* El resultado se ANUNCIA: quien no ve la pantalla también necesita
          saber que el valor ya está copiado. */}
      <span className="sr-only" role="status" aria-live="polite">
        {copiado ? t("comun.copiado") : ""}
      </span>
    </div>
  );
}

export default CampoCopiable;
