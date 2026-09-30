import { useEffect, useRef, useState, type ReactNode } from "react";

import { Icono } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import { alSoltar, desplazamiento, ejeDelGesto, type Eje } from "@/lib/deslizar";

/**
 * Deslizar a la IZQUIERDA para quitar, como el centro de notificaciones del
 * iPhone. Es el mismo del CRM (`components/notifications/Deslizable`), con las
 * fichas del panel: con dedo y con ratón, detrás asoma el rojo con «Borrar», y
 * el clic que el navegador dispara al soltar se anula — quitar un aviso no
 * puede abrirlo a la vez.
 *
 * Las dos redes del CRM vienen con él: el «soltar» se escucha en toda la
 * ventana (el trackpad de macOS a veces no se lo da a la fila) y, si la fila
 * sigue ahí medio segundo después, vuelve a su sitio en vez de quedarse fuera.
 */
export function Deslizable({ onQuitar, children }: { onQuitar: () => void; children: ReactNode }) {
  const t = useT();
  const [dx, setDx] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const inicio = useRef<{ x: number; y: number; t: number; ancho: number } | null>(null);
  const eje = useRef<Eje>(null);
  const huboArrastre = useRef(false);
  const ultimoX = useRef(0);
  const relojes = useRef<number[]>([]);

  useEffect(() => () => relojes.current.forEach((id) => window.clearTimeout(id)), []);

  const soltar = (x: number) => {
    const i = inicio.current;
    inicio.current = null;
    setArrastrando(false);
    if (!i) return;
    if (eje.current !== "horizontal") { setDx(0); return; }
    const d = desplazamiento(x - i.x);
    if (alSoltar(d, i.ancho, performance.now() - i.t) === "quitar") {
      setDx(-i.ancho);
      relojes.current.push(
        window.setTimeout(() => { try { onQuitar(); } catch { /* vuelve abajo */ } }, 180),
        window.setTimeout(() => setDx(0), 700),
      );
    } else {
      setDx(0);
    }
  };

  return (
    <div className="deslizar">
      <div className="deslizar__fondo" aria-hidden="true" style={{ opacity: dx < 0 ? 1 : 0 }}>
        <Icono nombre="papelera" tamano={16} />
        {t("notificaciones.borrar")}
      </div>
      <div
        className={`deslizar__frente${arrastrando ? " deslizar__frente--arrastrando" : ""}`}
        style={{ transform: dx ? `translate3d(${dx}px,0,0)` : undefined }}
        onClickCapture={(e) => {
          if (huboArrastre.current) {
            e.preventDefault();
            e.stopPropagation();
            huboArrastre.current = false;
          }
        }}
        onLostPointerCapture={() => { if (inicio.current) soltar(ultimoX.current); }}
        onPointerCancel={() => { inicio.current = null; setArrastrando(false); setDx(0); }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          ultimoX.current = e.clientX;
          const enVentana = (ev: PointerEvent) => {
            window.removeEventListener("pointerup", enVentana, true);
            if (inicio.current) soltar(ev.clientX);
          };
          window.addEventListener("pointerup", enVentana, true);
          inicio.current = {
            x: e.clientX, y: e.clientY, t: performance.now(),
            ancho: e.currentTarget.getBoundingClientRect().width,
          };
          eje.current = null;
          huboArrastre.current = false;
        }}
        onPointerMove={(e) => {
          const i = inicio.current;
          if (!i) return;
          ultimoX.current = e.clientX;
          if (!eje.current) {
            eje.current = ejeDelGesto(e.clientX - i.x, e.clientY - i.y);
            if (eje.current === "vertical") { inicio.current = null; return; }
            if (eje.current === "horizontal") {
              e.currentTarget.setPointerCapture(e.pointerId);
              setArrastrando(true);
            }
          }
          if (eje.current === "horizontal") {
            huboArrastre.current = true;
            setDx(desplazamiento(e.clientX - i.x));
          }
        }}
        onPointerUp={(e) => soltar(e.clientX)}
      >
        {children}
      </div>
    </div>
  );
}

export default Deslizable;
