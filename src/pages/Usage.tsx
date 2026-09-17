import { useCallback, useEffect, useState } from "react";
import DesgloseDeExclusiones from "@/components/DesgloseDeExclusiones";
import {
  Boton, Cifra, EstadoDeDatos, Tarjeta, TarjetaCabecera, TodaviaNo,
} from "@/components/ui/kit";
import { usageService, type PeriodoDeUso } from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import { fechaCorta, mesDelPeriodo } from "@/lib/dinero";
import "./Usage.css";

/**
 * Lo que se ha contado, mes a mes.
 *
 * ── SÓLO MESES CERRADOS ───────────────────────────────────────────────────
 * No hay estimación del mes en curso. Mezclar una cifra que todavía va a
 * cambiar con las ya cerradas haría que se leyeran igual, y ésa es la confusión
 * que más caro sale cuando alguien discute su factura.
 *
 * ── Y NO HAY IMPORTES ─────────────────────────────────────────────────────
 * Aquí no aparece «total a pagar» ni saldo: las facturas son de la fase
 * siguiente. Lo que hay es el consumo contado y POR QUÉ es el que es — que es
 * justo lo que hace falta para que nadie tenga que fiarse.
 */

export function Usage() {
  const t = useT();
  const [periodos, setPeriodos] = useState<PeriodoDeUso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await usageService.list({ limit: 12 });
      setPeriodos(r.periods ?? []);
      setAbierto(r.periods?.[0]?.periodId ?? null);
    } catch (e: any) {
      setError(e?.message || t("consumo.noCargo"));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => { cargar(); }, [cargar]);

  const actual = periodos.find((p) => p.periodId === abierto) ?? periodos[0] ?? null;

  return (
    <>
      <header className="cabecera">
        <div>
          <h1 className="cabecera__titulo">{t("consumo.titulo")}</h1>
          <p className="cabecera__sub">{t("consumo.sub")}</p>
        </div>
      </header>

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={!cargando && periodos.length === 0}
        etiquetaVacio={t("consumo.vacio")}
        onReintentar={cargar}
      >
        {periodos.length > 0 && (
          <>
            <nav className="uso__meses" aria-label={t("consumo.meses")}>
              {periodos.map((p) => (
                <Boton
                  key={p.periodId}
                  variante={p.periodId === actual?.periodId ? "primario" : "suave"}
                  onClick={() => setAbierto(p.periodId)}
                >
                  {mesDelPeriodo(p.period.label)}
                </Boton>
              ))}
            </nav>

            {actual && (
              <>
                <div className="uso__cifras">
                  <Cifra
                    etiqueta={t("consumo.contabilizados")}
                    valor={actual.totalRoyaltySeats}
                    nota={t(
                      actual.tenants.length === 1 ? "consumo.empresaUna" : "consumo.empresasVarias",
                      { n: actual.tenants.length },
                    )}
                  />
                  <Cifra
                    etiqueta={t("consumo.periodo")}
                    valor={mesDelPeriodo(actual.period.label)}
                    nota={`${actual.period.start} → ${actual.period.end}`}
                  />
                  <Cifra
                    etiqueta={t("consumo.contadoEl")}
                    valor={fechaCorta(actual.snapshotTakenAt)}
                    nota={t("consumo.yaNoCambia")}
                  />
                </div>

                <p className="uso__nota">
                  {t("consumo.nota")} <code>{actual.seatPolicy}</code>.
                </p>

                {actual.tenants.length === 0 ? (
                  <TodaviaNo>{t("consumo.sinEmpresas")}</TodaviaNo>
                ) : (
                  <div className="uso__empresas">
                    {actual.tenants.map((e) => (
                      <Tarjeta key={e.tenantId}>
                        <TarjetaCabecera
                          titulo={e.tenantName || e.tenantId}
                          nota={
                            e.sourceMemberships !== null
                              ? t("consumo.cuentasYContadas", {
                                  a: e.sourceMemberships, b: e.royaltySeats,
                                })
                              : t("consumo.soloContadas", { b: e.royaltySeats })
                          }
                        />
                        <DesgloseDeExclusiones
                          excluded={e.excluded}
                          sourceMemberships={e.sourceMemberships}
                          royaltySeats={e.royaltySeats}
                        />
                      </Tarjeta>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </EstadoDeDatos>
    </>
  );
}

export default Usage;
