import { Campo } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import "./CamposDeClave.scss";

/**
 * Los dos campos de una contraseña nueva, con sus reglas a la vista.
 *
 * ── POR QUÉ ES UNA PIEZA Y NO CÓDIGO EN CADA PANTALLA ─────────────────────
 * Lo usan la activación de la cuenta y el restablecimiento. Son dos pantallas
 * distintas con el mismo trabajo: pedir una contraseña que el servidor vaya a
 * aceptar. Escribirlo dos veces garantiza que un día las reglas de una digan
 * algo distinto de las de la otra, y que la gente descubra la diferencia
 * después de que el servidor le diga que no.
 *
 * ── LA VALIDACIÓN DE VERDAD NO ESTÁ AQUÍ ──────────────────────────────────
 * Esto ACOMPAÑA: enseña qué falta mientras se escribe. Quien decide es el
 * servidor (`passwordPolicyService`), que vuelve a comprobarlo todo. Si algún
 * día la política del despliegue se endurece, aquí se verá una lista optimista
 * y allí un 400 con el motivo — molesto, pero nunca inseguro. Al revés sí lo
 * sería.
 */

export interface ReglasDeClave {
  largo: boolean;
  mayuscula: boolean;
  minuscula: boolean;
  numero: boolean;
  simbolo: boolean;
}

export function evaluarClave(clave: string): ReglasDeClave {
  return {
    largo: clave.length >= 8,
    mayuscula: /[A-Z]/.test(clave),
    minuscula: /[a-z]/.test(clave),
    numero: /[0-9]/.test(clave),
    simbolo: /[^A-Za-z0-9]/.test(clave),
  };
}

export function claveCompleta(clave: string): boolean {
  return Object.values(evaluarClave(clave)).every(Boolean);
}

interface Props {
  clave: string;
  repetida: string;
  onClave: (v: string) => void;
  onRepetida: (v: string) => void;
  /** Etiqueta del primer campo: no es igual «crea tu contraseña» que «la nueva». */
  etiqueta?: string;
}

export function CamposDeClave({ clave, repetida, onClave, onRepetida, etiqueta }: Props) {
  const t = useT();
  const reglas = evaluarClave(clave);
  const noCoincide = !!repetida && repetida !== clave;

  const lista: Array<[keyof ReglasDeClave, string]> = [
    ["largo", t("clave.reglaLargo")],
    ["mayuscula", t("clave.reglaMayuscula")],
    ["minuscula", t("clave.reglaMinuscula")],
    ["numero", t("clave.reglaNumero")],
    ["simbolo", t("clave.reglaSimbolo")],
  ];

  return (
    <>
      <Campo
        etiqueta={etiqueta || t("clave.nueva")}
        icono="candado"
        revelable
        type="password"
        name="new-password"
        autoComplete="new-password"
        placeholder={t("clave.marcador")}
        required
        value={clave}
        onChange={(e) => onClave(e.target.value)}
      />

      {/* La lista sólo aparece cuando hay algo que evaluar: en blanco sería una
          lista de reproches antes de haber escrito nada. */}
      {!!clave && (
        <ul className="reglas" aria-live="polite">
          {lista.map(([id, texto]) => (
            <li
              key={id}
              className={`reglas__punto ${reglas[id] ? "reglas__punto--ok" : ""}`}
            >
              <span aria-hidden="true">{reglas[id] ? "✓" : "•"}</span>
              {texto}
            </li>
          ))}
        </ul>
      )}

      <Campo
        etiqueta={t("clave.repetir")}
        icono="candado"
        revelable
        type="password"
        name="confirm-password"
        autoComplete="new-password"
        placeholder={t("clave.marcador")}
        required
        value={repetida}
        onChange={(e) => onRepetida(e.target.value)}
        error={noCoincide ? t("clave.noCoincide") : null}
      />
    </>
  );
}

export default CamposDeClave;
