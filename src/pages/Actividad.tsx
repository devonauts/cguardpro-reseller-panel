import { useCallback, useEffect, useState } from "react";

import { Boton, EstadoDeDatos, Tarjeta, TarjetaCabecera, Pildora } from "@/components/ui/kit";
import { fechaYHora } from "@/lib/dinero";
import { portalService, type ActividadDelSocio, type LineaDeActividad } from "@/services/resellerService";
import "./Actividad.css";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * ACTIVIDAD — EL HISTORIAL ADMINISTRATIVO DE LA CUENTA
 *
 * ── LO QUE ESTO NO ES ─────────────────────────────────────────────────────
 * No es actividad operativa. Aquí no hay un vigilante fichando, ni una ronda,
 * ni un incidente, ni un pánico: eso ocurre DENTRO de las empresas y un socio
 * no tiene autoridad operativa sobre ninguna. La propiedad comercial no da
 * acceso a la operación, y esta pantalla es donde más fácil sería confundirlo
 * — por eso lo dice en la cabecera y no sólo en un comentario.
 *
 * Lo que sí hay: qué se cambió en la marca, qué empresa se dio de alta, qué
 * decidió CGuardPro sobre el ciclo de vida de la cuenta.
 *
 * ── SE PAGINA ─────────────────────────────────────────────────────────────
 * Este registro crece con cada acción. Una pantalla que se lo traiga entero
 * funciona el primer mes y se cae el segundo.
 * ════════════════════════════════════════════════════════════════════════════
 */

/** Los identificadores de acción que sabemos nombrar en español. */
const ACCION: Record<string, string> = {
  "branding.draft.update": "Borrador de marca guardado",
  "branding.asset.upload": "Imagen de marca subida",
  "branding.asset.remove": "Imagen de marca quitada",
  "branding.publish": "Marca publicada",
  "reseller.company.create": "Empresa dada de alta",
  "reseller.company.create_on_behalf": "Empresa dada de alta por CGuard Pro",
  "reseller.status.begin_onboarding": "Alta iniciada",
  "reseller.status.activate": "Cuenta activada",
  "reseller.status.mark_past_due": "Cuenta marcada como vencida",
  "reseller.status.restrict": "Cuenta restringida",
  "reseller.status.restore": "Cuenta restablecida",
  "reseller.status.suspend": "Cuenta suspendida",
  "reseller.status.reinstate": "Cuenta reactivada",
};

/** Un identificador sin traducir se enseña tal cual: mejor crudo que inventado. */
const nombreDeAccion = (a: string) => ACCION[a] || a;

function Detalles({ d }: { d: Record<string, unknown> | null }) {
  if (!d) return null;
  const pares = Object.entries(d);
  if (!pares.length) return null;
  return (
    <ul className="actividad__detalles">
      {pares.map(([k, v]) => (
        <li key={k}>
          <span className="actividad__clave">{k}</span>
          {/* Siempre texto. El servidor ya recorta a valores simples, pero
              pintar una variable sin convertirla es exactamente cómo se cuela
              un objeto en un hijo de React. */}
          <span className="actividad__valor">
            {Array.isArray(v) ? v.join(", ") : String(v)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Actividad() {
  const [datos, setDatos] = useState<ActividadDelSocio | null>(null);
  const [pagina, setPagina] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (p: number) => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await portalService.actividad(p, 25));
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar tu actividad.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(pagina); }, [cargar, pagina]);

  const filas: LineaDeActividad[] = datos?.rows ?? [];
  const total = datos?.totalPages ?? 1;

  return (
    <section className="pagina">
      <header className="pagina__cabecera">
        <h1>Actividad</h1>
        <p className="pagina__nota">
          Lo que ha pasado en tu cuenta de distribuidor: marca, empresas y
          decisiones de CGuard Pro. No incluye la operación de tus empresas
          —rondas, incidentes o fichajes—, que vive en cada una de ellas.
        </p>
      </header>

      <Tarjeta>
        <TarjetaCabecera
          titulo="Historial"
          nota={datos ? `${datos.count} ${datos.count === 1 ? "registro" : "registros"}` : undefined}
        />
        <EstadoDeDatos
          cargando={cargando}
          error={error}
          vacio={!cargando && !error && filas.length === 0}
          etiquetaVacio="Todavía no hay actividad registrada en tu cuenta."
          onReintentar={() => cargar(pagina)}
        >
          <ul className="actividad__lista">
            {filas.map((f) => (
              <li key={f.id} className="actividad__fila">
                <div className="actividad__cab">
                  <span className="actividad__accion">{nombreDeAccion(f.action)}</span>
                  {f.statusCode && f.statusCode >= 400 && (
                    <Pildora tono="peligro">Error</Pildora>
                  )}
                </div>
                <div className="actividad__meta">
                  <span>{fechaYHora(f.at)}</span>
                  {f.actorEmail && <span>· {f.actorEmail}</span>}
                  {f.targetType && <span>· {f.targetType}</span>}
                </div>
                <Detalles d={f.details} />
              </li>
            ))}
          </ul>

          {total > 1 && (
            <nav className="actividad__paginas" aria-label="Páginas de actividad">
              <Boton
                variante="suave"
                disabled={pagina === 0 || cargando}
                onClick={() => setPagina((p) => Math.max(0, p - 1))}
              >
                Anterior
              </Boton>
              <span className="actividad__contador">
                Página {pagina + 1} de {total}
              </span>
              <Boton
                variante="suave"
                disabled={pagina + 1 >= total || cargando}
                onClick={() => setPagina((p) => p + 1)}
              >
                Siguiente
              </Boton>
            </nav>
          )}
        </EstadoDeDatos>
      </Tarjeta>
    </section>
  );
}

export default Actividad;
