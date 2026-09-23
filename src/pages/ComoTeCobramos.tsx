import { useState } from "react";
import { Link } from "react-router-dom";

import { Icono, Pildora, type NombreDeIcono, type Tono } from "@/components/cristal";
import { fechaCorta, mesDelPeriodo, precio } from "@/lib/dinero";
import type { PlanDeCobro } from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * TU PLAN · ESTE MES · CÓMO FUNCIONA
 *
 * Todas las cifras vienen del servidor (`/billing/plan`), calculadas con las
 * mismas reglas que la factura. Aquí sólo se cuentan — y cortas: el socio
 * quiere leer números, no párrafos. La explicación larga vive plegada al final.
 * ════════════════════════════════════════════════════════════════════════════
 */

/** Una fecha sin hora (`2026-10-01`) se lee a mediodía: a medianoche UTC, en
    América caería en el día anterior y el «1 de octubre» saldría «30 sept». */
const dia = (iso: string) => fechaCorta(`${iso}T12:00:00`);

const ALTA: Record<PlanDeCobro["setupFee"]["status"], { tono: Tono; texto: Clave }> = {
  pagada: { tono: "ok", texto: "cobro.altaPagada" },
  facturada: { tono: "aviso", texto: "cobro.altaFacturada" },
  proxima: { tono: "neutro", texto: "cobro.altaProxima" },
  perdonada: { tono: "ok", texto: "cobro.altaPerdonada" },
  sin_cuota: { tono: "neutro", texto: "cobro.altaSinCuota" },
};

/* ── TU PLAN ─────────────────────────────────────────────────────────────── */

export function TuPlan({ plan }: { plan: PlanDeCobro }) {
  const t = useT();
  const c = plan.contract;

  if (!c) {
    return (
      <section className="bloque">
        <header className="bloque__cabecera">
          <h2 className="bloque__titulo">{t("cobro.titulo")}</h2>
        </header>
        <p className="bloque__vacio">{t("cobro.sinContrato")}</p>
      </section>
    );
  }

  const m = plan.currentMonth;
  const ciclo = plan.cycle ?? null;
  const $ = (cents: number) => precio(cents, c.currency);
  const alta = ALTA[plan.setupFee.status];
  const umbral = c.monthlyFeeFreeUntilSeats;
  /* Los usuarios que cuentan hoy, de donde toque según el modelo. */
  const usuarios = ciclo ? ciclo.seatsNow : (m?.seats ?? 0);
  const hayDatos = !!ciclo || !!m;
  const aplica = ciclo ? ciclo.renewal.monthlyFeeApplies : !!m?.monthlyFeeApplies;
  const faltan = ciclo ? ciclo.renewal.seatsToMonthlyFee : (m?.seatsToMonthlyFee ?? 0);

  return (
    <section className="bloque" aria-labelledby="tu-plan">
      <header className="bloque__cabecera">
        <h2 id="tu-plan" className="bloque__titulo">{t("cobro.titulo")}</h2>
        <Link to="/contract" className="bloque__enlace">
          {t("cobro.contrato", { v: c.version, f: dia(c.effectiveFrom) })}
          <Icono nombre="flecha" tamano={14} />
        </Link>
      </header>

      <ul className="plan">
        <Fila
          icono="escudo"
          concepto={t("cobro.altaTitulo")}
          regla={t(ciclo ? "cobro.altaReglaCiclo" : "cobro.altaRegla")}
          importe={$(c.setupFeeCents)}
          unidad={t("cobro.unaVez")}
        >
          <Pildora tono={alta.tono}>
            {t(alta.texto, {
              n: plan.setupFee.invoiceNumber ?? "",
              f: plan.setupFee.paidAt ? fechaCorta(plan.setupFee.paidAt) : "",
            })}
          </Pildora>
        </Fila>

        <Fila
          icono="personas"
          concepto={t("cobro.regaliaTitulo")}
          regla={ciclo
            ? t("cobro.regaliaReglaCiclo", { d: ciclo.anchorDay })
            : t("cobro.regaliaRegla")}
          importe={$(c.royaltyPerUserCents)}
          unidad={t("cobro.porUsuarioMes")}
        >
          {hayDatos && (
            <span className="plan__estado">
              <strong>{t("cobro.usuarios", { n: usuarios })}</strong>
              {t("cobro.hoy")}
              {ciclo && ` · ${t("cobro.pagados", { n: ciclo.seatsPaid })}`}
            </span>
          )}
        </Fila>

        <Fila
          icono="corona"
          concepto={t("cobro.mensualTitulo")}
          regla={umbral > 0
            ? t(ciclo ? "cobro.mensualReglaUmbralCiclo" : "cobro.mensualReglaUmbral", { n: umbral })
            : t(ciclo ? "cobro.mensualReglaSiempreCiclo" : "cobro.mensualReglaSiempre")}
          importe={$(c.monthlyFeeCents)}
          unidad={t("cobro.alMes")}
        >
          {hayDatos && umbral > 0 ? (
            <span className="plan__medidor">
              <span
                className="umbral"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={umbral}
                aria-valuenow={Math.min(usuarios, umbral)}
                aria-label={t("cobro.mensualTitulo")}
              >
                <span style={{ width: `${Math.min(100, (usuarios / umbral) * 100)}%` }} />
              </span>
              <span className="plan__estado">
                {aplica
                  ? t("cobro.mensualYaAplica", { n: usuarios, u: umbral })
                  : t("cobro.mensualFaltan", { n: usuarios, u: umbral, faltan })}
              </span>
            </span>
          ) : (
            <Pildora tono="neutro">{t("cobro.mensualCadaMes")}</Pildora>
          )}
        </Fila>
      </ul>
    </section>
  );
}

