import { ElementType, ReactNode } from "react";

import "./Superficie.scss";

/**
 * LA PRIMITIVA. Todo el cristal del panel sale de aquí.
 *
 * ── LA API ES SEMÁNTICA, Y ESO ES LA MITAD DEL DISEÑO ─────────────────────
 * Se elige `material="elevado"`, no `blur={34}`. Un número por propiedad
 * devuelve la decisión a cada pantalla, y entonces el sistema deja de existir:
 * doce pantallas eligen doce desenfoques parecidos y el producto pasa a
 * parecer doce materiales. Aquí sólo hay tres materiales y quien compone elige
 * cuál, no cómo se hace.
 */

export type Material = "sutil" | "estandar" | "elevado";

interface Props {
  material?: Material;
  /** Reacciona al puntero: sube la luz, nunca el color. */
  reactivo?: boolean;
  /** La etiqueta real. Una lista es `ul`, una sección es `section`. */
  como?: ElementType;
  className?: string;
  children?: ReactNode;
  [otra: string]: unknown;
}

export function Superficie({
  material = "estandar", reactivo, como: Etiqueta = "div", className = "", children, ...resto
}: Props) {
  return (
    <Etiqueta
      className={[
        "cristal",
        `cristal--${material}`,
        reactivo ? "cristal--reactivo" : "",
        className,
      ].filter(Boolean).join(" ")}
      {...resto}
    >
      {children}
    </Etiqueta>
  );
}

export default Superficie;
