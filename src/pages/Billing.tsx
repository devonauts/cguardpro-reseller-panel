import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  EstadoDeDatos, Icono, Pildora, TodaviaNo, type Tono,
} from "@/components/cristal";
import {
  activacionService, billingService, contratoService,
  type FacturaDetallada, type FacturaEnLista, type LineaDeFactura,
  type PlanDeCobro, type TarjetaDelSocio,
} from "@/services/resellerService";
import { TarjetaEnArchivo } from "@/components/panel/Tarjeta";
import { EVENTO_PAGO, PagarFactura } from "@/components/panel/Pago";
import { DescargarPdf } from "@/components/panel/DescargarPdf";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
/* El formateador de dinero es el de `lib/dinero`, no uno propio: saca los
   separadores del idioma elegido. `precio` es la versión corta para leer de
   un vistazo («$1,500»); `dinero` la exacta, para las líneas de factura. */
import { dinero, fechaCorta, mesDelPeriodo, precio } from "@/lib/dinero";
import { TuPlan, EsteMes, EsteCiclo, ComoFunciona } from "./ComoTeCobramos";
import "./Billing.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * FACTURACIÓN — LO QUE EL SOCIO NECESITA SABER, EN EL ORDEN EN QUE LO PREGUNTA
 *
 *   1. ¿Debo algo? ¿Cuánto me van a cobrar y cuándo? ¿Con qué tarjeta?
 *      → tres fichas arriba del todo, con el botón para pagar.
 *   2. ¿Por qué? → «Tu plan»: los tres conceptos del contrato en una tabla.
 *   3. ¿Cómo va este mes? → el recibo estimado y los usuarios por empresa.
 *   4. Las facturas, en una tabla; el detalle se abre en la fila.
 *   5. Cómo funciona el ciclo, plegado: está para quien lo busque.
 *
 * ── SÓLO LECTURA, SALVO PAGAR ─────────────────────────────────────────────
 * Aquí no hay ni un botón que cambie una cifra. Una factura es una reclamación
 * de una parte sobre la otra, y la parte a la que se le reclama no puede
 * editarla. Lo que sí puede es PAGARLA: el importe lo pone el servidor.
 * ════════════════════════════════════════════════════════════════════════════
 */

const ESTADO: Record<string, { texto: Clave; tono: Tono }> = {
  draft: { texto: "facturacion.estadoDraft", tono: "neutro" },
  open: { texto: "facturacion.estadoOpen", tono: "aviso" },
  paid: { texto: "facturacion.estadoPaid", tono: "ok" },
  void: { texto: "facturacion.estadoVoid", tono: "peligro" },
  uncollectible: { texto: "facturacion.estadoUncollectible", tono: "peligro" },
};

const CLASE: Record<string, Clave> = {
  setup_fee: "facturacion.claseSetupFee",
  monthly_subscription: "facturacion.claseMonthlySubscription",
  royalty: "facturacion.claseRoyalty",
  adjustment: "facturacion.claseAdjustment",
  credit: "facturacion.claseCredit",
  tax: "facturacion.claseTax",
};

const MOTIVO: Record<string, Clave> = {
  invited: "facturacion.motivoInvited",
  pending: "facturacion.motivoPending",
  archived: "facturacion.motivoArchived",
  deletedMembership: "facturacion.motivoDeletedMembership",
  orphanUser: "facturacion.motivoOrphanUser",
  demoSeed: "facturacion.motivoDemoSeed",
  policy: "facturacion.motivoPolicy",
};

