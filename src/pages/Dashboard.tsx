import { useCallback, useEffect, useState } from "react";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import StatusPill, { etiquetaDeEstado } from "@/components/StatusPill";
import {
  Cifra, Dato, EstadoDeDatos, Tarjeta, TarjetaCabecera, TodaviaNo,
} from "@/components/ui/kit";
import { resellerService, type ResellerDashboard } from "@/services/resellerService";
import "./Dashboard.css";

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
  return ((cents || 0) / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" });
}

export function Dashboard() {
  const { me } = useResellerAuth();
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
        setError(e?.message || "No se pudo cargar el resumen.");
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (bloqueadoPorEstado) {
    return (
      <>
        <Cabecera />
        <Tarjeta>
          <TarjetaCabecera
            titulo={`Tu cuenta está ${etiquetaDeEstado(bloqueadoPorEstado).toLowerCase()}`}
          />
          <p style={{ fontSize: 13, color: "var(--ink-muted)", maxWidth: "60ch" }}>
            {me?.reseller.statusReason
              || "Mientras tanto no se puede ver esta sección. Tus empresas siguen "
               + "funcionando con normalidad: esto sólo afecta a tu panel."}
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
          <Cifra etiqueta="Empresas" valor={datos?.companies.total ?? 0} />
          <Cifra
            etiqueta="Activas"
            valor={datos?.companies.active ?? 0}
            nota="No suspendidas administrativamente"
          />
          <Cifra
            etiqueta="Las facturas tú"
            valor={datos?.companies.resellerBilled ?? 0}
            nota="El resto las factura la plataforma"
          />
          <Cifra
            etiqueta="Cupo disponible"
            valor={
              datos?.companies.remainingQuota === null
                ? "Sin límite"
                : datos?.companies.remainingQuota ?? 0
            }
          />
        </div>

        <div className="columnas">
          <Tarjeta>
            <TarjetaCabecera
              titulo="Consumo del periodo"
              nota="Lo que se factura por los usuarios de tus empresas."
            />
            {datos?.usage.notYetCalculated ? (
              /* EL HUECO DECLARADO. Aquí es donde sería fácil —y equivocado—
                 poner un cero para que la tarjeta no se vea vacía. */
              <TodaviaNo>
                Todavía no hay ningún periodo cerrado, así que no hay consumo
                calculado. En cuanto se cierre el primero verás aquí los usuarios
                contabilizados y el importe. No se muestra una estimación:
                preferimos no darte una cifra que luego no cuadre con tu factura.
              </TodaviaNo>
            ) : (
              <dl className="datos">
                <Dato etiqueta="Desde" valor={fecha(datos?.usage.periodStart)} />
                <Dato etiqueta="Hasta" valor={fecha(datos?.usage.periodEnd)} />
              </dl>
            )}
          </Tarjeta>

          <Tarjeta>
            <TarjetaCabecera
              titulo="Tu contrato"
              nota={datos?.contract ? `Versión ${datos.contract.version} en vigor` : undefined}
            />
            {datos?.contract ? (
              <dl className="datos">
                <Dato etiqueta="Vigente desde" valor={fecha(datos.contract.effectiveFrom)} />
                <Dato etiqueta="Mensualidad" valor={usd(datos.contract.monthlyFeeCents)} />
                <Dato
                  etiqueta="Por usuario"
                  valor={usd(datos.contract.royaltyPerUserCents)}
                />
                <Dato etiqueta="Moneda" valor={datos.contract.currency} />
              </dl>
            ) : (
              <TodaviaNo>
                No hay un contrato en vigor registrado. Habla con tu contacto en
                la plataforma.
              </TodaviaNo>
            )}
          </Tarjeta>
        </div>
      </EstadoDeDatos>
    </>
  );
}

function Cabecera() {
  const { me } = useResellerAuth();
  return (
    <header className="cabecera">
      <div>
        <h1 className="cabecera__titulo">Resumen</h1>
        <p className="cabecera__sub">
          {me?.reseller.displayName || me?.reseller.legalName || "Tu cuenta"}
        </p>
      </div>
      <StatusPill status={me?.reseller.status} />
    </header>
  );
}

export default Dashboard;
