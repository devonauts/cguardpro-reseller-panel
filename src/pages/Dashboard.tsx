import { useCallback, useEffect, useState } from "react";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import StatusPill, { etiquetaDeEstado } from "@/components/StatusPill";
import {
  Cifra, Dato, EstadoDeDatos, Tarjeta, TarjetaCabecera, TodaviaNo,
} from "@/components/cristal";
import { resellerService, type ResellerDashboard } from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import { fechaCorta } from "@/lib/dinero";
import { etiquetaIntl } from "@/i18n/idioma";
import "./Dashboard.scss";

/**
 * El resumen COMERCIAL de la cuenta del socio.
 *
 * ── LO QUE NO SALE AQUÍ ───────────────────────────────────────────────────
 * Nada operativo de sus empresas: ni incidentes, ni pánicos, ni ubicaciones, ni
 * rondas, ni mensajes, ni desempeño. Un socio es el dueño COMERCIAL de unas
 * empresas de seguridad; no es su jefe de operaciones, y ser dueño de la
 * relación comercial no da acceso a lo que hacen los vigilantes de otro.
 *
 * ── Y NO SALE NINGÚN IMPORTE DE REGALÍA ───────────────────────────────────
 * El motor que la calcula no existe todavía. Lo que se enseña es que no está
 * calculada. Ni un «$0», ni una estimación, ni una proyección: aquí el número
 * es dinero que alguien va a reclamar, y uno inventado se convierte en una
 * discusión el día que llegue la factura de verdad.
 */

/** Centavos enteros → «$1,234.56». El servidor manda centavos; aquí sólo se pinta. */
function usd(cents: number | null | undefined): string {
  return ((cents || 0) / 100).toLocaleString(etiquetaIntl(), {
    style: "currency",
    currency: "USD",
  });
}

export function Dashboard() {
  const { me } = useResellerAuth();
  const t = useT();
  const [datos, setDatos] = useState<ResellerDashboard | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** El portero comercial puede negar la lectura entera; no es un fallo. */
  const [bloqueadoPorEstado, setBloqueadoPorEstado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    setBloqueadoPorEstado(null);
    try {
      setDatos(await resellerService.dashboard());
    } catch (e: any) {
      if (e?.status === 403 && e?.resellerStatus) {
        setBloqueadoPorEstado(e.resellerStatus);
      } else {
        setError(e?.message || t("resumen.noCargo"));
      }
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => { cargar(); }, [cargar]);

  if (bloqueadoPorEstado) {
    return (
      <>
        <Cabecera />
        <Tarjeta>
          <TarjetaCabecera
            titulo={t("resumen.bloqueada", {
              estado: etiquetaDeEstado(bloqueadoPorEstado).toLowerCase(),
            })}
          />
          <p style={{ fontSize: 13, color: "var(--ink-muted)", maxWidth: "60ch" }}>
            {me?.reseller.statusReason || t("resumen.bloqueadaNota")}
          </p>
        </Tarjeta>
      </>
    );
  }

  return (
    <>
      <Cabecera />
      <EstadoDeDatos cargando={cargando} error={error} onReintentar={cargar}>
        <div className="cifras">
          <Cifra etiqueta={t("resumen.empresas")} valor={datos?.companies.total ?? 0} />
          <Cifra
            etiqueta={t("resumen.activas")}
            valor={datos?.companies.active ?? 0}
            nota={t("resumen.activasNota")}
          />
          <Cifra
            etiqueta={t("resumen.facturasTu")}
            valor={datos?.companies.resellerBilled ?? 0}
            nota={t("resumen.facturasTuNota")}
          />
          <Cifra
            etiqueta={t("resumen.cupo")}
            valor={
              datos?.companies.remainingQuota === null
                ? t("comun.sinLimite")
                : datos?.companies.remainingQuota ?? 0
            }
          />
        </div>

        <div className="columnas">
          <Tarjeta>
            <TarjetaCabecera
              titulo={t("resumen.consumoTitulo")}
              nota={t("resumen.consumoNota")}
            />
            {datos?.usage.notYetCalculated ? (
              /* EL HUECO DECLARADO. Aquí es donde sería fácil —y equivocado—
                 poner un cero para que la tarjeta no se vea vacía. */
              <TodaviaNo>{t("resumen.sinPeriodo")}</TodaviaNo>
            ) : (
              <dl className="datos">
                <Dato etiqueta={t("resumen.desde")} valor={fechaCorta(datos?.usage.periodStart)} />
                <Dato etiqueta={t("resumen.hasta")} valor={fechaCorta(datos?.usage.periodEnd)} />
              </dl>
            )}
          </Tarjeta>

          <Tarjeta>
            <TarjetaCabecera
              titulo={t("resumen.contratoTitulo")}
              nota={datos?.contract
                ? t("resumen.versionEnVigor", { v: datos.contract.version })
                : undefined}
            />
            {datos?.contract ? (
              <dl className="datos">
                <Dato etiqueta={t("resumen.vigenteDesde")} valor={fechaCorta(datos.contract.effectiveFrom)} />
                <Dato etiqueta={t("resumen.mensualidad")} valor={usd(datos.contract.monthlyFeeCents)} />
                <Dato
                  etiqueta={t("resumen.porUsuario")}
                  valor={usd(datos.contract.royaltyPerUserCents)}
                />
                <Dato etiqueta={t("resumen.moneda")} valor={datos.contract.currency} />
              </dl>
            ) : (
              <TodaviaNo>{t("resumen.sinContrato")}</TodaviaNo>
            )}
          </Tarjeta>
        </div>
      </EstadoDeDatos>
    </>
  );
}

function Cabecera() {
  const { me } = useResellerAuth();
  const t = useT();
  return (
    <header className="cabecera">
      <div>
        <h1 className="cabecera__titulo">{t("resumen.titulo")}</h1>
        <p className="cabecera__sub">
          {me?.reseller.displayName || me?.reseller.legalName || t("resumen.tuCuenta")}
        </p>
      </div>
      <StatusPill status={me?.reseller.status} />
    </header>
  );
}

export default Dashboard;
