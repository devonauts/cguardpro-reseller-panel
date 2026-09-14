import { useCallback, useEffect, useState } from "react";
import DesgloseDeExclusiones from "@/components/DesgloseDeExclusiones";
import {
  Boton, Cifra, EstadoDeDatos, Tarjeta, TarjetaCabecera, TodaviaNo,
} from "@/components/ui/kit";
import { usageService, type PeriodoDeUso } from "@/services/resellerService";
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

const MES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function tituloDePeriodo(label: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(label);
  if (!m) return label;
  return `${MES[Number(m[2]) - 1]} de ${m[1]}`;
}

function fecha(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" });
}

export function Usage() {
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
      setError(e?.message || "No se pudo cargar tu consumo.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const actual = periodos.find((p) => p.periodId === abierto) ?? periodos[0] ?? null;

  return (
    <>
      <header className="cabecera">
        <div>
          <h1 className="cabecera__titulo">Consumo</h1>
          <p className="cabecera__sub">
            Los usuarios contabilizados en cada mes ya cerrado.
          </p>
        </div>
      </header>

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={!cargando && periodos.length === 0}
        etiquetaVacio="Todavía no se ha cerrado ningún mes."
        onReintentar={cargar}
      >
        {periodos.length > 0 && (
          <>
            <nav className="uso__meses" aria-label="Meses cerrados">
              {periodos.map((p) => (
                <Boton
                  key={p.periodId}
                  variante={p.periodId === actual?.periodId ? "primario" : "suave"}
                  onClick={() => setAbierto(p.periodId)}
                >
                  {tituloDePeriodo(p.period.label)}
                </Boton>
              ))}
            </nav>

            {actual && (
              <>
                <div className="uso__cifras">
                  <Cifra
                    etiqueta="Usuarios contabilizados"
                    valor={actual.totalRoyaltySeats}
                    nota={`${actual.tenants.length} ${actual.tenants.length === 1 ? "empresa" : "empresas"}`}
                  />
                  <Cifra
                    etiqueta="Periodo"
                    valor={tituloDePeriodo(actual.period.label)}
                    nota={`${actual.period.start} → ${actual.period.end}`}
                  />
                  <Cifra
                    etiqueta="Contado el"
                    valor={fecha(actual.snapshotTakenAt)}
                    nota="Esta cifra ya no cambia"
                  />
                </div>

                <p className="uso__nota">
                  Es una foto del último día del mes: quien estaba activo ese día
                  cuenta entero, y quien ya no estaba no cuenta. No se reparte por
                  días. Modalidad contratada: <code>{actual.seatPolicy}</code>.
                </p>

                {actual.tenants.length === 0 ? (
                  <TodaviaNo>
                    Ese mes no hubo ninguna empresa que contabilizar.
                  </TodaviaNo>
                ) : (
                  <div className="uso__empresas">
                    {actual.tenants.map((t) => (
                      <Tarjeta key={t.tenantId}>
                        <TarjetaCabecera
                          titulo={t.tenantName || t.tenantId}
                          nota={
                            t.sourceMemberships !== null
                              ? `${t.sourceMemberships} cuentas · ${t.royaltySeats} contabilizadas`
                              : `${t.royaltySeats} contabilizadas`
                          }
                        />
                        <DesgloseDeExclusiones
                          excluded={t.excluded}
                          sourceMemberships={t.sourceMemberships}
                          royaltySeats={t.royaltySeats}
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
