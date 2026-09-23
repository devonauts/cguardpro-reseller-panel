import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Cifra, Cifras, EstadoDeDatos, Lista, ListaFila, Pildora, Tarjeta,
  TarjetaCabecera, TodaviaNo, type Tono,
} from "@/components/cristal";
import {
  billingService,
  type FacturaDetallada, type FacturaEnLista, type LineaDeFactura,
  type PlanDeCobro, type TotalPorMoneda,
} from "@/services/resellerService";
import { ComoTeCobramos } from "./ComoTeCobramos";
import { TarjetaEnArchivo } from "@/components/panel/Tarjeta";
import { EVENTO_PAGO, PagarFactura } from "@/components/panel/Pago";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
/* El formateador de dinero es el de `lib/dinero`, no uno propio.
   Esta pantalla tenía el suyo y escribía la coma decimal A MANO, así que en
   inglés pintaba «833,80 USD» — el formato castellano dentro de una pantalla
   inglesa, y sin separador de miles. El compartido saca los separadores del
   idioma elegido, que es justo lo que hace falta aquí. */
import { dinero, fechaCorta, mesDelPeriodo } from "@/lib/dinero";
import "./Billing.scss";

/**
 * Lo que CGuardPro le cobra al socio.
 *
 * ── SÓLO LECTURA, Y NO POR JERARQUÍA ──────────────────────────────────────
 * Aquí no hay ni un botón que cambie una cifra. Una factura es una reclamación
 * de una parte sobre la otra, y la parte a la que se le reclama no puede
 * editarla: si pudiera, el documento no serviría de respaldo para ninguna de las
 * dos. Lo que sí hay es todo el detalle — de dónde sale cada importe y sobre qué
 * recuento se calculó— para que no haga falta fiarse de nadie.
 *
 * ── CONSUMO Y FACTURACIÓN CONTESTAN PREGUNTAS DISTINTAS ───────────────────
 * Consumo: «¿cuántos usuarios se contaron y por qué ésos?». Facturación: «¿qué
 * me cobraron por eso?». Se enlazan pero no se mezclan, y aquí no se vuelve a
 * contar nada: cada línea de regalías enseña el recuento CONGELADO del que
 * salió.
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
  const [facturas, setFacturas] = useState<FacturaEnLista[]>([]);
  const [plan, setPlan] = useState<PlanDeCobro | null>(null);
  const [totales, setTotales] = useState<TotalPorMoneda[]>([]);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<FacturaDetallada | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      /* El plan no puede tumbar la pantalla: si falla, las facturas siguen. */
      const [r, p] = await Promise.all([
        billingService.list({ limit: 24 }),
        billingService.plan().catch(() => null),
      ]);
      setPlan(p);
      setFacturas(r.invoices ?? []);
      setTotales(r.totalsByCurrency ?? []);
      setAbierta(r.invoices?.[0]?.id ?? null);
    } catch (e: any) {
      setError(e?.message || t("facturacion.noCargo"));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => { cargar(); }, [cargar]);

  /* Pagar desde el aviso de arriba cambia esta pantalla: totales, estado de la
     factura. Se recarga en vez de parchear a mano lo que el servidor ya sabe. */
  const [version, setVersion] = useState(0);
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

  return (
    <>
      <header className="cabecera">
        <div>
          <h1 className="cabecera__titulo">{t("facturacion.titulo")}</h1>
          <p className="cabecera__sub">{t("facturacion.sub")}</p>
        </div>
      </header>

      <div className="facturacion">
        {/* De arriba abajo: cómo te cobramos → cómo va este mes → cuándo se
            cobra → con qué tarjeta → las facturas. Lo primero contesta el
            «¿por qué?» que la lista de facturas sola no contestaba. */}
        {plan && <ComoTeCobramos plan={plan} />}

        {/* ── LA TARJETA, FUERA DEL ESTADO DE DATOS ──────────────────────
            Tiene sentido aunque todavía NO haya facturas: un socio recién dado
            de alta es el que más falta le hace dejarla puesta. */}
        <TarjetaEnArchivo />

        <section className="facturacion__facturas" aria-labelledby="tus-facturas">
          <h2 id="tus-facturas" className="facturacion__titulo">{t("facturacion.tusFacturas")}</h2>
          <EstadoDeDatos
            cargando={cargando}
            error={error}
            vacio={!cargando && facturas.length === 0}
            etiquetaVacio={t("facturacion.vacio")}
            onReintentar={cargar}
          >
            <div className="facturacion__lista">
              {totales.map((x) => (
                <Cifras key={x.currency}>
                  <Cifra
                    etiqueta={t("facturacion.facturado", { m: x.currency })}
                    valor={dinero(x.billedCents, x.currency)}
                    nota={t(
                      x.invoiceCount === 1 ? "facturacion.facturaUna" : "facturacion.facturasVarias",
                      { n: x.invoiceCount },
                    )}
                  />
                  <Cifra
                    etiqueta={t("facturacion.cobrado", { m: x.currency })}
                    valor={dinero(x.paidCents, x.currency)}
                  />
                  <Cifra
                    etiqueta={t("facturacion.pendiente", { m: x.currency })}
                    valor={dinero(x.outstandingCents, x.currency)}
                  />
                </Cifras>
              ))}

              {totales.length > 1 && (
                <p className="facturacion__nota">{t("facturacion.variasMonedas")}</p>
              )}

              <Lista como="nav" aria-label={t("facturacion.tusFacturas")}>
                {facturas.map((f) => (
                  <ListaFila
                    key={f.id}
                    como="button"
                    type="button"
                    className={`factura-fila${f.id === abierta ? " factura-fila--abierta" : ""}`}
                    onClick={() => setAbierta(f.id)}
                    aria-current={f.id === abierta}
                  >
                    <span className="factura-fila__numero">{f.number}</span>
                    <span className="factura-fila__periodo">{mesDelPeriodo(f.periodLabel)}</span>
                    <span className="factura-fila__total">{dinero(f.totalCents, f.currency)}</span>
                    <Pildora tono={ESTADO[f.status]?.tono ?? "neutro"}>
                      {ESTADO[f.status] ? t(ESTADO[f.status].texto) : f.status}
                    </Pildora>
                  </ListaFila>
                ))}
              </Lista>

              {detalle && (
                <Detalle
                  factura={detalle}
                  onPagada={() => window.dispatchEvent(new CustomEvent(EVENTO_PAGO))}
                />
              )}
            </div>
          </EstadoDeDatos>
        </section>
      </div>
    </>
  );
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
    <Tarjeta>
      <TarjetaCabecera
        titulo={factura.number}
        nota={
          <>
            {mesDelPeriodo(factura.period?.label)}
            {factura.contract
              && ` · ${t("facturacion.detalleContrato", { v: factura.contract.version })}`}
            {factura.finalizedAt
              && ` · ${t("facturacion.detalleEmitida", {
                f: fechaCorta(factura.issuedAt ?? factura.finalizedAt),
              })}`}
            {factura.dueAt
              && ` · ${t("facturacion.detalleVence", { f: fechaCorta(factura.dueAt) })}`}
          </>
        }
      />

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
      {pagable && puede("reseller.billing.manage") && (
        <div className="factura__pagar">
          <PagarFactura
            invoiceId={factura.id}
            saldoCents={saldo}
            currency={factura.currency}
            tieneTarjeta={false}
            onPagada={onPagada}
          />
        </div>
      )}

      {factura.immutable ? (
        <div className="factura__acciones">
          {/* Un enlace normal a una ruta que responde con el PDF. Ni descarga
              por JavaScript ni blob en memoria: el navegador ya sabe hacer esto,
              y por aquí la sesión viaja como en cualquier otra petición. */}
          <a className="btn btn--suave" href={billingService.pdfUrl(factura.id)} target="_blank" rel="noreferrer">
            {t("facturacion.descargarPdf")}
          </a>
        </div>
      ) : (
        <TodaviaNo>{t("facturacion.borradorPdf")}</TodaviaNo>
      )}
    </Tarjeta>
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
