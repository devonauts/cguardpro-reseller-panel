import { useCallback, useEffect, useState } from "react";

import { EstadoDeDatos, Tarjeta, TarjetaCabecera, Dato, Pildora } from "@/components/cristal";
import { Pagina } from "@/components/panel";
import { dinero, fecha } from "@/lib/dinero";
import { portalService, type ContratoDelSocio } from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import "./Contrato.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL CONTRATO — LO QUE CGUARDPRO LE COBRA AL SOCIO
 *
 * ── LA DISTINCIÓN QUE ESTA PANTALLA TIENE QUE DEJAR CLARA ─────────────────
 * Estas cifras son lo que CGuardPro le cobra al socio. NO son lo que el socio
 * le cobra a sus clientes: eso lo decide él, y la plataforma no opina ni lo
 * guarda en ninguna columna. Sin decirlo en voz alta, un dueño que abre esta
 * pantalla puede leer «regalía por usuario» y creer que es su precio de venta.
 *
 * ── Y ES DE LECTURA ───────────────────────────────────────────────────────
 * El contrato lo fija CGuardPro y se versiona: cambiarlo crea una versión
 * nueva, y eso es de superadmin. No hay formulario aquí, ni lo habrá: un precio
 * pasado es la base de una factura pasada.
 * ════════════════════════════════════════════════════════════════════════════
 */

const INTERVALO: Record<string, Clave> = {
  monthly: "contrato.intervaloMonthly",
  quarterly: "contrato.intervaloQuarterly",
  annual: "contrato.intervaloAnnual",
};

const POLITICA: Record<string, Clave> = {
  active_all_roles_v1: "contrato.politicaTodos",
  active_staff_only_v1: "contrato.politicaPersonal",
  active_field_only_v1: "contrato.politicaCampo",
};

export function Contrato() {
  const t = useT();
  const [contrato, setContrato] = useState<ContratoDelSocio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await portalService.contrato();
      setContrato(r.contract);
    } catch (e: any) {
      setError(e?.message || t("contrato.noCargo"));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => { cargar(); }, [cargar]);

  const vigente = !!contrato && !contrato.effectiveTo;

  return (
    <Pagina titulo={t("contrato.titulo")} nota={t("contrato.nota")}>

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={!cargando && !error && !contrato}
        etiquetaVacio={t("contrato.vacio")}
        onReintentar={cargar}
      >
        {contrato && (
          <>
            <Tarjeta>
              <TarjetaCabecera
                titulo={t("contrato.version", { v: contrato.version })}
                nota={
                  <Pildora tono={vigente ? "ok" : "neutro"}>
                    {t(vigente ? "contrato.vigente" : "contrato.cerrado")}
                  </Pildora>
                }
              />
              <div className="contrato__rejilla">
                <Dato etiqueta={t("contrato.enVigorDesde")} valor={fecha(contrato.effectiveFrom)} />
                <Dato
                  etiqueta={t("contrato.enVigorHasta")}
                  valor={contrato.effectiveTo
                    ? fecha(contrato.effectiveTo)
                    : t("contrato.sinFechaFin")}
                />
                <Dato etiqueta={t("contrato.moneda")} valor={contrato.currency} />
                <Dato
                  etiqueta={t("contrato.periodicidad")}
                  valor={INTERVALO[contrato.billingInterval]
                    ? t(INTERVALO[contrato.billingInterval])
                    : contrato.billingInterval}
                />
              </div>
            </Tarjeta>

            <Tarjeta>
              <TarjetaCabecera
                titulo={t("contrato.loQuePagas")}
                nota={t("contrato.loQuePagasNota")}
              />
              <div className="contrato__rejilla">
                <Dato
                  etiqueta={t("contrato.cuotaAlta")}
                  valor={
                    contrato.setupFeeWaived ? (
                      <>
                        <span className="contrato__tachado">
                          {dinero(contrato.setupFeeCents, contrato.currency)}
                        </span>{" "}
                        <Pildora tono="ok">{t("contrato.condonada")}</Pildora>
                      </>
                    ) : (
                      dinero(contrato.setupFeeCents, contrato.currency)
                    )
                  }
                />
                <Dato
                  etiqueta={t("contrato.cuotaRecurrente")}
                  valor={`${dinero(contrato.monthlyFeeCents, contrato.currency)} · ${
                    INTERVALO[contrato.billingInterval]
                      ? t(INTERVALO[contrato.billingInterval])
                      : contrato.billingInterval
                  }`}
                />
                <Dato
                  etiqueta={t("contrato.regaliaPersona")}
                  valor={dinero(contrato.royaltyPerUserCents, contrato.currency)}
                />
              </div>
              <p className="contrato__politica">
                <strong>{t("contrato.quienCuenta")}</strong>{" "}
                {contrato.royaltySeatPolicy
                  ? (POLITICA[contrato.royaltySeatPolicy]
                      ? t(POLITICA[contrato.royaltySeatPolicy])
                      : contrato.royaltySeatPolicy)
                  : t("contrato.sinPolitica")}
              </p>
            </Tarjeta>

            <Tarjeta>
              <TarjetaCabecera titulo={t("contrato.preciosTuyosTitulo")} />
              <p className="contrato__aviso">{t("contrato.preciosTuyosNota")}</p>
            </Tarjeta>
          </>
        )}
      </EstadoDeDatos>
    </Pagina>
  );
}

export default Contrato;
