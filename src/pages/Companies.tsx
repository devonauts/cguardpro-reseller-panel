import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import {
  Boton, EstadoDeDatos, Icono, Lista, Panel, Pildora, type Tono,
} from "@/components/cristal";
import { EnlaceParaClientes } from "@/components/panel/Enlace";
import type { Clave } from "@/i18n/idioma";
import {
  cobroAEmpresasService, companiesService, type Cupo, type Empresa,
} from "@/services/resellerService";
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

/** El estado de cobro que se enseña en la fila, cuando el socio cobra por la plataforma. */
const COBRO: Record<string, { tono: Tono; texto: Clave }> = {
  trialing: { tono: "neutro", texto: "cobros.estadoPrueba" },
  active: { tono: "ok", texto: "cobros.estadoAlDia" },
  past_due: { tono: "aviso", texto: "cobros.estadoMora" },
  paused: { tono: "peligro", texto: "cobros.estadoPausada" },
  exempt: { tono: "neutro", texto: "cobros.estadoExenta" },
};

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
  const [buscar, setBuscar] = useState("");
  /* El estado de COBRO de cada empresa, si el socio cobra por la plataforma.
     Es lo que más pregunta quien opera el negocio: ¿me paga o no? */
  const [cobro, setCobro] = useState<Record<string, string> | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    setBloqueadoPorEstado(null);
    try {
      const [r, c] = await Promise.all([
        companiesService.list({ limit: 100 }),
        cobroAEmpresasService.leer().catch(() => null),
      ]);
      setFilas(r.rows ?? []);
      setCupo(r.quota ?? null);
      setCobro(c && c.gateway?.status === "connected" && c.pricing
        ? Object.fromEntries(c.companies.map((x) => [x.tenantId, x.status]))
        : null);
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

  const q = buscar.trim().toLowerCase();
  const visibles = q
    ? filas.filter((e) => [e.name, e.businessTitle, e.city, e.email]
      .some((v) => String(v || "").toLowerCase().includes(q)))
    : filas;

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
        {/* El cupo en UNA línea con su barra: tres tarjetas enormes para tres
            números que se leen juntos («4 de 10, te quedan 6») pesaban más que
            la lista, que es a lo que se viene. */}
        {cupo && (
          <div className="empresas__cupo">
            <span className="empresas__cupo-texto">
              {cupo.unlimited
                ? t("empresas.cupoSinLimite", { n: cupo.used })
                : t("empresas.cupo", { n: cupo.used, max: cupo.max ?? 0, quedan: cupo.remaining ?? 0 })}
            </span>
            {!cupo.unlimited && (
              <span className="empresas__cupo-barra" aria-hidden="true">
                <span style={{ width: `${Math.min(100, (cupo.used / Math.max(1, cupo.max ?? 1)) * 100)}%` }} />
              </span>
            )}
          </div>
        )}

        <EnlaceParaClientes compacto />

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
          <div className="empresas__herramientas">
            <input
              type="search"
              className="empresas__buscar"
              placeholder={t("empresas.buscar")}
              aria-label={t("empresas.buscar")}
              value={buscar}
              onChange={(ev) => setBuscar(ev.target.value)}
            />
          </div>
          <div className="empresa empresa--cabecera" aria-hidden="true">
            <span>{t("empresas.colEmpresa")}</span>
            <span>{t("empresas.colUbicacion")}</span>
            <span>{t("empresas.colAlta")}</span>
            <span>{t("empresas.colEstado")}</span>
          </div>
          <Lista como="ul">
            {visibles.map((e) => {
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
                      ) : cobro?.[e.id] && COBRO[cobro[e.id]] ? (
                        <Pildora tono={COBRO[cobro[e.id]].tono}>{t(COBRO[cobro[e.id]].texto)}</Pildora>
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
