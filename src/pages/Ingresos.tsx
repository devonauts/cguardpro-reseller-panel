import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Boton, EstadoDeDatos, Icono, Pildora, Selector, type Tono } from "@/components/cristal";
import { Grafica } from "@/components/panel/Grafica";
import { useIdioma } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import { dinero, fechaCorta, precio } from "@/lib/dinero";
import {
  cobroAEmpresasService,
  type FacturasAClientes as Respuesta,
} from "@/services/resellerService";
import "./Billing.scss";
import "./Ingresos.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * INGRESOS — LO QUE EL SOCIO GENERA CON SUS CLIENTES, Y NADA MÁS
 *
 * Pedido del dueño (2026-09-28): «parece que todo está por todo lado». Aquí va
 * NETAMENTE el dinero que el socio gana: lo que le pagan sus empresas cada mes
 * y lo que le deben. Lo que él le paga a CGuard Pro está en Facturación; cómo
 * cobra (pasarela, precios, numeración y formato de sus facturas), en Ajustes ›
 * Cobros y facturas.
 *
 * Las facturas se emiten SOLAS en cada cobro mensual (alta, renovación,
 * usuarios nuevos) con su número consecutivo, y al cobrarse el cliente recibe
 * la suya en PDF. Aquí se ven todas, se filtran y se descargan.
 * ════════════════════════════════════════════════════════════════════════════
 */

const ESTADO: Record<string, { texto: Clave; tono: Tono }> = {
  open: { texto: "ingresos.estadoOpen", tono: "aviso" },
  paid: { texto: "ingresos.estadoPaid", tono: "ok" },
  void: { texto: "ingresos.estadoVoid", tono: "neutro" },
  refunded: { texto: "ingresos.estadoRefunded", tono: "neutro" },
};

const CONCEPTO: Record<string, Clave> = {
  inicio: "ingresos.conceptoInicio",
  renovacion: "ingresos.conceptoRenovacion",
  asientos: "ingresos.conceptoAsientos",
};

const LINEA: Record<string, Clave> = {
  setup_fee: "ingresos.lineaImplementacion",
  seats: "ingresos.lineaUsuarios",
  monthly_fee: "ingresos.lineaCuota",
};

type Filtro = "" | "open" | "paid";
const POR_PAGINA = 50;

