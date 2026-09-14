import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import {
  Boton, Cifra, EstadoDeDatos, Pildora, Tarjeta, TarjetaCabecera, TodaviaNo,
} from "@/components/ui/kit";
import { companiesService, type Cupo, type Empresa } from "@/services/resellerService";
import "./Companies.css";

/**
 * Las empresas del socio.
 *
 * ── SÓLO LO COMERCIAL ─────────────────────────────────────────────────────
 * Nombre, contacto, cuándo entró. Ni vigilantes conectados, ni incidentes, ni
 * rondas, ni ubicaciones: un socio es el dueño COMERCIAL de estas empresas, no
 * su jefe de operaciones. Si esta pantalla enseñara operación, la frontera que
 * sostiene todo el diseño se rompería aquí, que es donde más natural parecería.
 *
 * ── EL CUPO SE DICE, NO SE MIENTE ─────────────────────────────────────────
 * Sin límite se escribe «sin límite». Poner un 0 sería exactamente lo
 * contrario de la verdad, y es el error fácil cuando el servidor manda `null`.
 */

function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" });
}

export function Companies() {
  const navigate = useNavigate();
  const { me, puede } = useResellerAuth();

  const [filas, setFilas] = useState<Empresa[]>([]);
  const [cupo, setCupo] = useState<Cupo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bloqueadoPorEstado, setBloqueadoPorEstado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    setBloqueadoPorEstado(null);
    try {
      const r = await companiesService.list({ limit: 100 });
      setFilas(r.rows ?? []);
      setCupo(r.quota ?? null);
    } catch (e: any) {
      if (e?.status === 403 && e?.resellerStatus) setBloqueadoPorEstado(e.resellerStatus);
      else setError(e?.message || "No se pudieron cargar tus empresas.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  /* El permiso Y el estado. Los dos son AVISOS: el servidor vuelve a
     comprobarlos y contesta 409 si se le fuerza. Aquí sólo se evita ofrecer un
     botón que va a fallar. */
  const activo = String(me?.reseller.status || "") === "active";
  const puedeCrear = puede("reseller.company.create") && activo && (cupo?.canCreate ?? false);

  if (bloqueadoPorEstado) {
    return (
      <>
        <Cabecera />
        <Tarjeta>
          <TarjetaCabecera titulo="Esta sección no está disponible ahora" />
          <p className="empresas__nota">
            Mientras tu cuenta esté en este estado no puedes ver ni dar de alta
            empresas. Las que ya tienes siguen funcionando con normalidad: esto
            sólo afecta a tu panel.
          </p>
        </Tarjeta>
      </>
    );
  }

  return (
    <>
      <Cabecera
        accion={
          <Boton
            onClick={() => navigate("/companies/new")}
            disabled={!puedeCrear}
            title={
              !activo
                ? "Tu cuenta tiene que estar activa para dar de alta empresas."
                : !puede("reseller.company.create")
                  ? "Tu rol no permite dar de alta empresas."
                  : !cupo?.canCreate
                    ? "Has llegado a tu límite de empresas."
                    : undefined
            }
          >
            Dar de alta una empresa
          </Boton>
        }
      />

      {cupo && (
        <div className="empresas__cifras">
          <Cifra etiqueta="Empresas" valor={cupo.used} />
          <Cifra
            etiqueta="Tu límite"
            valor={cupo.unlimited ? "Sin límite" : cupo.max}
          />
          <Cifra
            etiqueta="Te quedan"
            /* `null` es SIN LÍMITE. Pintar «0» aquí sería decirle a quien no
               tiene límite que no le queda ninguna. */
            valor={cupo.unlimited ? "Sin límite" : cupo.remaining}
          />
        </div>
      )}

      {cupo && !cupo.unlimited && !cupo.canCreate && (
        <div className="empresas__aviso">
          Has llegado a tu límite de {cupo.max}{" "}
          {cupo.max === 1 ? "empresa" : "empresas"}. Habla con tu contacto en la
          plataforma si necesitas ampliarlo.
        </div>
      )}

      {!activo && (
        <div className="empresas__aviso">
          Tu cuenta no está activa, así que no puedes dar de alta empresas
          nuevas. Las que ya tienes no se ven afectadas.
        </div>
      )}

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={!cargando && filas.length === 0}
        etiquetaVacio="Todavía no tienes ninguna empresa dada de alta."
        onReintentar={cargar}
      >
        <div className="empresas__lista">
          {filas.map((e) => (
            <Link key={e.id} to={`/companies/${e.id}`} className="empresa">
              <div className="empresa__principal">
                <span className="empresa__nombre">{e.name || "Sin nombre"}</span>
                {e.businessTitle && e.businessTitle !== e.name && (
                  <span className="empresa__razon">{e.businessTitle}</span>
                )}
              </div>
              <div className="empresa__meta">
                {[e.city, e.country].filter(Boolean).join(", ") || "—"}
              </div>
              <div className="empresa__meta">Alta {fecha(e.createdAt)}</div>
              <div>
                {e.suspendedAt ? (
                  <Pildora tono="peligro">Suspendida</Pildora>
                ) : (
                  <Pildora tono="ok">Activa</Pildora>
                )}
              </div>
            </Link>
          ))}
        </div>
      </EstadoDeDatos>
    </>
  );
}

function Cabecera({ accion }: { accion?: React.ReactNode }) {
  return (
    <header className="cabecera">
      <div>
        <h1 className="cabecera__titulo">Empresas</h1>
        <p className="cabecera__sub">Las empresas que llevas bajo tu marca.</p>
      </div>
      {accion}
    </header>
  );
}

export default Companies;