export function Billing() {
  const t = useT();
  const { puede } = useResellerAuth();
  const [facturas, setFacturas] = useState<FacturaEnLista[]>([]);
  const [plan, setPlan] = useState<PlanDeCobro | null>(null);
  const [tarjeta, setTarjeta] = useState<TarjetaDelSocio | null>(null);
  const [gestionarTarjeta, setGestionarTarjeta] = useState(false);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<FacturaDetallada | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [contratoFirmado, setContratoFirmado] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      /* El plan y la tarjeta no pueden tumbar la pantalla: si fallan, las
         facturas siguen. */
      const [r, p, c] = await Promise.all([
        billingService.list({ limit: 24 }),
        billingService.plan().catch(() => null),
        billingService.tarjeta().catch(() => null),
      ]);
      activacionService.estado()
        .then((a) => setContratoFirmado(!!a?.agreementSigned))
        .catch(() => setContratoFirmado(false));
      setFacturas(r.invoices ?? []);
      setPlan(p);
      setTarjeta(c?.card ?? null);
    } catch (e: any) {
      setError(e?.message || t("facturacion.noCargo"));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    const alPagar = () => { cargar(); setVersion((v) => v + 1); };
    window.addEventListener(EVENTO_PAGO, alPagar);
    return () => window.removeEventListener(EVENTO_PAGO, alPagar);
  }, [cargar]);

  useEffect(() => {
    let vivo = true;
    if (!abierta) { setDetalle(null); return; }
    billingService.detail(abierta)
      .then((d) => { if (vivo) setDetalle(d); })
      .catch(() => { if (vivo) setDetalle(null); });
    return () => { vivo = false; };
  }, [abierta, version]);

  const pagadaDesdeAqui = () => window.dispatchEvent(new CustomEvent(EVENTO_PAGO));

  /* Lo que se debe: facturas cerradas con saldo, la más antigua primero. */
  const debidas = facturas
    .filter((f) => (f.status === "open" || f.status === "sent") && f.totalCents > f.amountPaidCents)
    .sort((a, b) => String(a.dueAt ?? "").localeCompare(String(b.dueAt ?? "")));
  const moneda = plan?.contract?.currency ?? facturas[0]?.currency ?? "USD";
  const debe = debidas.reduce((n, f) => n + f.totalCents - f.amountPaidCents, 0);
  const primera = debidas[0];
  const vencida = !!primera?.dueAt && new Date(primera.dueAt).getTime() < Date.now();
  const mes = plan?.currentMonth ?? null;
  const ciclo = plan?.cycle ?? null;

  return (
    <>
      <header className="cabecera">
        <div>
          <h1 className="cabecera__titulo">{t("facturacion.titulo")}</h1>
          <p className="cabecera__sub">{t("facturacion.sub")}</p>
        </div>
      </header>

      <EstadoDeDatos cargando={cargando} error={error} onReintentar={cargar}>
        <div className="facturacion">
          {/* ── 1. EL RESUMEN ─────────────────────────────────────────── */}
          <div className="resumen">
            <section className={`saldo-ficha${debe > 0 ? (vencida ? " saldo-ficha--peligro" : " saldo-ficha--aviso") : ""}`}>
              <span className="saldo-ficha__etiqueta">{t("facturacion.saldoPendiente")}</span>
              <span className="saldo-ficha__valor">{precio(debe, moneda)}</span>
              {debe > 0 && primera ? (
                <>
                  <span className="saldo-ficha__nota">
                    {t(vencida ? "facturacion.saldoVencida" : "facturacion.saldoVence", {
                      n: primera.number, f: fechaCorta(primera.dueAt),
                    })}
                  </span>
                  {puede("reseller.billing.manage") && (
                    <div className="saldo-ficha__accion">
                      <PagarFactura
                        key={primera.id}
                        invoiceId={primera.id}
                        saldoCents={primera.totalCents - primera.amountPaidCents}
                        currency={primera.currency}
                        tieneTarjeta={!!tarjeta?.hasCard}
                        onPagada={pagadaDesdeAqui}
                      />
                    </div>
                  )}
                </>
              ) : (
                <span className="saldo-ficha__nota saldo-ficha__nota--ok">
                  <Icono nombre="visto" tamano={14} />{t("facturacion.alDia")}
                </span>
              )}
            </section>

            <section className="saldo-ficha">
              <span className="saldo-ficha__etiqueta">
                {t(ciclo ? "facturacion.proximaRenovacion" : "facturacion.proximoCobro")}
              </span>
              <span className="saldo-ficha__valor">
                {ciclo ? precio(ciclo.renewal.totalCents, moneda) : mes ? precio(mes.totalCents, moneda) : "—"}
              </span>
              {ciclo && (
                <span className="saldo-ficha__nota">
                  {t("facturacion.proximaRenovacionNota", {
                    f: fechaCorta(`${ciclo.end}T12:00:00`), n: ciclo.seatsNow,
                  })}
                </span>
              )}
              {!ciclo && mes && (
                <span className="saldo-ficha__nota">
                  {t("facturacion.proximoCobroNota", {
                    f: fechaCorta(`${mes.closesOn}T12:00:00`), n: mes.seats,
                  })}
                </span>
              )}
            </section>

            <section className="saldo-ficha">
              <span className="saldo-ficha__etiqueta">{t("facturacion.metodoDePago")}</span>
              {tarjeta?.hasCard ? (
                <>
                  <span className="saldo-ficha__valor saldo-ficha__valor--tarjeta">
                    <Icono nombre="tarjeta" tamano={20} />
                    {`${marcaDeTarjeta(tarjeta.brand)} ···· ${tarjeta.last4}`}
                  </span>
                  <span className="saldo-ficha__nota">
                    {t("facturacion.tarjetaCaduca", {
                      m: String(tarjeta.expMonth ?? "").padStart(2, "0"), a: String(tarjeta.expYear ?? ""),
                    })}
                  </span>
                </>
              ) : (
                <>
                  <span className="saldo-ficha__valor saldo-ficha__valor--vacio">{t("facturacion.sinTarjeta")}</span>
                  <span className="saldo-ficha__nota">{t("facturacion.sinTarjetaNota")}</span>
                </>
              )}
              <button
                type="button"
                className="saldo-ficha__enlace"
                aria-expanded={gestionarTarjeta}
                onClick={() => setGestionarTarjeta((v) => !v)}
              >
                {t(tarjeta?.hasCard ? "facturacion.cambiarTarjeta" : "facturacion.anadirTarjeta")}
                <Icono nombre="flecha" tamano={14} />
              </button>
            </section>
          </div>

          {gestionarTarjeta && <TarjetaEnArchivo />}

          {/* ── 2 y 3. EL PLAN Y EL MES ───────────────────────────────── */}
          {plan && <TuPlan plan={plan} />}

          {contratoFirmado && (
            <section className="bloque" aria-labelledby="tu-contrato">
              <header className="bloque__cabecera">
                <h2 id="tu-contrato" className="bloque__titulo">{t("facturacion.tuContrato")}</h2>
              </header>
              <p className="bloque__vacio">{t("facturacion.tuContratoTexto")}</p>
              <DescargarPdf descargar={contratoService.descargarPdf} etiqueta={t("firma.descargarPdf")} />
            </section>
          )}
          {plan?.contract && ciclo && <EsteCiclo plan={plan} />}
          {plan?.contract && !ciclo && mes && <EsteMes plan={plan} />}

          {/* ── 4. LAS FACTURAS ───────────────────────────────────────── */}
          <section className="bloque" aria-labelledby="tus-facturas">
            <header className="bloque__cabecera">
              <h2 id="tus-facturas" className="bloque__titulo">{t("facturacion.tusFacturas")}</h2>
            </header>
            {facturas.length === 0 ? (
              <p className="bloque__vacio">{t("facturacion.vacio")}</p>
            ) : (
              <div className="facturas" role="table" aria-label={t("facturacion.tusFacturas")}>
                <div className="facturas__fila facturas__fila--cabecera" role="row">
                  <span role="columnheader">{t("facturacion.colNumero")}</span>
                  <span role="columnheader">{t("facturacion.colPeriodo")}</span>
                  <span role="columnheader">{t("facturacion.colVence")}</span>
                  <span role="columnheader" className="facturas__derecha">{t("facturacion.colImporte")}</span>
                  <span role="columnheader" className="facturas__derecha">{t("facturacion.colEstado")}</span>
                </div>
                {facturas.map((f) => (
                  <div key={f.id} className="facturas__grupo">
                    <button
                      type="button"
                      role="row"
                      className={`facturas__fila${f.id === abierta ? " facturas__fila--abierta" : ""}`}
                      aria-expanded={f.id === abierta}
                      onClick={() => setAbierta((a) => (a === f.id ? null : f.id))}
                    >
                      <span role="cell" className="facturas__numero">{f.number}</span>
                      <span role="cell">{mesDelPeriodo(f.periodLabel)}</span>
                      <span role="cell">{fechaCorta(f.dueAt)}</span>
                      <span role="cell" className="facturas__derecha facturas__importe">
                        {dinero(f.totalCents, f.currency)}
                      </span>
                      <span role="cell" className="facturas__derecha">
                        <Pildora tono={ESTADO[f.status]?.tono ?? "neutro"}>
                          {ESTADO[f.status] ? t(ESTADO[f.status].texto) : f.status}
                        </Pildora>
                      </span>
                    </button>
                    {f.id === abierta && detalle?.id === f.id && (
                      <Detalle factura={detalle} onPagada={pagadaDesdeAqui} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── 5. CÓMO FUNCIONA ──────────────────────────────────────── */}
          {plan?.contract && <ComoFunciona plan={plan} />}
        </div>
      </EstadoDeDatos>
    </>
  );
}

/** Una marca conocida se enseña con su nombre propio; el resto, tal cual. */
function marcaDeTarjeta(marca: string | null): string {
  const MARCAS: Record<string, string> = {
    visa: "Visa", mastercard: "Mastercard", amex: "American Express", discover: "Discover",
  };
  return marca ? (MARCAS[marca] ?? marca) : "";
}

function Detalle({
  factura, onPagada,
}: { factura: FacturaDetallada; onPagada: () => void }) {
  const t = useT();
  const { puede } = useResellerAuth();
  const saldo = factura.totalCents - factura.amountPaidCents;
  const pagable = (factura.status === "open" || factura.status === "sent") && saldo > 0;
  const base = factura.lines.filter((l) => !l.isAdjustment);
  const ajustes = factura.lines.filter((l) => l.isAdjustment);

  return (
    <div className="facturas__detalle">
      {/* El número ya está en la fila: aquí sólo lo que la fila no dice. */}
      <p className="facturas__meta">
        {[
          factura.contract && t("facturacion.detalleContrato", { v: factura.contract.version }),
          factura.finalizedAt && t("facturacion.detalleEmitida", {
            f: fechaCorta(factura.issuedAt ?? factura.finalizedAt),
          }),
          factura.dueAt && t("facturacion.detalleVence", { f: fechaCorta(factura.dueAt) }),
        ].filter(Boolean).join(" · ")}
      </p>

      {factura.status === "void" && (
        <p className="factura__anulada">{t("facturacion.anulada")}</p>
      )}

      <ul className="lineas">
        {[...base, ...ajustes].map((l) => (
          <li key={l.id} className="linea">
            <div className="linea__texto">
              <span className="linea__concepto">
                {CLASE[l.kind] ? t(CLASE[l.kind]) : l.kind}
                {l.tenantNameAtSnapshot && ` · ${l.tenantNameAtSnapshot}`}
              </span>
              {l.kind === "royalty" && (
                <span className="linea__detalle">
                  {t("facturacion.usuariosPor", {
                    n: l.quantity, p: dinero(l.unitAmountCents, factura.currency),
                  })}
                </span>
              )}
              {l.isAdjustment && l.description && (
                <span className="linea__detalle">{l.description}</span>
              )}
              {l.kind === "royalty" && <DeDondeSale linea={l} />}
            </div>
            <span className={`linea__importe${l.amountCents < 0 ? " linea__importe--credito" : ""}`}>
              {dinero(l.amountCents, factura.currency)}
            </span>
          </li>
        ))}
      </ul>

      <div className="totales">
        <div className="totales__fila">
          <span>{t("facturacion.subtotal")}</span>
          <span>{dinero(factura.subtotalCents, factura.currency)}</span>
        </div>
        {factura.adjustmentsCents !== 0 && (
          <div className="totales__fila">
            <span>{t("facturacion.ajustes")}</span>
            <span>{dinero(factura.adjustmentsCents, factura.currency)}</span>
          </div>
        )}
        <div className="totales__fila totales__fila--fuerte">
          <span>{t("facturacion.total")}</span>
          <span>{dinero(factura.totalCents, factura.currency)}</span>
        </div>
        {factura.amountPaidCents > 0 && (
          <div className="totales__fila">
            <span>{t("facturacion.cobradoSimple")}</span>
            <span>{dinero(factura.amountPaidCents, factura.currency)}</span>
          </div>
        )}
      </div>

      {/* Pagar, en la propia factura. El importe es el saldo que calculó el
          servidor; el botón no decide ninguna cifra. */}
      <div className="facturas__acciones">
        {/* Pagar, en la propia factura. El importe es el saldo que calculó el
            servidor; el botón no decide ninguna cifra. */}
        {pagable && puede("reseller.billing.manage") && (
          <PagarFactura
            invoiceId={factura.id}
            saldoCents={saldo}
            currency={factura.currency}
            tieneTarjeta={false}
            onPagada={onPagada}
          />
        )}
        {factura.immutable ? (
          /* Fetched with the session: a bare link reached the route without
             the Bearer header and got 403. */
          <DescargarPdf
            descargar={() => billingService.descargarPdf(factura.id, factura.number)}
            etiqueta={t("facturacion.descargarPdf")}
          />
        ) : (
          <TodaviaNo>{t("facturacion.borradorPdf")}</TodaviaNo>
        )}
      </div>
    </div>
  );
}

/** De la línea al recuento: la resta entera, sin volver a contar nada. */
function DeDondeSale({ linea }: { linea: LineaDeFactura }) {
  const t = useT();
  const motivos = Object.entries(linea.excluded ?? {}).filter(([, n]) => n > 0);
  if (linea.sourceMemberships === null && !motivos.length) return null;

  return (
    <span className="linea__origen">
      {linea.sourceMemberships !== null && (
        <>
          {linea.sourceMemberships} {t("facturacion.cuentasEnLaEmpresa")}{" "}
          <strong>{linea.quantity}</strong> {t("facturacion.contabilizadas")}
        </>
      )}
      {motivos.length > 0 && (
        <>
          {" "}({motivos.map(([k, n]) => `${n} ${MOTIVO[k] ? t(MOTIVO[k]) : k}`).join(", ")})
        </>
      )}
      {" · "}
      <Link to="/usage">{t("facturacion.verDetalle")}</Link>
    </span>
  );
}

export default Billing;