function Fila({
  icono, concepto, regla, importe, unidad, children,
}: {
  icono: NombreDeIcono; concepto: string; regla: string; importe: string; unidad: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="plan__fila">
      <span className="plan__icono"><Icono nombre={icono} tamano={18} /></span>
      <span className="plan__concepto">
        <strong>{concepto}</strong>
        <span>{regla}</span>
      </span>
      <span className="plan__precio">
        <strong>{importe}</strong>
        <span>{unidad}</span>
      </span>
      <span className="plan__tuyo">{children}</span>
    </li>
  );
}

/* ── ESTE MES ────────────────────────────────────────────────────────────── */

export function EsteMes({ plan }: { plan: PlanDeCobro }) {
  const t = useT();
  const c = plan.contract!;
  const m = plan.currentMonth!;
  const $ = (cents: number) => precio(cents, c.currency);
  const [todas, setTodas] = useState(false);
  const orden = [...m.companies].sort((a, b) => b.seats - a.seats);
  const visibles = todas ? orden : orden.slice(0, 6);
  const mayor = Math.max(1, ...orden.map((e) => e.seats));

  return (
    <section className="bloque" aria-labelledby="este-mes">
      <header className="bloque__cabecera">
        <h2 id="este-mes" className="bloque__titulo">
          {t("cobro.mesTitulo", { mes: mesDelPeriodo(m.label) })}
        </h2>
        <Pildora tono="neutro">{t("cobro.estimacion")}</Pildora>
      </header>
      <p className="bloque__nota">{t("cobro.mesSub", { f: dia(m.closesOn) })}</p>
      {!m.billable && <p className="bloque__nota bloque__nota--aviso">{t("cobro.noFacturable")}</p>}

      <div className="mes">
        <ul className="recibo">
          <li className="recibo__linea">
            <span className="recibo__concepto">
              {t("cobro.lineaRegalia")}
              <span className="recibo__detalle">
                {t("cobro.lineaRegaliaDetalle", { n: m.seats, p: $(c.royaltyPerUserCents) })}
              </span>
            </span>
            <span className="recibo__importe">{$(m.royaltyCents)}</span>
          </li>
          <li className="recibo__linea">
            <span className="recibo__concepto">
              {t("cobro.lineaMensual")}
              <span className="recibo__detalle">
                {m.monthlyFeeApplies
                  ? t("cobro.lineaMensualAplica")
                  : t("cobro.lineaMensualGratis", { n: m.seats, u: c.monthlyFeeFreeUntilSeats })}
              </span>
            </span>
            <span className="recibo__importe">{$(m.monthlyFeeCents)}</span>
          </li>
          {m.setupFeeCents > 0 && (
            <li className="recibo__linea">
              <span className="recibo__concepto">
                {t("cobro.lineaAlta")}
                <span className="recibo__detalle">{t("cobro.lineaAltaDetalle")}</span>
              </span>
              <span className="recibo__importe">{$(m.setupFeeCents)}</span>
            </li>
          )}
          <li className="recibo__linea recibo__linea--total">
            <span className="recibo__concepto">{t("cobro.totalEstimado")}</span>
            <span className="recibo__importe">{$(m.totalCents)}</span>
          </li>
        </ul>

        <div className="mes-empresas">
          <span className="mes-empresas__titulo">{t("cobro.porEmpresa")}</span>
          {orden.length === 0 ? (
            <p className="bloque__vacio">{t("empresas.vacio")}</p>
          ) : (
            <ul className="mes-empresas__lista">
              {visibles.map((e) => (
                <li key={e.tenantId} className="mes-empresas__fila">
                  <Link to={`/companies/${e.tenantId}`} className="mes-empresas__nombre">
                    {e.name || t("empresas.sinNombre")}
                  </Link>
                  {e.excludedReason ? (
                    <span className="mes-empresas__fuera">{t("cobro.noCuenta")}</span>
                  ) : (
                    <>
                      <span className="mes-empresas__barra" aria-hidden="true">
                        <span style={{ width: `${(e.seats / mayor) * 100}%` }} />
                      </span>
                      <span className="mes-empresas__usuarios">{e.seats}</span>
                      <span className="mes-empresas__importe">{$(e.seats * c.royaltyPerUserCents)}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          {orden.length > 6 && (
            <button type="button" className="bloque__enlace" onClick={() => setTodas((v) => !v)}>
              {t(todas ? "cobro.verMenos" : "cobro.verTodas", { n: orden.length })}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── TU CICLO (aniversario) ───────────────────────────────────────────────── */

export function EsteCiclo({ plan }: { plan: PlanDeCobro }) {
  const t = useT();
  const c = plan.contract!;
  const k = plan.cycle!;
  const $ = (cents: number) => precio(cents, c.currency);
  const [todas, setTodas] = useState(false);
  const orden = [...k.companies].sort((a, b) => b.seats - a.seats);
  const visibles = todas ? orden : orden.slice(0, 6);
  const mayor = Math.max(1, ...orden.map((e) => e.seats));

  return (
    <section className="bloque" aria-labelledby="tu-ciclo">
      <header className="bloque__cabecera">
        <h2 id="tu-ciclo" className="bloque__titulo">
          {t("cobro.cicloActual", { a: dia(k.start), b: dia(k.end) })}
        </h2>
        <Pildora tono="neutro">{t("cobro.renuevaEl", { f: dia(k.end) })}</Pildora>
      </header>

      <div className="mes">
        <ul className="recibo">
          <li className="recibo__linea">
            <span className="recibo__concepto">
              {t("cobro.asientosPagados")}
              <span className="recibo__detalle">{t("cobro.asientosPagadosNota")}</span>
            </span>
            <span className="recibo__importe">{k.seatsPaid}</span>
          </li>
          <li className="recibo__linea">
            <span className="recibo__concepto">
              {t("cobro.usuariosHoy")}
              <span className="recibo__detalle">{t("cobro.usuariosHoyNota")}</span>
            </span>
            <span className="recibo__importe">{k.seatsNow}</span>
          </li>
          {k.newSeats > 0 && (
            <li className="recibo__linea recibo__linea--aviso">
              <span className="recibo__concepto">
                {t("cobro.nuevos", { n: k.newSeats })}
                <span className="recibo__detalle">
                  {t("cobro.nuevosNota", { p: $(k.proratedSeatCents), f: dia(k.end) })}
                </span>
              </span>
              <span className="recibo__importe">{$(k.newSeats * k.proratedSeatCents)}</span>
            </li>
          )}
          <li className="recibo__linea recibo__linea--total">
            <span className="recibo__concepto">
              {t("cobro.renovacionEstimada", { f: dia(k.end) })}
              <span className="recibo__detalle">
                {t("cobro.renovacionDetalle", {
                  n: k.renewal.seats, p: $(c.royaltyPerUserCents),
                  m: k.renewal.monthlyFeeApplies ? $(k.renewal.monthlyFeeCents) : $(0),
                })}
              </span>
            </span>
            <span className="recibo__importe">{$(k.renewal.totalCents)}</span>
          </li>
        </ul>

        <div className="mes-empresas">
          <span className="mes-empresas__titulo">{t("cobro.porEmpresa")}</span>
          {orden.length === 0 ? (
            <p className="bloque__vacio">{t("empresas.vacio")}</p>
          ) : (
            <ul className="mes-empresas__lista">
              {visibles.map((e) => (
                <li key={e.tenantId} className="mes-empresas__fila">
                  <Link to={`/companies/${e.tenantId}`} className="mes-empresas__nombre">
                    {e.name || t("empresas.sinNombre")}
                  </Link>
                  {e.excludedReason ? (
                    <span className="mes-empresas__fuera">
                      {e.excludedReason === "trial" && e.trialEndsOn
                        ? t("cobro.enPrueba", { f: dia(e.trialEndsOn) })
                        : t("cobro.noCuenta")}
                    </span>
                  ) : (
                    <>
                      <span className="mes-empresas__barra" aria-hidden="true">
                        <span style={{ width: `${(e.seats / mayor) * 100}%` }} />
                      </span>
                      <span className="mes-empresas__usuarios">{e.seats}</span>
                      <span className="mes-empresas__importe">{$(e.seats * c.royaltyPerUserCents)}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          {orden.length > 6 && (
            <button type="button" className="bloque__enlace" onClick={() => setTodas((v) => !v)}>
              {t(todas ? "cobro.verMenos" : "cobro.verTodas", { n: orden.length })}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── CÓMO FUNCIONA ───────────────────────────────────────────────────────── */

export function ComoFunciona({ plan }: { plan: PlanDeCobro }) {
  const t = useT();
  const c = plan.contract!;
  return (
    <details className="ciclo-mensual">
      <summary className="ciclo-mensual__resumen">
        <Icono nombre="libro" tamano={16} />
        {t("cobro.cicloTitulo")}
        <Icono nombre="galon" tamano={15} className="ciclo-mensual__galon" />
      </summary>
      {plan.cycle ? (
        <ol className="ciclo">
          <Paso n="1" titulo={t("cobro.aniv1", { d: plan.cycle.anchorDay })} texto={t("cobro.aniv1Texto")} />
          <Paso n="2" titulo={t("cobro.aniv2")} texto={t("cobro.aniv2Texto")} />
          <Paso n="3" titulo={t("cobro.aniv3")} texto={t("cobro.aniv3Texto")} />
          <Paso n="4" titulo={t("cobro.aniv4")} texto={t("cobro.aniv4Texto", { d: c.gracePeriodDays })} />
        </ol>
      ) : (
        <ol className="ciclo">
          <Paso n="1" titulo={t("cobro.ciclo1")} texto={t("cobro.ciclo1Texto")} />
          <Paso n="2" titulo={t("cobro.ciclo2")} texto={t("cobro.ciclo2Texto")} />
          <Paso n="3" titulo={t("cobro.ciclo3", { d: c.paymentTermDays })} texto={t("cobro.ciclo3Texto")} />
          <Paso n="4" titulo={t("cobro.ciclo4")} texto={t("cobro.ciclo4Texto", { d: c.gracePeriodDays })} />
        </ol>
      )}
    </details>
  );
}

function Paso({ n, titulo, texto }: { n: string; titulo: string; texto: string }) {
  return (
    <li className="ciclo__paso">
      <span className="ciclo__numero">{n}</span>
      <span className="ciclo__texto">
        <strong>{titulo}</strong>
        <span>{texto}</span>
      </span>
    </li>
  );
}
