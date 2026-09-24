import { useEffect, useRef, useState } from "react";
import { Boton } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import "./LienzoDeFirma.scss";

/**
 * Draw a signature with a finger, a pen or the mouse.
 *
 * Pointer events cover touch, pen and mouse with one code path. The canvas is
 * drawn at device-pixel resolution so the stroke is not blurry on a phone,
 * and exported as a transparent PNG (what the server stores and shows over a
 * dark card). The ink colour is read from the theme, not written here.
 */
export function LienzoDeFirma({ onCambio }: { onCambio: (png: string | null) => void }) {
  const t = useT();
  const lienzo = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const ultimo = useRef<{ x: number; y: number } | null>(null);
  const [vacio, setVacio] = useState(true);

  useEffect(() => {
    const c = lienzo.current;
    if (!c) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const r = c.getBoundingClientRect();
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = getComputedStyle(c).color;
  }, []);

  const punto = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const empezar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dibujando.current = true;
    ultimo.current = punto(e);
  };

  const mover = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dibujando.current || !ultimo.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const p = punto(e);
    ctx.beginPath();
    ctx.moveTo(ultimo.current.x, ultimo.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ultimo.current = p;
    if (vacio) setVacio(false);
  };

  const terminar = () => {
    if (!dibujando.current) return;
    dibujando.current = false;
    ultimo.current = null;
    const c = lienzo.current;
    if (c && !vacio) onCambio(c.toDataURL("image/png"));
  };

  const borrar = () => {
    const c = lienzo.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
    setVacio(true);
    onCambio(null);
  };

  return (
    <div className="lienzo-firma">
      <canvas
        ref={lienzo}
        className="lienzo-firma__area"
        aria-label={t("firma.lienzoAria")}
        onPointerDown={empezar}
        onPointerMove={mover}
        onPointerUp={terminar}
        onPointerLeave={terminar}
        onPointerCancel={terminar}
      />
      <div className="lienzo-firma__pie">
        <span className="lienzo-firma__guia">{t(vacio ? "firma.lienzoVacio" : "firma.lienzoListo")}</span>
        <Boton variante="fantasma" type="button" onClick={borrar} disabled={vacio}>
          {t("firma.lienzoBorrar")}
        </Boton>
      </div>
    </div>
  );
}

export default LienzoDeFirma;
