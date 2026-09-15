import { useCallback, useEffect, useState } from "react";

import { EstadoDeDatos, Tarjeta, TarjetaCabecera, Dato, Pildora } from "@/components/ui/kit";
import { dinero, fecha } from "@/lib/dinero";
import { portalService, type ContratoDelSocio } from "@/services/resellerService";
import "./Contrato.css";

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

const INTERVALO: Record<string, string> = {
  monthly: "cada mes",
  quarterly: "cada trimestre",
  annual: "cada año",
};

const POLITICA: Record<string, string> = {
  active_all_roles_v1: "Toda persona activa de tus empresas, incluidos los accesos de cliente.",
  active_staff_only_v1: "Sólo personal: se excluyen los accesos de cliente.",
  active_field_only_v1: "Sólo vigilantes y supervisores.",
};

export function Contrato() {
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
      setError(e?.message || "No se pudo cargar tu contrato.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const vigente = !!contrato && !contrato.effectiveTo;

  return (
    <section className="pagina">
      <header className="pagina__cabecera">
        <h1>Tu contrato</h1>
        <p className="pagina__nota">
          Lo que CGuard Pro te cobra a ti. No es lo que tú le cobras a tus clientes:
          eso lo decides tú y no se gestiona desde aquí.
        </p>
      </header>

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={!cargando && !error && !contrato}
        etiquetaVacio="Todavía no tienes un contrato vigente. Cuando CGuard Pro lo active, aparecerá aquí."
        onReintentar={cargar}
      >
        {contrato && (
          <>
            <Tarjeta>
              <TarjetaCabecera
                titulo={`Versión ${contrato.version}`}
                nota={
                  <Pildora tono={vigente ? "ok" : "neutro"}>
                    {vigente ? "Vigente" : "Cerrado"}
                  </Pildora>
                }
              />
              <div className="contrato__rejilla">
                <Dato etiqueta="En vigor desde" valor={fecha(contrato.effectiveFrom)} />
                <Dato
                  etiqueta="En vigor hasta"
                  valor={contrato.effectiveTo ? fecha(contrato.effectiveTo) : "Sin fecha de fin"}
                />
                <Dato etiqueta="Moneda" valor={contrato.currency} />
                <Dato
                  etiqueta="Periodicidad"
                  valor={INTERVALO[contrato.billingInterval] || contrato.billingInterval}
                />
              </div>
            </Tarjeta>

            <Tarjeta>
              <TarjetaCabecera
                titulo="Lo que pagas"
                nota="Importes que CGuard Pro te factura."
              />
              <div className="contrato__rejilla">
                <Dato
                  etiqueta="Cuota de alta"
                  valor={
                    contrato.setupFeeWaived ? (
                      <>
                        <span className="contrato__tachado">
                          {dinero(contrato.setupFeeCents, contrato.currency)}
                        </span>{" "}
                        <Pildora tono="ok">Condonada</Pildora>
                      </>
                    ) : (
                      dinero(contrato.setupFeeCents, contrato.currency)
                    )
                  }
                />
                <Dato
                  etiqueta="Cuota recurrente"
                  valor={`${dinero(contrato.monthlyFeeCents, contrato.currency)} · ${
                    INTERVALO[contrato.billingInterval] || contrato.billingInterval
                  }`}
                />
                <Dato
                  etiqueta="Regalía por persona"
                  valor={dinero(contrato.royaltyPerUserCents, contrato.currency)}
                />
              </div>
              <p className="contrato__politica">
                <strong>Quién cuenta para la regalía.</strong>{" "}
                {contrato.royaltySeatPolicy
                  ? POLITICA[contrato.royaltySeatPolicy] || contrato.royaltySeatPolicy
                  : "Sin política fijada."}
              </p>
            </Tarjeta>

            <Tarjeta>
              <TarjetaCabecera titulo="Tus precios son tuyos" />
              <p className="contrato__aviso">
                CGuard Pro no fija ni limita lo que cobras a tus clientes. Las cifras
                de arriba son sólo la relación entre tu empresa y CGuard Pro.
              </p>
            </Tarjeta>
          </>
        )}
      </EstadoDeDatos>
    </section>
  );
}

export default Contrato;
