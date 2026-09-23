import { useState } from "react";
import { Link } from "react-router-dom";

import { Icono, Panel, Pildora, type NombreDeIcono, type Tono } from "@/components/cristal";
import { dinero, fechaCorta, mesDelPeriodo } from "@/lib/dinero";
import type { PlanDeCobro } from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * CÓMO TE COBRAMOS — EN TRES BLOQUES QUE SE LEEN DE ARRIBA ABAJO
 *
 *   1. Los tres conceptos del contrato, cada uno con su regla en una frase y
 *      en qué punto está el socio AHORA: la cuota de alta (¿pagada?), la
 *      regalía por usuario (¿cuánto llevo?) y la cuota mensual (¿cuántos
 *      usuarios me faltan para que empiece?).
 *   2. Así va este mes: el recibo del mes en curso, línea a línea.
 *   3. Cuándo se cobra: el ciclo de cada mes, con los plazos del contrato.
 *
 * Todas las cifras vienen del servidor (`/billing/plan`), calculadas con las
 * mismas reglas que la factura. Aquí sólo se cuentan.
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

export function ComoTeCobramos({ plan }: { plan: PlanDeCobro }) {
  const t = useT();
  const c = plan.contract;
  if (!c) {
    return (
      <Panel titulo={t("cobro.titulo")}>
        <p className="cobro__vacio">{t("cobro.sinContrato")}</p>
      </Panel>
    );
  }

  const m = plan.currentMonth;
  const $ = (cents: number) => dinero(cents, c.currency);
  const alta = ALTA[plan.setupFee.status];
  const umbral = c.monthlyFeeFreeUntilSeats;
  const usuarios = m?.seats ?? 0;

  return (
    <>
      {/* ── 1. LOS TRES CONCEPTOS ─────────────────────────────────────── */}
      <section className="cobro" aria-labelledby="cobro-titulo">
        <header className="cobro__cabecera">
          <h2 id="cobro-titulo" className="cobro__titulo">{t("cobro.titulo")}</h2>
          <p className="cobro__sub">{t("cobro.sub", { v: c.version, f: dia(c.effectiveFrom) })}</p>
        </header>

        <div className="cobro__conceptos">
          <Concepto
            icono="escudo"
            paso="1"
            titulo={t("cobro.altaTitulo")}
            precio={$(c.setupFeeCents)}
            unidad={t("cobro.unaVez")}
            regla={t("cobro.altaRegla")}
          >
            <Pildora tono={alta.tono}>
              {t(alta.texto, {
                n: plan.setupFee.invoiceNumber ?? "",
                f: plan.setupFee.paidAt ? fechaCorta(plan.setupFee.paidAt) : "",
              })}
            </Pildora>
          </Concepto>

          <Concepto
            icono="personas"
            paso="2"
            titulo={t("cobro.regaliaTitulo")}
            precio={$(c.royaltyPerUserCents)}
            unidad={t("cobro.porUsuarioMes")}
            regla={t("cobro.regaliaRegla")}
          >
            {m && (
              <p className="concepto__estado">
                {t("cobro.regaliaHoy", { n: usuarios, importe: $(m.royaltyCents) })}
              </p>
            )}
          </Concepto>

          <Concepto
            icono="corona"
            paso="3"
            titulo={t("cobro.mensualTitulo")}
            precio={$(c.monthlyFeeCents)}
            unidad={t("cobro.alMes")}
            regla={umbral > 0
              ? t("cobro.mensualReglaUmbral", { n: umbral })
              : t("cobro.mensualReglaSiempre")}
          >
            {m && umbral > 0 && (
              <>
                <div
                  className="umbral"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={umbral}
                  aria-valuenow={Math.min(usuarios, umbral)}
                  aria-label={t("cobro.mensualTitulo")}
                >
                  <span style={{ width: `${Math.min(100, (usuarios / umbral) * 100)}%` }} />
                </div>
                <p className="concepto__estado">
                  {m.monthlyFeeApplies
                    ? t("cobro.mensualYaAplica", { n: usuarios, u: umbral })
                    : t("cobro.mensualFaltan", { n: usuarios, u: umbral, faltan: m.seatsToMonthlyFee })}
                </p>
              </>
            )}
          </Concepto>
        </div>
      </section>

      {/* ── 2. ASÍ VA ESTE MES ────────────────────────────────────────── */}
      {m && <EsteMes plan={plan} />}

      {/* ── 3. CUÁNDO SE COBRA ────────────────────────────────────────── */}
      <Panel titulo={t("cobro.cicloTitulo")} nota={t("cobro.cicloSub")}>
        <ol className="ciclo">
          <Paso n="1" titulo={t("cobro.ciclo1")} texto={t("cobro.ciclo1Texto")} />
          <Paso n="2" titulo={t("cobro.ciclo2")} texto={t("cobro.ciclo2Texto")} />
          <Paso
            n="3"
            titulo={t("cobro.ciclo3", { d: c.paymentTermDays })}
            texto={t("cobro.ciclo3Texto")}
          />
          <Paso
            n="4"
            titulo={t("cobro.ciclo4")}
            texto={t("cobro.ciclo4Texto", { d: c.gracePeriodDays })}
          />
        </ol>
      </Panel>
    </>
  );
}