export function Ingresos() {
  const { t, idioma } = useIdioma();
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<Filtro>("");
  /* Desde la ficha de una empresa se llega ya filtrado (`?empresa=<id>`). */
  const [params] = useSearchParams();
  const [empresa, setEmpresa] = useState(params.get("empresa") || "");
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [empresas, setEmpresas] = useState<Array<{ id: string; name: string | null }>>([]);
  /** La moneda en que cobra el socio (la de su país): manda en los totales. */
  const [monedaDeCobro, setMonedaDeCobro] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [masCargando, setMasCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await cobroAEmpresasService.facturas({
        status: filtro || undefined, tenantId: empresa || undefined, limit: POR_PAGINA,
      }));
    } catch (e: any) {
      setError(e?.message || t("ingresos.noCargo"));
    } finally {
      setCargando(false);
    }
  }, [filtro, empresa, t]);

  useEffect(() => { void cargar(); }, [cargar]);

  useEffect(() => {
    let vivo = true;
    cobroAEmpresasService.leer()
      .then((r) => {
        if (!vivo) return;
        setEmpresas((r.companies ?? []).map((c) => ({ id: c.tenantId, name: c.name })));
        setMonedaDeCobro(r.currency ?? null);
      })
      .catch(() => { /* sin lista, sin filtro por empresa */ });
    return () => { vivo = false; };
  }, []);

  const cargarMas = async () => {
    if (!datos) return;
    setMasCargando(true);
    try {
      const r = await cobroAEmpresasService.facturas({
        status: filtro || undefined, tenantId: empresa || undefined, limit: POR_PAGINA, offset: datos.rows.length,
      });
      setDatos({ ...datos, rows: [...datos.rows, ...r.rows] });
    } catch { /* se puede reintentar */ } finally {
      setMasCargando(false);
    }
  };

  const monedas = Object.keys(datos?.totalsByCurrency ?? {});
  const moneda = monedaDeCobro ?? monedas[0] ?? "USD";
  const tot = datos?.totalsByCurrency?.[moneda] ?? { porCobrarCents: 0, cobrado30Cents: 0, cobradoTotalCents: 0 };
  const serie = datos?.monthlyByCurrency?.[moneda] ?? {};
  const meses = datos?.months ?? [];
  const esteMes = meses.length ? serie[meses[meses.length - 1]] ?? 0 : 0;
  const mesAnterior = meses.length > 1 ? serie[meses[meses.length - 2]] ?? 0 : 0;
  const doceMeses = meses.reduce((n, m) => n + (serie[m] ?? 0), 0);
  const otras = monedas.filter((m) => m !== moneda);

  const barras = useMemo(() => meses.map((m) => ({
    etiqueta: new Intl.DateTimeFormat(idioma, { month: "short", timeZone: "UTC" })
      .format(new Date(`${m}-01T12:00:00Z`)).replace(".", ""),
    valor: Math.round((serie[m] ?? 0) / 100),
  })), [meses, serie, idioma]);
  const compacto = useMemo(() => {
    const f = new Intl.NumberFormat(idioma, { notation: "compact", maximumFractionDigits: 1 });
    return (n: number) => f.format(n);
  }, [idioma]);

  const variacion = mesAnterior > 0 ? Math.round(((esteMes - mesAnterior) / mesAnterior) * 100) : null;

  return (
    <>
      <header className="cabecera">
        <div>
          <h1 className="cabecera__titulo">{t("ingresos.titulo")}</h1>
          <p className="cabecera__sub">{t("ingresos.sub")}</p>
        </div>
        <Link to="/company-billing" className="bloque__enlace ingresos__ajustes">
          <Icono nombre="engranaje" tamano={15} /> {t("ingresos.ajustes")}
        </Link>
      </header>

      <div className="facturacion">
        <div className="resumen ingresos__resumen">
          <section className="saldo-ficha">
            <span className="saldo-ficha__etiqueta">{t("ingresos.esteMes")}</span>
            <span className="saldo-ficha__valor">{precio(esteMes, moneda)}</span>
            <span className="saldo-ficha__nota">
              {variacion === null
                ? t("ingresos.esteMesNota")
                : t(variacion >= 0 ? "ingresos.subeRespecto" : "ingresos.bajaRespecto", { n: Math.abs(variacion) })}
            </span>
          </section>
          <section className="saldo-ficha">
            <span className="saldo-ficha__etiqueta">{t("ingresos.mesAnterior")}</span>
            <span className="saldo-ficha__valor">{precio(mesAnterior, moneda)}</span>
          </section>
          <section className="saldo-ficha">
            <span className="saldo-ficha__etiqueta">{t("ingresos.doceMeses")}</span>
            <span className="saldo-ficha__valor">{precio(doceMeses, moneda)}</span>
            <span className="saldo-ficha__nota">{t("ingresos.totalHistorico", { v: precio(tot.cobradoTotalCents, moneda) })}</span>
          </section>
          <section className={`saldo-ficha${tot.porCobrarCents > 0 ? " saldo-ficha--aviso" : ""}`}>
            <span className="saldo-ficha__etiqueta">{t("ingresos.porCobrar")}</span>
            <span className="saldo-ficha__valor">{precio(tot.porCobrarCents, moneda)}</span>
            <span className="saldo-ficha__nota">{t("ingresos.porCobrarNota")}</span>
          </section>
        </div>
        {otras.length > 0 && datos && (
          <p className="bloque__nota">
            {t("ingresos.otrasMonedas", {
              l: otras.map((m) => `${precio(datos.totalsByCurrency[m].cobradoTotalCents, m)}`).join(" · "),
            })}
          </p>
        )}

        <section className="bloque" aria-labelledby="ingresos-mes">
          <header className="bloque__cabecera">
            <h2 id="ingresos-mes" className="bloque__titulo">{t("ingresos.porMes", { m: moneda })}</h2>
          </header>
          {cargando && !datos ? (
            <div className="ingresos__grafica-esqueleto" aria-hidden="true" />
          ) : (
            <Grafica datos={barras} etiquetaAccesible={t("ingresos.porMes", { m: moneda })} formato={compacto} />
          )}
        </section>

        <section className="bloque" aria-labelledby="ingresos-facturas">
          <header className="bloque__cabecera ingresos__cabecera">
            <h2 id="ingresos-facturas" className="bloque__titulo">{t("ingresos.facturas")}</h2>
            <div className="ingresos__filtros">
              <div className="pestanas pestanas--pequenas" role="group" aria-label={t("ingresos.filtroEstado")}>
                {([["", "ingresos.todas"], ["open", "ingresos.pendientes"], ["paid", "ingresos.pagadas"]] as const).map(([v, texto]) => (
                  <button
                    key={v || "todas"}
                    type="button"
                    aria-pressed={filtro === v}
                    className={`pestanas__boton${filtro === v ? " pestanas__boton--activa" : ""}`}
                    onClick={() => { setFiltro(v); }}
                  >
                    {t(texto)}
                  </button>
                ))}
              </div>
              {(empresas.length > 1 || !!empresa) && (
                <Selector
                  compacto
                  etiquetaOculta={t("ingresos.filtroEmpresa")}
                  value={empresa}
                  onChange={(e) => { setEmpresa(e.target.value); }}
                >
                  <option value="">{t("ingresos.todasLasEmpresas")}</option>
                  {empresas.map((e) => <option key={e.id} value={e.id}>{e.name || t("empresas.sinNombre")}</option>)}
                </Selector>
              )}
            </div>
          </header>

          <EstadoDeDatos cargando={cargando} error={error} onReintentar={cargar}>
            {!datos || datos.rows.length === 0 ? (
              <div className="bloque__vacio ingresos__vacio">
                <p>{t(filtro || empresa ? "ingresos.vacioFiltro" : "ingresos.vacio")}</p>
                {!filtro && !empresa && (
                  <Link to="/company-billing" className="bloque__enlace">
                    {t("ingresos.configurar")} <Icono nombre="flecha" tamano={14} />
                  </Link>
                )}
              </div>
            ) : (
              <div className="facturas ingresos__tabla" role="table" aria-label={t("ingresos.facturas")}>
                <div className="facturas__fila facturas__fila--cabecera" role="row">
                  <span role="columnheader">{t("ingresos.colNumero")}</span>
                  <span role="columnheader">{t("ingresos.colCliente")}</span>
                  <span role="columnheader">{t("ingresos.colConcepto")}</span>
                  <span role="columnheader">{t("ingresos.colEmitida")}</span>
                  <span role="columnheader" className="facturas__derecha">{t("ingresos.colImporte")}</span>
                  <span role="columnheader" className="facturas__derecha">{t("ingresos.colEstado")}</span>
                </div>
                {datos.rows.map((f) => (
                  <div key={f.id} className="facturas__grupo">
                    {/* Pulsar abre el DETALLE de la factura (qué, cuántos usuarios y por dónde se pagó). */}
                    <button
                      type="button"
                      role="row"
                      className="facturas__fila"
                      onClick={() => navigate(`/revenue/${f.id}`)}
                    >
                      <span role="cell" className="facturas__numero">{f.folio}</span>
                      <span role="cell" className="ingresos__cliente">{f.company.name || t("empresas.sinNombre")}</span>
                      <span role="cell">{CONCEPTO[f.kind] ? t(CONCEPTO[f.kind]) : f.kind}</span>
                      <span role="cell">{fechaCorta(f.issuedAt)}</span>
                      <span role="cell" className="facturas__derecha facturas__importe">{dinero(f.totalCents, f.currency)}</span>
                      <span role="cell" className="facturas__derecha">
                        <Pildora tono={ESTADO[f.status]?.tono ?? "neutro"}>
                          {ESTADO[f.status] ? t(ESTADO[f.status].texto) : f.status}
                        </Pildora>
                      </span>
                    </button>
                  </div>
                ))}
                {datos.rows.length < datos.count && (
                  <div className="ingresos__mas">
                    <Boton variante="suave" cargando={masCargando} onClick={cargarMas}>
                      {t("ingresos.verMas", { n: datos.count - datos.rows.length })}
                    </Boton>
                  </div>
                )}
              </div>
            )}
          </EstadoDeDatos>
        </section>
      </div>
    </>
  );
}

export default Ingresos;
