import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, forwardRef } from "react";
import { useT } from "@/i18n/IdiomaProvider";
import "./kit.css";

/**
 * El kit del panel. Pequeño a propósito.
 *
 * Se escribe aquí en vez de traerse una librería de componentes porque el panel
 * es una aplicación aparte y su frontera tiene que ser real: importar el kit del
 * CRM o el del panel de superadmin ataría tres productos a un mismo calendario
 * de versiones. Lo poco que hace falta cabe en un archivo.
 *
 * Todo lee fichas de `styles/tokens.css`. Aquí no hay ni un color literal.
 */

/* ── Botón ─────────────────────────────────────────────────────────────── */

type Variante = "primario" | "suave" | "fantasma" | "peligro";

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  cargando?: boolean;
  bloque?: boolean;
}

export function Boton({
  variante = "primario", cargando, bloque, children, disabled, ...rest
}: BotonProps) {
  return (
    <button
      /* `type="button"` por defecto: el defecto de HTML es `submit`, y un botón
         suelto dentro de un formulario acaba enviándolo sin que nadie lo pida. */
      type="button"
      className={`btn btn--${variante}${bloque ? " btn--bloque" : ""}`}
      disabled={disabled || cargando}
      /* Se anuncia el estado ocupado, no sólo se pinta el giro. */
      aria-busy={cargando || undefined}
      {...rest}
    >
      {cargando && <span className="btn__spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

/* ── Campo ─────────────────────────────────────────────────────────────── */

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string;
  error?: string | null;
  ayuda?: string;
}

/**
 * Etiqueta REAL, unida al control por `htmlFor`. No un marcador de posición
 * haciendo de etiqueta: ese desaparece al escribir y deja al lector de pantalla
 * —y a cualquiera que se distraiga— sin saber qué campo está rellenando.
 */
export const Campo = forwardRef<HTMLInputElement, CampoProps>(function Campo(
  { etiqueta, error, ayuda, id, ...rest }, ref,
) {
  const idCampo = id || `campo-${etiqueta.toLowerCase().replace(/\s+/g, "-")}`;
  const idAyuda = ayuda ? `${idCampo}-ayuda` : undefined;
  const idError = error ? `${idCampo}-error` : undefined;
  return (
    <div className="campo">
      <label className="campo__etiqueta" htmlFor={idCampo}>{etiqueta}</label>
      <input
        ref={ref}
        id={idCampo}
        className={`campo__control${error ? " campo__control--error" : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={[idAyuda, idError].filter(Boolean).join(" ") || undefined}
        {...rest}
      />
      {ayuda && <span id={idAyuda} className="campo__ayuda">{ayuda}</span>}
      {/* `role="alert"`: el error se anuncia al aparecer, no sólo se ve. */}
      {error && <span id={idError} role="alert" className="campo__error">{error}</span>}
    </div>
  );
});

/* ── Tarjetas ──────────────────────────────────────────────────────────── */

export function Tarjeta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`tarjeta ${className}`}>{children}</section>;
}

export function TarjetaCabecera({ titulo, nota }: { titulo: string; nota?: ReactNode }) {
  return (
    <header className="tarjeta__cabecera">
      <h2 className="tarjeta__titulo">{titulo}</h2>
      {nota && <p className="tarjeta__nota">{nota}</p>}
    </header>
  );
}

export function Dato({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div className="dato">
      <dt className="dato__etiqueta">{etiqueta}</dt>
      <dd className="dato__valor">{valor ?? "—"}</dd>
    </div>
  );
}

/** Una cifra grande con su rótulo. */
export function Cifra({
  etiqueta, valor, nota, cargando,
}: { etiqueta: string; valor: ReactNode; nota?: ReactNode; cargando?: boolean }) {
  return (
    <div className="cifra">
      <span className="cifra__etiqueta">{etiqueta}</span>
      {cargando ? (
        <span className="cifra__esqueleto" aria-hidden="true" />
      ) : (
        <span className="cifra__valor">{valor}</span>
      )}
      {nota && !cargando && <span className="cifra__nota">{nota}</span>}
    </div>
  );
}

/* ── Píldora de estado ─────────────────────────────────────────────────── */

export type Tono = "ok" | "aviso" | "peligro" | "neutro";

export function Pildora({ tono = "neutro", children }: { tono?: Tono; children: ReactNode }) {
  return <span className={`pildora pildora--${tono}`}>{children}</span>;
}

/* ── Estado de los datos ───────────────────────────────────────────────── */

/**
 * Cargando / error / vacío, en un solo sitio.
 *
 * La carga se anuncia con `role="status"` y `aria-live="polite"`: quien no ve la
 * pantalla se entera de que está esperando, en vez de encontrarse un silencio.
 */
export function EstadoDeDatos({
  cargando, error, vacio, etiquetaVacio,
  onReintentar, children,
}: {
  cargando?: boolean;
  error?: string | null;
  vacio?: boolean;
  etiquetaVacio?: string;
  onReintentar?: () => void;
  children: ReactNode;
}) {
  const t = useT();
  if (cargando) {
    return (
      <div className="estado" role="status" aria-live="polite">
        <span className="estado__spinner" aria-hidden="true" />
        <p className="estado__texto">{t("comun.cargando")}</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="estado" role="alert">
        <p className="estado__texto estado__texto--error">{error}</p>
        {onReintentar && (
          <Boton variante="suave" onClick={onReintentar}>{t("comun.reintentar")}</Boton>
        )}
      </div>
    );
  }
  if (vacio) {
    return (
      <div className="estado">
        <p className="estado__texto">{etiquetaVacio ?? t("comun.vacio")}</p>
      </div>
    );
  }
  return <>{children}</>;
}

/**
 * UN HUECO DECLARADO.
 *
 * Existe para lo que todavía no tiene motor detrás. Enseñar un `$0` o un `—` en
 * su lugar sería peor: un cero se lee como una medición, y aquí la medición es
 * dinero que alguien va a reclamar.
 */
export function TodaviaNo({ children }: { children: ReactNode }) {
  return (
    <div className="todavia-no">
      <p>{children}</p>
    </div>
  );
}
