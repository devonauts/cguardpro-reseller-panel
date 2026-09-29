import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Boton, EstadoDeDatos, Icono, Pildora, type Tono } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import { dinero, fechaCorta, precio } from "@/lib/dinero";
import { cobroAEmpresasService, type DetalleDeFacturaACliente } from "@/services/resellerService";
import "./Billing.scss";
import "./FacturaDeCliente.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * INGRESOS › UNA FACTURA — lo que el socio le cobró a un cliente, entero.
 *
 * Pedido del dueño (2026-09-29): «aplastar y que me lleve a un detalle donde
 * vea de qué pagaron, cuántos usuarios y por dónde el pago; tal cual como es
 * facturas». Arriba las cuatro cifras; a la izquierda QUÉ se cobró (líneas y
 * periodo); a la derecha POR DÓNDE se pagó (pasarela, tarjeta sellada al
 * cobrar, fecha, referencia en SU pasarela, intentos) y A QUIÉN.
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
const PASARELA: Record<string, string> = {
  stripe: "Stripe", mercadopago: "Mercado Pago", kushki: "Kushki", tilopay: "Tilopay",
  payphone: "Payphone", paguelofacil: "PagueloFacil",
};
const MARCA: Record<string, string> = {
  visa: "Visa", mastercard: "Mastercard", amex: "American Express", discover: "Discover",
  diners: "Diners Club", jcb: "JCB", unionpay: "UnionPay",
};

/** «2026-09-03» → fecha corta del idioma, sin que la zona la mueva de día. */
const dia = (iso: string) => fechaCorta(`${iso}T12:00:00`);