function Concepto({
  icono, paso, titulo, precio, unidad, regla, children,
}: {
  icono: NombreDeIcono; paso: string; titulo: string; precio: string; unidad: string;
  regla: string; children?: React.ReactNode;
}) {
  return (
    <article className="concepto">
      <header className="concepto__cabecera">
        <span className="concepto__icono"><Icono nombre={icono} tamano={18} /></span>
        <span className="concepto__paso">{paso}</span>
      </header>
      <h3 className="concepto__titulo">{titulo}</h3>
      <p className="concepto__precio">
        {precio} <span className="concepto__unidad">{unidad}</span>
      </p>
      <p className="concepto__regla">{regla}</p>
      {children && <div className="concepto__pie">{children}</div>}
    </article>
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

/** El recibo del mes en curso, como lo vería la factura si el mes cerrara hoy. */
function EsteMes({ plan }: { plan: PlanDeCobro }) {
  const t = useT();
  const [abierto, setAbierto] = useState(false);
  const c = plan.contract!;
  const m = plan.currentMonth!;
  const $ = (cents: number) => dinero(cents, c.currency);
  const cuentan = m.companies.filter((e) => !e.excludedReason);

  return (
    <Panel
      titulo={t("cobro.mesTitulo", { mes: mesDelPeriodo(m.label) })}
      nota={t("cobro.mesSub", { f: dia(m.closesOn) })}
      acciones={<Pildora tono="neutro">{t("cobro.estimacion")}</Pildora>}
    >
      {!m.billable && <p className="recibo__aviso">{t("cobro.noFacturable")}</p>}

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

      {m.companies.length > 0 && (
        <>
          <button
            type="button"
            className="recibo__desglose-boton"
            aria-expanded={abierto}
            onClick={() => setAbierto((v) => !v)}
          >
            {t(abierto ? "cobro.ocultarEmpresas" : "cobro.verEmpresas", { n: cuentan.length })}
            <Icono nombre="galon" tamano={15} />
          </button>
          {abierto && (
            <ul className="mes-empresas">
              {m.companies.map((e) => (
                <li key={e.tenantId} className="mes-empresas__fila">
                  <Link to={`/companies/${e.tenantId}`} className="mes-empresas__nombre">
                    {e.name || t("empresas.sinNombre")}
                  </Link>
                  {e.excludedReason ? (
                    <span className="mes-empresas__fuera">{t("cobro.noCuenta")}</span>
                  ) : (
                    <>
                      <span className="mes-empresas__usuarios">{t("cobro.usuarios", { n: e.seats })}</span>
                      <span className="mes-empresas__importe">{$(e.seats * c.royaltyPerUserCents)}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Panel>
  );
}

export default ComoTeCobramos;
