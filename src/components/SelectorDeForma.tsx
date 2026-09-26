import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import {
  FORMAS_DEL_AGENTE, FORMA_POR_DEFECTO, ICONOS_DEL_AGENTE, LISTA_DE_ICONOS, SILUETAS, esForma, esIcono,
  siglaDelAgente, type FormaDelAgente,
} from "@/lib/formasDelAgente";

/** One silhouette, filled with the partner's colour, with the assistant's initials. */
export function FormaSvg({ forma, color, sigla, tamano = 40, icono }: {
  forma: FormaDelAgente; color: string; sigla: string; tamano?: number;
  /** An icon key: drawn inside the shape instead of the initials. */
  icono?: string | null;
}) {
  const s = SILUETAS[forma];
  const glifo = esIcono(icono) ? ICONOS_DEL_AGENTE[icono] : null;
  return (
    <svg aria-hidden width={tamano} height={tamano * 54 / 48} viewBox="0 0 48 54">
      <path d={s.d} fill={color} />
      {glifo ? (
        <g
          transform={`translate(13 ${s.cy - 11}) scale(0.92)`}
          fill="none" stroke="#fff" color="#fff" strokeWidth={1.9}
          strokeLinecap="round" strokeLinejoin="round"
          dangerouslySetInnerHTML={{ __html: glifo }}
        />
      ) : (
      <text
        x="24" y={s.cy + 4} textAnchor="middle" fontSize={sigla.length > 4 ? 8.5 : 11}
        fontWeight={800} fill="#fff" style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        {sigla}
      </text>
      )}
    </svg>
  );
}

/**
 * The assistant's shape: a dropdown whose options ARE the shapes, drawn in the
 * partner's colour with its assistant's initials — what its customers will see
 * in the corner of the CRM.
 */
export function SelectorDeForma({ valor, onCambio, color, nombreDelAgente, deshabilitado, icono }: {
  /** The chosen icon, so every option previews the real bubble. */
  icono?: string | null;
  valor: string | null | undefined;
  onCambio: (forma: FormaDelAgente) => void;
  color: string;
  nombreDelAgente: string;
  deshabilitado?: boolean;
}) {
  const t = useT();
  const actual: FormaDelAgente = esForma(valor) ? valor : FORMA_POR_DEFECTO;
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(FORMAS_DEL_AGENTE.indexOf(actual));
  const raiz = useRef<HTMLDivElement>(null);
  const sigla = siglaDelAgente(nombreDelAgente);
  const nombre = (f: FormaDelAgente) => t(`marca.forma.${f}` as Clave);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  const elegir = (f: FormaDelAgente) => {
    onCambio(f);
    setAbierto(false);
  };

  const teclas = (e: KeyboardEvent) => {
    if (deshabilitado) return;
    if (e.key === "Escape") { setAbierto(false); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!abierto) { setAbierto(true); setActivo(FORMAS_DEL_AGENTE.indexOf(actual)); return; }
      const paso = e.key === "ArrowDown" ? 1 : -1;
      setActivo((i) => (i + paso + FORMAS_DEL_AGENTE.length) % FORMAS_DEL_AGENTE.length);
    }
    if ((e.key === "Enter" || e.key === " ") && abierto) {
      e.preventDefault();
      elegir(FORMAS_DEL_AGENTE[activo]);
    }
  };

  return (
    <div className="forma" ref={raiz} onKeyDown={teclas}>
      <button
        type="button"
        className="forma__boton"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        disabled={deshabilitado}
        onClick={() => { setAbierto((a) => !a); setActivo(FORMAS_DEL_AGENTE.indexOf(actual)); }}
      >
        <FormaSvg forma={actual} color={color} sigla={sigla} tamano={34} icono={icono} />
        <span className="forma__nombre">
          {nombre(actual)}
          {!esForma(valor) && <span className="forma__nota"> · {t("marca.formaPorDefecto")}</span>}
        </span>
        <svg aria-hidden className="forma__flecha" width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {abierto && (
        <ul className="forma__lista" role="listbox" aria-label={t("marca.formaLeyenda")}>
          {FORMAS_DEL_AGENTE.map((f, i) => (
            <li
              key={f}
              role="option"
              aria-selected={f === actual}
              className={`forma__opcion${i === activo ? " forma__opcion--activa" : ""}${f === actual ? " forma__opcion--elegida" : ""}`}
              onMouseEnter={() => setActivo(i)}
              onClick={() => elegir(f)}
            >
              <FormaSvg forma={f} color={color} sigla={sigla} tamano={44} icono={icono} />
              <span>{nombre(f)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SelectorDeForma;

/**
 * The icon inside the shape: a dropdown whose options are the real bubble with
 * each icon, in the partner's colour and chosen shape. "Initials" = no icon.
 */
export function SelectorDeIcono({ valor, onCambio, color, forma, nombreDelAgente, deshabilitado }: {
  valor: string | null | undefined;
  onCambio: (icono: string | null) => void;
  color: string;
  forma: string | null | undefined;
  nombreDelAgente: string;
  deshabilitado?: boolean;
}) {
  const t = useT();
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const f: FormaDelAgente = esForma(forma) ? forma : FORMA_POR_DEFECTO;
  const sigla = siglaDelAgente(nombreDelAgente);
  const actual = esIcono(valor) ? valor : null;
  const opciones: Array<string | null> = [null, ...LISTA_DE_ICONOS];
  const nombre = (i: string | null) => (i ? t(`asistente.cara.${i}` as Clave) : t("marca.iconoIniciales"));

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  return (
    <div className="forma" ref={raiz} onKeyDown={(e) => { if (e.key === "Escape") setAbierto(false); }}>
      <button
        type="button"
        className="forma__boton"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        disabled={deshabilitado}
        onClick={() => setAbierto((a) => !a)}
      >
        <FormaSvg forma={f} color={color} sigla={sigla} tamano={34} icono={actual} />
        <span className="forma__nombre">{nombre(actual)}</span>
        <svg aria-hidden className="forma__flecha" width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {abierto && (
        <ul className="forma__lista forma__lista--iconos" role="listbox" aria-label={t("marca.iconoLeyenda")}>
          {opciones.map((i) => (
            <li
              key={i ?? "iniciales"}
              role="option"
              aria-selected={i === actual}
              className={`forma__opcion${i === actual ? " forma__opcion--elegida" : ""}`}
              onClick={() => { onCambio(i); setAbierto(false); }}
            >
              <FormaSvg forma={f} color={color} sigla={sigla} tamano={40} icono={i} />
              <span>{nombre(i)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
