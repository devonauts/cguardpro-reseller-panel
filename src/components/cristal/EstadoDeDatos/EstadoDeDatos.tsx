import { ReactNode } from "react";

import { useT } from "@/i18n/IdiomaProvider";
import { Boton } from "../Boton";
import "./EstadoDeDatos.scss";

/**
 * Cargando / error / vacío, en un solo sitio.
 *
 * La carga se anuncia con `role="status"` y `aria-live="polite"`: quien no ve
 * la pantalla se entera de que está esperando en vez de encontrarse un
 * silencio. El error va con `role="alert"`, que interrumpe — porque un error
 * sí debe interrumpir.
 */
export function EstadoDeDatos({
  cargando, error, vacio, etiquetaVacio, onReintentar, children,
}: {
  cargando?: boolean;
  error?: string | null;
  vacio?: boolean;
  etiquetaVacio?: string;
  onReintentar?: () => void;
  children: ReactNode;
}) {
  const t = useT();

  if (cargando) {
    return (
      <div className="hueco" role="status" aria-live="polite">
        <span className="hueco__giro" aria-hidden="true" />
        <p className="hueco__texto">{t("comun.cargando")}</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="hueco" role="alert">
        <p className="hueco__texto hueco__texto--error">{error}</p>
        {onReintentar && (
          <Boton variante="suave" onClick={onReintentar}>{t("comun.reintentar")}</Boton>
        )}
      </div>
    );
  }
  if (vacio) {
    return (
      <div className="hueco">
        <p className="hueco__texto">{etiquetaVacio ?? t("comun.vacio")}</p>
      </div>
    );
  }
  return <>{children}</>;
}

/**
 * UN HUECO DECLARADO.
 *
 * Existe para lo que todavía no tiene motor detrás. Enseñar un «$0» o un «—»
 * en su lugar sería peor: un cero se lee como una medición, y aquí la medición
 * es dinero que alguien va a reclamar.
 */
export function TodaviaNo({ children }: { children: ReactNode }) {
  return (
    <div className="todavia-no">
      <p>{children}</p>
    </div>
  );
}

export default EstadoDeDatos;
