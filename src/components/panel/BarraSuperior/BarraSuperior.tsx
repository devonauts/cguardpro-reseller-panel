import { ReactNode, useState } from "react";

import { Boton, Emergente, Icono } from "@/components/cristal";
import { Avatar } from "../Avatar";
import { Avisos } from "../Avisos";
import { Buscador } from "../Buscador";
import SelectorDeIdioma from "@/i18n/SelectorDeIdioma";
import { useT } from "@/i18n/IdiomaProvider";
import "./BarraSuperior.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * LA BARRA SUPERIOR
 *
 * Controles sueltos de cristal flotando sobre el contenido, no una franja
 * opaca: el botón de menú, el idioma y la ficha de la persona son OBJETOS
 * separados, cada uno con su canto.
 *
 * ── EL BUSCADOR Y LA CAMPANA HACEN ALGO REAL ──────────────────────────────
 * No hay endpoint de búsqueda de texto libre, así que el buscador busca sobre
 * lo que sí existe: las secciones del panel y las empresas del socio. Y no hay
 * sistema de notificaciones, así que la campana enseña el REGISTRO DE
 * ACTIVIDAD, que es justo lo que alguien espera encontrar al pulsarla.
 *
 * Ninguno de los dos finge. Un campo que promete buscar «todo» y devuelve
 * vacío se prueba una vez y no se usa nunca más.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function BarraSuperior({
  menuAbierto, onAlternarMenu, persona, rol, correo, onSalir, estado,
}: {
  menuAbierto: boolean;
  onAlternarMenu: () => void;
  persona: string;
  rol?: string | null;
  correo?: string | null;
  onSalir: () => void;
  estado?: ReactNode;
}) {
  const t = useT();
  const [cuentaAbierta, setCuentaAbierta] = useState(false);

  return (
    <header className="barra">
      <button
        type="button"
        className="barra__menu"
        aria-expanded={menuAbierto}
        aria-controls="nav-lateral"
        aria-label={menuAbierto ? t("armazon.cerrarMenu") : t("armazon.abrirMenu")}
        onClick={onAlternarMenu}
      >
        <span aria-hidden="true">☰</span>
      </button>

      <Buscador />

      {estado && <div className="barra__estado">{estado}</div>}

      <div className="barra__controles">
        <SelectorDeIdioma />
        <Avisos />

        <div className="barra__cuenta">
          <button
            type="button"
            className="barra__ficha"
            aria-expanded={cuentaAbierta}
            aria-haspopup="menu"
            onClick={() => setCuentaAbierta((v) => !v)}
          >
            <Avatar nombre={persona} tamano={34} />
            <span className="barra__ficha-texto">
              <span className="barra__ficha-nombre">{persona}</span>
              {rol && <span className="barra__ficha-rol">{rol}</span>}
            </span>
            <span className="barra__ficha-galon"><Icono nombre="galon" tamano={16} /></span>
          </button>

          <Emergente
            abierto={cuentaAbierta}
            onCerrar={() => setCuentaAbierta(false)}
            etiqueta={t("armazon.miCuenta")}
          >
            {correo && <div className="barra__correo">{correo}</div>}
            <Boton variante="fantasma" bloque role="menuitem" onClick={onSalir}>
              {t("armazon.cerrarSesion")}
            </Boton>
          </Emergente>
        </div>
      </div>
    </header>
  );
}

export default BarraSuperior;
