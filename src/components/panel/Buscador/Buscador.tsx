import { useEffect, useMemo, useRef, useState, type KeyboardEvent as TeclaDeReact } from "react";
import { useNavigate } from "react-router-dom";

import { Icono, type NombreDeIcono } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import { companiesService, type Empresa } from "@/services/resellerService";
import "./Buscador.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL BUSCADOR — Y BUSCA DE VERDAD
 *
 * No hay endpoint de búsqueda en el árbol del socio, así que esto NO pregunta
 * al servidor por texto libre. Busca sobre lo que sí existe: las secciones del
 * panel y la lista de empresas del socio, que se pide una vez al abrirlo.
 *
 * Es una distinción importante. Un campo que promete buscar «todo» y devuelve
 * vacío se prueba una vez y no se vuelve a usar nunca. Éste dice lo que hace
 * —ir a una sección o a una empresa— y eso lo cumple siempre.
 *
 * ── SE ABRE CON ⌘K, COMO SE ESPERA ────────────────────────────────────────
 * Y con Ctrl+K fuera de Mac. El atajo se registra en `document` y se retira al
 * desmontar: un oyente global que sobrevive al componente sigue robando la
 * tecla en el resto de la aplicación.
 * ════════════════════════════════════════════════════════════════════════════
 */

interface Seccion {
  a: string;
  icono: NombreDeIcono;
  texto: Clave;
  /** Mismo oro que en el raíl: la sección se ve igual se llegue por donde se
   *  llegue. Ver `--gold`. */
  dorado?: boolean;
}

const SECCIONES: Seccion[] = [
  { a: "/dashboard", icono: "casa", texto: "nav.tablero" },
  { a: "/companies", icono: "edificio", texto: "nav.empresas" },
  { a: "/company-billing", icono: "moneda", texto: "nav.cobros" },
  { a: "/domains", icono: "globo", texto: "nav.dominios" },
  { a: "/branding", icono: "paleta", texto: "nav.marcaCorto" },
  { a: "/assistant", icono: "bocadillo", texto: "nav.asistente" },
  { a: "/team", icono: "personas", texto: "nav.equipo" },
  { a: "/billing", icono: "tarjeta", texto: "nav.facturacion" },
  { a: "/usage", icono: "grafico", texto: "nav.consumo" },
  { a: "/analytics", icono: "grafico", texto: "nav.analitica" },
  { a: "/activity", icono: "libro", texto: "nav.actividad" },
  { a: "/contract", icono: "escudo", texto: "nav.contrato" },
  { a: "/entitlements", icono: "corona", texto: "nav.derechos", dorado: true },
  { a: "/account", icono: "engranaje", texto: "nav.ajustesCorto" },
];

/** ⌘K on a Mac, Ctrl K everywhere else — both work, but say the right one. */
const ATAJO = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
  ? "⌘K"
  : "Ctrl K";

/** Sin acentos y en minúsculas: buscar «marca» tiene que encontrar «Márca». */
const normaliza = (v: string) =>
  v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function Buscador() {
  const t = useT();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAbierto((v) => !v);
      }
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, []);

  useEffect(() => {
    if (abierto) campo.current?.focus();
  }, [abierto]);

  const q = normaliza(consulta.trim());

  /* Companies are searched ON THE SERVER as the partner types. The old copy
     fetched the first 100 once and never again: a partner with more couldn't
     find the rest, and a company created a minute ago never showed up. */
  useEffect(() => {
    if (!abierto || !consulta.trim()) { setEmpresas([]); return undefined; }
    let vivo = true;
    const reloj = setTimeout(() => {
      companiesService.list({ limit: 6, search: consulta.trim() })
        .then((r) => { if (vivo) setEmpresas(r.rows ?? []); })
        .catch(() => { if (vivo) setEmpresas([]); });
    }, 200);
    return () => { vivo = false; clearTimeout(reloj); };
  }, [abierto, consulta]);

  const secciones = useMemo(
    () => SECCIONES.filter((s) => !q || normaliza(t(s.texto)).includes(q)),
    [q, t],
  );
  const encontradas = empresas.slice(0, 6);

  /* One list for the keyboard: ↑↓ move, Enter opens. A ⌘K palette where
     Enter did nothing sent everyone back to the mouse. */
  const destinos = [...secciones.map((s) => s.a), ...encontradas.map((e) => `/companies/${e.id}`)];
  const [activo, setActivo] = useState(0);
  useEffect(() => { setActivo(0); }, [consulta]);
  const alTeclear = (e: TeclaDeReact<HTMLInputElement>) => {
    if (!destinos.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActivo((i) => (i + 1) % destinos.length); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActivo((i) => (i - 1 + destinos.length) % destinos.length); }
    if (e.key === "Enter") { e.preventDefault(); ir(destinos[Math.min(activo, destinos.length - 1)]); }
  };

  const ir = (a: string) => { setAbierto(false); setConsulta(""); navigate(a); };

  return (
    <>
      <button type="button" className="buscador__disparador" onClick={() => setAbierto(true)}>
        <Icono nombre="lupa" tamano={17} />
        <span className="buscador__texto">{t("buscador.abrir")}</span>
        {/* El atajo, a la vista: un atajo que no se anuncia no lo usa nadie. */}
        <kbd className="buscador__atajo">{ATAJO}</kbd>
      </button>

      {abierto && (
        <div className="buscador__velo" onMouseDown={() => setAbierto(false)}>
          <div
            className="buscador__caja"
            role="dialog"
            aria-modal="true"
            aria-label={t("buscador.titulo")}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="buscador__campo">
              <Icono nombre="lupa" tamano={18} />
              <input
                ref={campo}
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
                onKeyDown={alTeclear}
                placeholder={t("buscador.marcador")}
                aria-label={t("buscador.titulo")}
              />
            </div>

            <div className="buscador__resultados">
              {secciones.length > 0 && (
                <>
                  <p className="buscador__grupo">{t("buscador.secciones")}</p>
                  {secciones.map((s, i) => (
                    <button
                      key={s.a}
                      type="button"
                      className={`buscador__item${i === activo ? " buscador__item--activo" : ""}`}
                      onClick={() => ir(s.a)}
                    >
                      <Icono
                        nombre={s.icono}
                        tamano={17}
                        className={s.dorado ? "icono--oro" : ""}
                      />
                      {t(s.texto)}
                    </button>
                  ))}
                </>
              )}

              {encontradas.length > 0 && (
                <>
                  <p className="buscador__grupo">{t("buscador.empresas")}</p>
                  {encontradas.map((e, i) => (
                    <button
                      key={e.id}
                      type="button"
                      className={`buscador__item${secciones.length + i === activo ? " buscador__item--activo" : ""}`}
                      onClick={() => ir(`/companies/${e.id}`)}
                    >
                      <Icono nombre="edificio" tamano={17} />
                      {e.name}
                    </button>
                  ))}
                </>
              )}

              {secciones.length === 0 && encontradas.length === 0 && (
                <p className="buscador__vacio">{t("buscador.sinResultados")}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Buscador;
