import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import {
  Boton, Cifra, EstadoDeDatos, Pildora, Tarjeta, TarjetaCabecera, TodaviaNo,
} from "@/components/ui/kit";
import { companiesService, type Cupo, type Empresa } from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import { fechaCorta } from "@/lib/dinero";
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

export function Companies() {
  const navigate = useNavigate();
  const { me, puede } = useResellerAuth();
  const t = useT();

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
      else setError(e?.message || t("empresas.noCargo"));
    } finally {
      setCargando(false);
    }
  }, [t]);

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
          <TarjetaCabecera titulo={t("empresas.bloqueadaTitulo")} />
          <p className="empresas__nota">{t("empresas.bloqueadaNota")}</p>
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
                ? t("empresas.porQueNoActiva")
                : !puede("reseller.company.create")
                  ? t("empresas.porQueNoRol")
                  : !cupo?.canCreate
                    ? t("empresas.porQueNoCupo")
                    : undefined
            }
          >
            {t("empresas.alta")}
          </Boton>
        }
      />

      {cupo && (
        <div className="empresas__cifras">
          <Cifra etiqueta={t("empresas.titulo")} valor={cupo.used} />
          <Cifra
            etiqueta={t("empresas.tuLimite")}
            valor={cupo.unlimited ? t("comun.sinLimite") : cupo.max}
          />
          <Cifra
            etiqueta={t("empresas.teQuedan")}
            /* `null` es SIN LÍMITE. Pintar «0» aquí sería decirle a quien no
               tiene límite que no le queda ninguna. */
            valor={cupo.unlimited ? t("comun.sinLimite") : cupo.remaining}
          />
        </div>
      )}

      {cupo && !cupo.unlimited && !cupo.canCreate && (
        <div className="empresas__aviso">
          {t(cupo.max === 1 ? "empresas.topeUno" : "empresas.topeVarios", { n: cupo.max ?? 0 })}
        </div>
      )}

      {!activo && (
        <div className="empresas__aviso">{t("empresas.noActiva")}</div>
      )}

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={!cargando && filas.length === 0}
        etiquetaVacio={t("empresas.vacio")}
        onReintentar={cargar}
      >
        <div className="empresas__lista">
          {filas.map((e) => (
            <Link key={e.id} to={`/companies/${e.id}`} className="empresa">
              <div className="empresa__principal">
                <span className="empresa__nombre">{e.name || t("empresas.sinNombre")}</span>
                {e.businessTitle && e.businessTitle !== e.name && (
                  <span className="empresa__razon">{e.businessTitle}</span>
                )}
              </div>
              <div className="empresa__meta">
                {[e.city, e.country].filter(Boolean).join(", ") || "—"}
              </div>
              <div className="empresa__meta">{t("empresas.altaFecha", { f: fechaCorta(e.createdAt) })}</div>
              <div>
                {e.suspendedAt ? (
                  <Pildora tono="peligro">{t("empresas.suspendida")}</Pildora>
                ) : (
                  <Pildora tono="ok">{t("empresas.activa")}</Pildora>
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
  const t = useT();
  return (
    <header className="cabecera">
      <div>
        <h1 className="cabecera__titulo">{t("empresas.titulo")}</h1>
        <p className="cabecera__sub">{t("empresas.sub")}</p>
      </div>
      {accion}
    </header>
  );
}

export default Companies;
