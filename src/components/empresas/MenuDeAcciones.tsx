import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Icono, type NombreDeIcono } from "@/components/cristal";
import "./MenuDeAcciones.scss";

/**
 * Los tres puntos de una fila: el camino de ratón y teclado a las acciones
 * que en el teléfono salen deslizando.
 *
 * Va en un PORTAL con posición fija: la lista recorta lo que se sale
 * (`overflow: hidden` para las esquinas redondeadas), y un menú anclado dentro
 * de la última fila saldría cortado.
 */
export interface OpcionDeMenu {
  clave: string;
  etiqueta: string;
  icono: NombreDeIcono;
  peligro?: boolean;
  onElegir: () => void;
}

export function MenuDeAcciones({ opciones, etiqueta }: { opciones: OpcionDeMenu[]; etiqueta: string }) {
  const boton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!abierto || !boton.current) return;
    const r = boton.current.getBoundingClientRect();
    const ancho = 220;
    const alto = menu.current?.offsetHeight || opciones.length * 44 + 12;
    const abajo = r.bottom + 6 + alto < window.innerHeight;
    setPos({
      top: abajo ? r.bottom + 6 : Math.max(8, r.top - alto - 6),
      left: Math.min(window.innerWidth - ancho - 8, Math.max(8, r.right - ancho)),
    });
  }, [abierto, opciones.length]);

  useEffect(() => {
    if (!abierto) return undefined;
    const cerrar = () => setAbierto(false);
    const fuera = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !boton.current?.contains(t)) cerrar();
    };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") { cerrar(); boton.current?.focus(); } };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    window.addEventListener("scroll", cerrar, true);
    window.addEventListener("resize", cerrar);
    menu.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
      window.removeEventListener("scroll", cerrar, true);
      window.removeEventListener("resize", cerrar);
    };
  }, [abierto]);

  return (
    <>
      <button
        ref={boton}
        type="button"
        className="menu-acciones__disparador"
        aria-label={etiqueta}
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={(e) => { e.stopPropagation(); setAbierto((v) => !v); }}
      >
        <Icono nombre="puntos" tamano={20} />
      </button>
      {abierto && createPortal(
        <div
          ref={menu}
          role="menu"
          aria-label={etiqueta}
          className="menu-acciones"
          style={pos ? { top: pos.top, left: pos.left } : { visibility: "hidden" }}
        >
          {opciones.map((o) => (
            <button
              key={o.clave}
              type="button"
              role="menuitem"
              className={`menu-acciones__opcion${o.peligro ? " menu-acciones__opcion--peligro" : ""}`}
              onClick={() => { setAbierto(false); o.onElegir(); }}
            >
              <Icono nombre={o.icono} tamano={18} />
              {o.etiqueta}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

export default MenuDeAcciones;
