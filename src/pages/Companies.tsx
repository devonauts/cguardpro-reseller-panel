import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import {
  Boton, Cifra, Cifras, EstadoDeDatos, Icono, Lista, Panel, Pildora,
} from "@/components/cristal";
import { companiesService, type Cupo, type Empresa } from "@/services/resellerService";
import PersonasDeLaEmpresa from "@/components/empresas/PersonasDeLaEmpresa";
import { useT } from "@/i18n/IdiomaProvider";
import { fechaCorta } from "@/lib/dinero";
import "./Companies.scss";

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
  /* UNA abierta a la vez. Con varias, la pantalla se vuelve una lista de
     listas y se pierde de vista cuál es cuál — y además cada una pide sus
     personas al servidor. */
  const [abierta, setAbierta] = useState<string | null>(null);

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
  /* Ver quién entra al CRM y poder cambiarlo son DOS permisos: soporte mira,
     no toca. Si no tiene ni el de ver, el acordeón lo dice en vez de abrirse
     vacío — un panel en blanco se lee como un fallo. */
  const puedeVerPersonas = puede("reseller.company.users.view");
  const puedeGestionarPersonas = puede("reseller.company.users.manage") && activo;

  if (bloqueadoPorEstado) {
    return (
      <>
        <Cabecera />
        <Panel titulo={t("empresas.bloqueadaTitulo")}>
          <p className="empresas__nota">{t("empresas.bloqueadaNota")}</p>
        </Panel>
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

      {/* ── EL RITMO DE LA PÁGINA ──────────────────────────────────────────
          Las cifras, los avisos y la lista eran hermanos sueltos de un
          fragmento, así que la separación entre ellos dependía de QUÉ bloques
          se pintaran: `<Cifras>` no trae margen, y la lista acababa pegada a
          las tarjetas sin un milímetro. Con el contenedor, el hueco es el mismo
          haya cupo o no, haya aviso o no. Es el mismo patrón de Facturación. */}
      <div className="empresas">
        {cupo && (
          <Cifras>
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
          </Cifras>
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
          {/* `como="ul"`: ahora cada empresa es un `<li>` que contiene su fila
              Y lo desplegado, y un `<li>` suelto dentro de un `<div>` no es
              marcado válido. La hoja ya venía preparada (`list-style: none`). */}
          <Lista como="ul">
            {filas.map((e) => {
              const desplegada = abierta === e.id;
              return (
                <li key={e.id} className="empresa-acordeon">
                  {/* La fila ABRE, no navega. La ficha de la empresa sigue a un
                      clic —el enlace de dentro—, pero lo que se viene a hacer a
                      esta pantalla es ver quién hay en cada una: pedir dos
                      pantallas para eso era el paso de más. */}
                  <button
                    type="button"
                    className="empresa lista__fila empresa--abrible"
                    aria-expanded={desplegada}
                    aria-controls={`personas-${e.id}`}
                    onClick={() => setAbierta(desplegada ? null : e.id)}
                  >
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
                    <div className="empresa__estado">
                      {e.suspendedAt ? (
                        <Pildora tono="peligro">{t("empresas.suspendida")}</Pildora>
                      ) : (
                        <Pildora tono="ok">{t("empresas.activa")}</Pildora>
                      )}
                      <Icono
                        nombre="galon"
                        tamano={16}
                        className={`empresa__galon${desplegada ? " empresa__galon--abierto" : ""}`}
                      />
                    </div>
                  </button>

                  {/* Sólo se monta lo desplegado: montar las cuarenta y
                      esconderlas con CSS haría cuarenta peticiones. */}
                  {desplegada && (
                    <div id={`personas-${e.id}`}>
                      {puedeVerPersonas ? (
                        <PersonasDeLaEmpresa tenantId={e.id} puedeGestionar={puedeGestionarPersonas} />
                      ) : (
                        <p className="personas__sinPermiso">{t("personas.sinPermiso")}</p>
                      )}
                      <div className="empresa-acordeon__pie">
                        <Link to={`/companies/${e.id}`}>{t("empresas.verFicha")}</Link>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </Lista>
        </EstadoDeDatos>
      </div>
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
