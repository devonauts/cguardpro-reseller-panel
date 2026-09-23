import { useEffect, useMemo, useRef, useState } from "react";
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
  { a: "/team", icono: "personas", texto: "nav.equipo" },
  { a: "/billing", icono: "tarjeta", texto: "nav.facturacion" },
  { a: "/usage", icono: "grafico", texto: "nav.consumo" },
  { a: "/activity", icono: "libro", texto: "nav.actividad" },
  { a: "/contract", icono: "escudo", texto: "nav.contrato" },
  { a: "/entitlements", icono: "corona", texto: "nav.derechos", dorado: true },
  { a: "/account", icono: "engranaje", texto: "nav.ajustesCorto" },
];

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
    if (!abierto) return;
    campo.current?.focus();
    /* Las empresas se piden al ABRIR, no al montar: quien no usa el buscador no
       paga una petición por cargar el panel. */
    if (empresas.length) return;
    companiesService.list({ limit: 100 })
      .then((r) => setEmpresas(r.rows ?? []))
      .catch(() => { /* sin empresas se buscan sólo las secciones */ });
  }, [abierto, empresas.length]);

  const q = normaliza(consulta.trim());

  const secciones = useMemo(
    () => SECCIONES.filter((s) => !q || normaliza(t(s.texto)).includes(q)),
    [q, t],
  );
  const encontradas = useMemo(
    () => (!q ? [] : empresas.filter((e) => normaliza(String(e.name ?? "")).includes(q)).slice(0, 6)),
    [q, empresas],
  );

  const ir = (a: string) => { setAbierto(false); setConsulta(""); navigate(a); };

  return (
    <>
      <button type="button" className="buscador__disparador" onClick={() => setAbierto(true)}>
        <Icono nombre="lupa" tamano={17} />
        <span className="buscador__texto">{t("buscador.abrir")}</span>
        {/* El atajo, a la vista: un atajo que no se anuncia no lo usa nadie. */}
        <kbd className="buscador__atajo">⌘K</kbd>
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
                placeholder={t("buscador.marcador")}
                aria-label={t("buscador.titulo")}
              />
            </div>

            <div className="buscador__resultados">
              {secciones.length > 0 && (
                <>
                  <p className="buscador__grupo">{t("buscador.secciones")}</p>
                  {secciones.map((s) => (
                    <button key={s.a} type="button" className="buscador__item" onClick={() => ir(s.a)}>
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
                  {encontradas.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      className="buscador__item"
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
