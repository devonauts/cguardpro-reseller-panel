import { ReactNode } from "react";

import "./Pagina.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL ARMAZÓN DE UNA PANTALLA INTERIOR
 *
 * Título, nota, acciones y un cuerpo con RITMO: las secciones se separan solas.
 *
 * ── POR QUÉ EXISTE ────────────────────────────────────────────────────────
 * Cinco pantallas escribían `<section className="pagina">` con
 * `pagina__cabecera` y `pagina__nota` dentro… y esas tres clases NO ESTABAN
 * DEFINIDAS en ninguna hoja del repositorio. Ni un error, ni un aviso: el
 * marcado pedía un estilo que no existía, así que las tarjetas salían pegadas
 * unas a otras y el título encima de la primera, sin un solo píxel de aire.
 *
 * El arreglo no es añadir las tres reglas sueltas —volverían a perderse—, es
 * que el armazón sea una PIEZA. Quien escriba la próxima pantalla la compone y
 * hereda el ritmo; no tiene que acordarse de nada.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function Pagina({
  titulo, nota, acciones, children,
}: {
  titulo: ReactNode;
  nota?: ReactNode;
  acciones?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="pagina">
      <header className="pagina__cabecera">
        <div className="pagina__texto">
          <h1 className="pagina__titulo">{titulo}</h1>
          {nota && <p className="pagina__nota">{nota}</p>}
        </div>
        {acciones && <div className="pagina__acciones">{acciones}</div>}
      </header>

      <div className="pagina__cuerpo">{children}</div>
    </section>
  );
}

export default Pagina;