export function FacturaDeCliente() {
  const { invoiceId = "" } = useParams();
  const t = useT();
  const [f, setF] = useState<DetalleDeFacturaACliente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bajando, setBajando] = useState(false);
  const [falloPdf, setFalloPdf] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setF(await cobroAEmpresasService.factura(invoiceId));
    } catch (e: any) {
      setError(e?.message || t("facturaCliente.noCargo"));
    } finally {
      setCargando(false);
    }
  }, [invoiceId, t]);
  useEffect(() => { void cargar(); }, [cargar]);

  const descargar = async () => {
    if (!f) return;
    setBajando(true);
    setFalloPdf(null);
    try {
      await cobroAEmpresasService.descargarFactura(f.id, f.folio);
    } catch (e: any) {
      setFalloPdf(e?.message || t("ingresos.noDescargo"));
    } finally {
      setBajando(false);
    }
  };

  const copiar = async (v: string) => {
    try { await navigator.clipboard.writeText(v); setCopiado(true); setTimeout(() => setCopiado(false), 1500); } catch { /* nada */ }
  };

  const est = f ? ESTADO[f.status] : null;
  const pagada = f?.status === "paid";
  const saldo = f ? f.totalCents - f.amountPaidCents : 0;
  const tarjeta = f?.payment.cardLast4
    ? `${MARCA[String(f.payment.cardBrand || "").toLowerCase()] || f.payment.cardBrand || t("facturaCliente.tarjeta")} ···· ${f.payment.cardLast4}`
    : null;

  return (
    <div>
      <Link to="/revenue" className="miga">
        <Icono nombre="flecha" tamano={14} className="miga__icono" />
        {t("nav.ingresos")}
      </Link>

      <header className="cabecera factura-cliente__cabecera">
        <div>
          <h1 className="cabecera__titulo factura-cliente__titulo">
            {t("facturaCliente.titulo", { n: f?.folio ?? "…" })}
            {est && <Pildora tono={est.tono}>{t(est.texto)}</Pildora>}
          </h1>
          {f && (
            <p className="cabecera__sub">
              {f.company.name || t("empresas.sinNombre")} · {CONCEPTO[f.kind] ? t(CONCEPTO[f.kind]) : f.kind}
            </p>
          )}
        </div>
        {f && (
          <div className="cabecera__acciones">
            <Link to={`/companies/${f.company.id}`} className="btn btn--fantasma">
              {t("ingresos.verEmpresa")} <Icono nombre="flecha" tamano={14} />
            </Link>
            <Boton variante="suave" cargando={bajando} onClick={descargar}>{t("ingresos.descargarPdf")}</Boton>
          </div>
        )}
      </header>
      {falloPdf && <p role="alert" className="ingresos__fallo">{falloPdf}</p>}

      <EstadoDeDatos cargando={cargando} error={error} onReintentar={cargar}>
        {f && (
          <div className="facturacion">
            <div className="resumen factura-cliente__resumen">
              <section className="saldo-ficha">
                <span className="saldo-ficha__etiqueta">{t("ingresos.total")}</span>
                <span className="saldo-ficha__valor">{precio(f.totalCents, f.currency)}</span>
                <span className="saldo-ficha__nota">{t("facturaCliente.emitida", { f: fechaCorta(f.issuedAt) })}</span>
              </section>
              <section className={`saldo-ficha${!pagada && saldo > 0 ? " saldo-ficha--aviso" : ""}`}>
                <span className="saldo-ficha__etiqueta">{t(pagada ? "ingresos.pagado" : "ingresos.saldo")}</span>
                <span className="saldo-ficha__valor">{precio(pagada ? f.amountPaidCents : saldo, f.currency)}</span>
                <span className="saldo-ficha__nota">
                  {pagada ? t("facturaCliente.pagadaEl", { f: fechaCorta(f.paidAt) }) : f.dueAt ? t("facturaCliente.venceEl", { f: fechaCorta(f.dueAt) }) : ""}
                </span>
              </section>
              <section className="saldo-ficha">
                <span className="saldo-ficha__etiqueta">{t("facturaCliente.usuarios")}</span>
                <span className="saldo-ficha__valor">{f.users}</span>
                <span className="saldo-ficha__nota">
                  {f.period ? t("facturaCliente.periodo", { a: dia(f.period.desde), b: dia(f.period.hasta) }) : t("facturaCliente.sinPeriodo")}
                </span>
              </section>
              <section className="saldo-ficha">
                <span className="saldo-ficha__etiqueta">{t("facturaCliente.metodo")}</span>
                <span className="saldo-ficha__valor factura-cliente__valor-texto">
                  {tarjeta || (f.payment.provider ? PASARELA[f.payment.provider] || f.payment.provider : "—")}
                </span>
                <span className="saldo-ficha__nota">
                  {f.payment.provider ? PASARELA[f.payment.provider] || f.payment.provider : ""}
                  {f.payment.mode === "test" ? ` · ${t("facturaCliente.modoPrueba")}` : ""}
                </span>
              </section>
            </div>

            <div className="factura-cliente__cuerpo">
              {/* ── QUÉ SE COBRÓ ─────────────────────────────────────────── */}
              <section className="bloque" aria-labelledby="factura-lineas">
                <header className="bloque__cabecera">
                  <h2 id="factura-lineas" className="bloque__titulo">{t("facturaCliente.queSeCobro")}</h2>
                </header>
                <div className="factura-cliente__tabla" role="table" aria-label={t("facturaCliente.queSeCobro")}>
                  <div className="factura-cliente__fila factura-cliente__fila--cabecera" role="row">
                    <span role="columnheader">{t("facturaCliente.concepto")}</span>
                    <span role="columnheader" className="facturas__derecha">{t("facturaCliente.cantidad")}</span>
                    <span role="columnheader" className="facturas__derecha">{t("facturaCliente.precio")}</span>
                    <span role="columnheader" className="facturas__derecha">{t("ingresos.colImporte")}</span>
                  </div>
                  {f.lines.map((l, i) => (
                    <div key={i} className="factura-cliente__fila" role="row">
                      <span role="cell" className="factura-cliente__concepto">
                        <strong>{l.kind && LINEA[l.kind] ? t(LINEA[l.kind]) : (l.description || "—")}</strong>
                        {l.description && l.kind && LINEA[l.kind] && l.description !== t(LINEA[l.kind]) && (
                          <span>{l.description}</span>
                        )}
                      </span>
                      <span role="cell" className="facturas__derecha">{l.quantity}</span>
                      <span role="cell" className="facturas__derecha">{dinero(l.unitAmountCents, f.currency)}</span>
                      <span role="cell" className="facturas__derecha facturas__importe">{dinero(l.amountCents, f.currency)}</span>
                    </div>
                  ))}
                </div>
                <div className="totales factura-cliente__totales">
                  <div className="totales__fila totales__fila--fuerte">
                    <span>{t("ingresos.total")}</span>
                    <span>{dinero(f.totalCents, f.currency)}</span>
                  </div>
                  <div className="totales__fila">
                    <span>{t("ingresos.pagado")}</span>
                    <span>{dinero(f.amountPaidCents, f.currency)}</span>
                  </div>
                  {!pagada && saldo > 0 && (
                    <div className="totales__fila">
                      <span>{t("ingresos.saldo")}</span>
                      <span>{dinero(saldo, f.currency)}</span>
                    </div>
                  )}
                  {f.refundedCents > 0 && (
                    <div className="totales__fila">
                      <span>{t("ingresos.reembolsado")}</span>
                      <span>{dinero(f.refundedCents, f.currency)}</span>
                    </div>
                  )}
                </div>
              </section>

              <div className="factura-cliente__lateral">
                {/* ── POR DÓNDE SE PAGÓ ──────────────────────────────────── */}
                <section className="bloque" aria-labelledby="factura-pago">
                  <header className="bloque__cabecera">
                    <h2 id="factura-pago" className="bloque__titulo">{t("facturaCliente.pago")}</h2>
                  </header>
                  <dl className="factura-cliente__datos">
                    <div><dt>{t("ingresos.colEstado")}</dt><dd>{est ? t(est.texto) : f.status}</dd></div>
                    <div>
                      <dt>{t(pagada ? "facturaCliente.fechaDePago" : "facturaCliente.vence")}</dt>
                      <dd>{pagada ? fechaCorta(f.paidAt) : fechaCorta(f.dueAt)}</dd>
                    </div>
                    <div><dt>{t("facturaCliente.tarjeta")}</dt><dd>{tarjeta || "—"}</dd></div>
                    <div>
                      <dt>{t("facturaCliente.pasarela")}</dt>
                      <dd>
                        {f.payment.provider ? PASARELA[f.payment.provider] || f.payment.provider : "—"}
                        {f.payment.accountLabel ? ` · ${f.payment.accountLabel}` : ""}
                        {f.payment.mode ? ` · ${t(f.payment.mode === "live" ? "facturaCliente.modoReal" : "facturaCliente.modoPrueba")}` : ""}
                      </dd>
                    </div>
                    {f.payment.reference && (
                      <div>
                        <dt>{t("facturaCliente.referencia")}</dt>
                        <dd>
                          <button type="button" className="factura-cliente__ref" onClick={() => copiar(f.payment.reference!)} title={t("comun.copiar")}>
                            {f.payment.reference}
                            <Icono nombre={copiado ? "visto" : "copiar"} tamano={13} />
                          </button>
                        </dd>
                      </div>
                    )}
                    <div><dt>{t("facturaCliente.intentos")}</dt><dd>{f.payment.attempts || (pagada ? 1 : 0)}</dd></div>
                  </dl>
                  {f.payment.lastError && (
                    <p className="ingresos__fallo factura-cliente__fallo">{t("ingresos.ultimoFallo", { m: f.payment.lastError })}</p>
                  )}
                  {f.disputeStatus && (
                    <p className="ingresos__fallo factura-cliente__fallo">{t("facturaCliente.disputa", { e: f.disputeStatus })}</p>
                  )}
                  {f.payment.reference && <p className="factura-cliente__nota">{t("facturaCliente.referenciaNota")}</p>}
                </section>

                {/* ── A QUIÉN ────────────────────────────────────────────── */}
                <section className="bloque" aria-labelledby="factura-cliente">
                  <header className="bloque__cabecera">
                    <h2 id="factura-cliente" className="bloque__titulo">{t("facturaCliente.facturadaA")}</h2>
                  </header>
                  <dl className="factura-cliente__datos">
                    <div><dt>{t("altaEmpresa.razonSocial")}</dt><dd>{f.company.legalName || f.company.name || "—"}</dd></div>
                    <div><dt>{t("altaEmpresa.ruc")}</dt><dd>{f.company.taxNumber || "—"}</dd></div>
                    <div><dt>{t("altaEmpresa.correo")}</dt><dd>{f.company.email || "—"}</dd></div>
                    <div><dt>{t("altaEmpresa.direccion")}</dt><dd>{f.company.address || "—"}</dd></div>
                  </dl>
                </section>
              </div>
            </div>
          </div>
        )}
      </EstadoDeDatos>
    </div>
  );
}

export default FacturaDeCliente;
