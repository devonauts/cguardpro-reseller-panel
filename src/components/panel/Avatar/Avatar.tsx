import { useEffect, useState } from "react";

import "./Avatar.scss";

/**
 * La cara de una persona en un disco de cristal: su foto, o sus iniciales.
 *
 * ── SIN PARPADEOS ─────────────────────────────────────────────────────────
 * Una foto nueva NO se pinta hasta que ha terminado de bajar: mientras tanto
 * se queda la que había y, si no había ninguna, un esqueleto con la MISMA
 * forma de disco. Antes, al cambiar la foto se veía un instante el hueco vacío
 * (o las iniciales) y luego la imagen saltaba encima.
 *
 * `cargando` fuerza el esqueleto (p. ej. mientras se sube una foto). Si la
 * foto no carga, iniciales: un hueco gris donde debería ir una cara se lee
 * como un error.
 */
export function Avatar({
  nombre, tamano = 36, foto, cargando = false,
}: { nombre: string; tamano?: number; foto?: string | null; cargando?: boolean }) {
  const iniciales = nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

  /* La foto que está en pantalla y si la pedida aún está bajando. */
  const [mostrada, setMostrada] = useState<string | null>(null);
  const [bajando, setBajando] = useState(!!foto);

  useEffect(() => {
    if (!foto) { setMostrada(null); setBajando(false); return; }
    if (foto === mostrada) { setBajando(false); return; }
    let vigente = true;
    setBajando(true);
    const img = new Image();
    img.onload = () => { if (vigente) { setMostrada(foto); setBajando(false); } };
    img.onerror = () => { if (vigente) { setMostrada(null); setBajando(false); } };
    img.src = foto;
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foto]);

  const esqueleto = cargando || (bajando && !mostrada);

  return (
    <span
      className={`avatar${esqueleto ? " avatar--esqueleto" : ""}`}
      style={{ width: tamano, height: tamano, fontSize: Math.round(tamano * 0.36) }}
      aria-hidden="true"
    >
      {esqueleto ? null : mostrada
        ? <img className="avatar__foto" src={mostrada} alt="" />
        : iniciales}
    </span>
  );
}

export default Avatar;
