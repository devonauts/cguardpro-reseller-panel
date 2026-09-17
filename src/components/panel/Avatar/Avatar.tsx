import "./Avatar.scss";

/**
 * Las iniciales de una persona, en un disco de cristal.
 *
 * Sin foto: el panel de socio no guarda ninguna, y un hueco gris donde debería
 * ir una cara se lee como un error. Dos letras siempre están bien.
 */
export function Avatar({ nombre, tamano = 36 }: { nombre: string; tamano?: number }) {
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
      {iniciales}
    </span>
  );
}

export default Avatar;
