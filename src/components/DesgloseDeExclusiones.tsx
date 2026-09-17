import type { Exclusiones } from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import "./DesgloseDeExclusiones.scss";

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
const ETIQUETA: Record<string, Clave> = {
  invited: "desglose.motivoInvited",
  pending: "desglose.motivoPending",
  archived: "desglose.motivoArchived",
  deletedMembership: "desglose.motivoDeletedMembership",
  orphanUser: "desglose.motivoOrphanUser",
  demoSeed: "desglose.motivoDemoSeed",
  policy: "desglose.motivoPolicy",
};

/** Lo que significa cada uno, para quien pregunte. */
const EXPLICACION: Record<string, Clave> = {
  invited: "desglose.explInvited",
  pending: "desglose.explPending",
  archived: "desglose.explArchived",
  deletedMembership: "desglose.explDeletedMembership",
  orphanUser: "desglose.explOrphanUser",
  demoSeed: "desglose.explDemoSeed",
  policy: "desglose.explPolicy",
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
  const t = useT();
  const motivos = Object.entries(excluded)
    .filter(([, n]) => typeof n === "number" && n > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number));

  if (!motivos.length) {
    return (
      <p className="desglose__nada">
        {sourceMemberships !== null
          ? t("desglose.todasContadas", { n: sourceMemberships })
          : t("desglose.sinExclusiones")}
      </p>
    );
  }

  return (
    <div className="desglose">
      {sourceMemberships !== null && (
        <p className="desglose__suma">
          <strong>{sourceMemberships}</strong> {t("desglose.cuentasEnLaEmpresa")}{" "}
          <strong>{royaltySeats}</strong> {t("desglose.contabilizadas")}
        </p>
      )}

      <ul className="desglose__lista">
        {motivos.map(([clave, n]) => (
          <li key={clave} className="desglose__fila">
            <span className="desglose__n">{n}</span>
            <span className="desglose__texto">
              <span className="desglose__motivo">{ETIQUETA[clave] ? t(ETIQUETA[clave]) : clave}</span>
              {EXPLICACION[clave] && (
                <span className="desglose__ayuda">{t(EXPLICACION[clave])}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DesgloseDeExclusiones;
