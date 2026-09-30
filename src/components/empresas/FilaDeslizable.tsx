import { ReactNode, useEffect, useRef, useState } from "react";

import { Icono, type NombreDeIcono } from "@/components/cristal";
import "./FilaDeslizable.scss";

/**
 * Una fila que se desliza como las de iPhone.
 *
 * ── CÓMO SE COMPORTA ──────────────────────────────────────────────────────
 * Arrastrar a la izquierda descubre los botones del final (Archivar,
 * Eliminar). Soltar a medio camino los deja abiertos; soltar pasada la mitad
 * de la fila ejecuta la acción PRINCIPAL (la primera: archivar), igual que el
 * deslizamiento completo de Mail.
 *
 * ── POR QUÉ FUNCIONA EN TODOS LOS NAVEGADORES ─────────────────────────────
 * Pointer Events (Chrome, Safari ≥13, Firefox, Edge) en vez de touch/mouse por
 * separado, y `touch-action: pan-y` en el frente: el navegador sigue haciendo
 * el desplazamiento vertical él solo y nos cede el horizontal. Sin eso, en iOS
 * la página se movería a la vez que la fila.
 *
 * ── SÓLO CON EL DEDO ──────────────────────────────────────────────────────
 * Con ratón NO se arrastra: en un escritorio nadie espera arrastrar una fila y
 * un clic un pelín movido abriría las acciones por error. Ahí están los tres
 * puntos (`MenuDeAcciones`), que además son lo accesible por teclado. El
 * deslizamiento es un atajo, nunca el único camino.
 */
export interface AccionDeFila {
  clave: string;
  etiqueta: string;
  icono: NombreDeIcono;
  tono: "neutro" | "peligro" | "aviso";
  onAccion: () => void;
}

const ANCHO_BOTON = 84;

export function FilaDeslizable({
  acciones, children, activo = true,
}: {
  /** La PRIMERA es la del deslizamiento completo. */
  acciones: AccionDeFila[];
  children: ReactNode;
  activo?: boolean;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const [dx, setDx] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const inicio = useRef<{ x: number; y: number; base: number; id: number } | null>(null);
  const decidido = useRef<"h" | "v" | null>(null);
  const seMovio = useRef(false);

  const anchoAcciones = acciones.length * ANCHO_BOTON;
  const abierta = dx < 0 && !arrastrando;

  // Tocar fuera cierra la fila abierta, como en iOS.
  useEffect(() => {
    if (!abierta) return undefined;
    const fuera = (e: PointerEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setDx(0);
    };
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, [abierta]);

  const alBajar = (e: React.PointerEvent) => {
    if (!activo || e.pointerType === "mouse" || !acciones.length) return;
    inicio.current = { x: e.clientX, y: e.clientY, base: dx, id: e.pointerId };
    decidido.current = null;
    seMovio.current = false;
  };

  const alMover = (e: React.PointerEvent) => {
    const i = inicio.current;
    if (!i || e.pointerId !== i.id) return;
    const mx = e.clientX - i.x;
    const my = e.clientY - i.y;
    if (!decidido.current) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      decidido.current = Math.abs(mx) > Math.abs(my) ? "h" : "v";
      if (decidido.current === "h") {
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        setArrastrando(true);
      }
    }
    if (decidido.current !== "h") return;
    seMovio.current = true;
    const ancho = caja.current?.offsetWidth || 320;
    // Hacia la derecha no hay nada: se resiste un poco y vuelve.
    const bruto = i.base + mx;
    setDx(bruto > 0 ? Math.min(24, bruto / 4) : Math.max(-ancho, bruto));
  };

  const alSoltar = (e: React.PointerEvent) => {
    const i = inicio.current;
    if (!i || e.pointerId !== i.id) return;
    inicio.current = null;
    setArrastrando(false);
    if (decidido.current !== "h") return;
    const ancho = caja.current?.offsetWidth || 320;
    if (-dx > ancho * 0.55) {
      // Deslizamiento completo: se va del todo y ejecuta la principal.
      setDx(-ancho);
      window.setTimeout(() => { acciones[0]?.onAccion(); setDx(0); }, 180);
    } else if (-dx > anchoAcciones / 2) {
      setDx(-anchoAcciones);
    } else {
      setDx(0);
    }
  };

  // Un arrastre no es un clic: sin esto, soltar abriría el acordeón de debajo.
  const alClicCaptura = (e: React.MouseEvent) => {
    if (seMovio.current || abierta) {
      e.preventDefault();
      e.stopPropagation();
      seMovio.current = false;
      if (abierta) setDx(0);
    }
  };

  const ancho = caja.current?.offsetWidth || 0;
  const completo = ancho > 0 && -dx > ancho * 0.55;

  return (
    <div ref={caja} className={`deslizable${arrastrando ? " deslizable--arrastrando" : ""}`}>
      <div
        className={`deslizable__acciones${completo ? " deslizable__acciones--completo" : ""}`}
        style={{ width: Math.max(anchoAcciones, -dx) }}
        aria-hidden={!abierta}
      >
        {acciones.map((a, n) => (
          <button
            key={a.clave}
            type="button"
            tabIndex={abierta ? 0 : -1}
            className={`deslizable__boton deslizable__boton--${a.tono}`}
            style={completo && n === 0 ? { flexGrow: 1 } : completo ? { width: 0, padding: 0, overflow: "hidden" } : undefined}
            onClick={() => { setDx(0); a.onAccion(); }}
          >
            <Icono nombre={a.icono} tamano={20} />
            <span>{a.etiqueta}</span>
          </button>
        ))}
      </div>
      <div
        className="deslizable__frente"
        style={{ transform: dx ? `translate3d(${dx}px,0,0)` : undefined }}
        onPointerDown={alBajar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onClickCapture={alClicCaptura}
      >
        {children}
      </div>
    </div>
  );
}

export default FilaDeslizable;
