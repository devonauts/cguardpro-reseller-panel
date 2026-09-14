import type { Exclusiones } from "@/services/resellerService";
import "./DesgloseDeExclusiones.css";

/**
 * Por qué se cobran menos asientos que usuarios tiene la empresa.
 *
 * ── ESTO ES LA RESPUESTA A LA DISCUSIÓN MÁS PREVISIBLE ────────────────────
 * «Tengo 214 usuarios y me has cobrado 200.» Sin este desglose, contestar
 * significa volver a consultar unos datos que ya han cambiado — es decir,
 * significa adivinar. Con él, la respuesta está en la propia fila y es la misma
 * dentro de tres años.
 *
 * Por eso va en la pantalla y no escondido en un JSON para desarrolladores.
 */

/** Cada motivo, dicho como lo diría una persona. */
const ETIQUETA: Record<string, string> = {
  invited: "Invitados sin aceptar",
  pending: "Pendientes de activar",
  archived: "Dados de baja o inactivos",
  deletedMembership: "Eliminados",
  orphanUser: "Sin cuenta asociada",
  demoSeed: "Datos de ejemplo de la plataforma",
  policy: "Fuera de lo que cubre tu contrato",
};

/** Lo que significa cada uno, para quien pregunte. */
const EXPLICACION: Record<string, string> = {
  invited: "Se les envió la invitación pero todavía no han entrado.",
  pending: "Su alta está a medias.",
  archived: "Ya no trabajan en la empresa o están desactivados.",
  deletedMembership: "Se les borró de la empresa.",
  orphanUser: "La cuenta de la persona ya no existe.",
  demoSeed: "Los creó CGuard Pro como ejemplo al abrir la empresa. No se cobran.",
  policy: "Su puesto no entra en la modalidad que tienes contratada.",
};

export function DesgloseDeExclusiones({
  excluded,
  sourceMemberships,
  royaltySeats,
}: {
  excluded: Exclusiones;
  sourceMemberships: number | null;
  royaltySeats: number;
}) {
  const motivos = Object.entries(excluded)
    .filter(([, n]) => typeof n === "number" && n > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number));

  if (!motivos.length) {
    return (
      <p className="desglose__nada">
        {sourceMemberships !== null
          ? `Las ${sourceMemberships} cuentas de la empresa se contabilizaron.`
          : "No hubo exclusiones."}
      </p>
    );
  }

  return (
    <div className="desglose">
      {sourceMemberships !== null && (
        <p className="desglose__suma">
          <strong>{sourceMemberships}</strong> cuentas en la empresa →{" "}
          <strong>{royaltySeats}</strong> contabilizadas
        </p>
      )}

      <ul className="desglose__lista">
        {motivos.map(([clave, n]) => (
          <li key={clave} className="desglose__fila">
            <span className="desglose__n">{n}</span>
            <span className="desglose__texto">
              <span className="desglose__motivo">{ETIQUETA[clave] ?? clave}</span>
              {EXPLICACION[clave] && (
                <span className="desglose__ayuda">{EXPLICACION[clave]}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DesgloseDeExclusiones;
