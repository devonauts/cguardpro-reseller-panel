import { ReactNode, useState } from "react";

import { Boton } from "../Boton";
import { useT } from "@/i18n/IdiomaProvider";
import "./Confirmar.scss";

/**
 * A button that asks before it acts.
 *
 * For what charges money or takes access away: the first click only opens a
 * short sentence saying what is about to happen, plus Confirm and Cancel.
 * Inline rather than a modal, so the question sits next to the row it is about.
 */
export function Confirmar({
  children, pregunta, textoConfirmar, onConfirmar, variante = "suave", disabled, cargando,
}: {
  children: ReactNode;
  pregunta: ReactNode;
  textoConfirmar?: string;
  onConfirmar: () => void | Promise<void>;
  variante?: "primario" | "suave" | "fantasma" | "peligro";
  disabled?: boolean;
  cargando?: boolean;
}) {
  const t = useT();
  const [preguntando, setPreguntando] = useState(false);

  if (!preguntando) {
    return (
      <Boton variante={variante as any} disabled={disabled} cargando={cargando} onClick={() => setPreguntando(true)}>
        {children}
      </Boton>
    );
  }

  return (
    <span className="confirmar" role="group">
      <span className="confirmar__pregunta">{pregunta}</span>
      <Boton
        variante={variante === "fantasma" ? "suave" : (variante as any)}
        cargando={cargando}
        onClick={async () => { await onConfirmar(); setPreguntando(false); }}
      >
        {textoConfirmar || t("comun.confirmar")}
      </Boton>
      <Boton variante="fantasma" onClick={() => setPreguntando(false)}>
        {t("comun.cancelar")}
      </Boton>
    </span>
  );
}
