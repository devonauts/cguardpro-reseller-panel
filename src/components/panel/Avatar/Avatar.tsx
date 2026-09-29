import { useEffect, useState } from "react";

import "./Avatar.scss";

/**
 * Las iniciales de una persona, en un disco de cristal.
 *
 * Con `foto`, la foto; sin ella —o si no carga— las iniciales: un hueco gris
 * donde debería ir una cara se lee como un error. Dos letras siempre están bien.
 */
export function Avatar({
  nombre, tamano = 36, foto,
}: { nombre: string; tamano?: number; foto?: string | null }) {
  const [rota, setRota] = useState(false);
  useEffect(() => { setRota(false); }, [foto]);

  const iniciales = nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

  return (
    <span
      className="avatar"
      style={{ width: tamano, height: tamano, fontSize: Math.round(tamano * 0.36) }}
      aria-hidden="true"
    >
      {foto && !rota
        ? <img className="avatar__foto" src={foto} alt="" onError={() => setRota(true)} />
        : iniciales}
    </span>
  );
}

export default Avatar;
