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
import { FilaDeslizable, type AccionDeFila } from "@/components/empresas/FilaDeslizable";
import { MenuDeAcciones, type OpcionDeMenu } from "@/components/empresas/MenuDeAcciones";
import { EliminarEmpresa } from "@/components/empresas/EliminarEmpresa";
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
  /* Activas o archivadas: dos listas, como Mail y su «Archivo». Archivar saca
     a la empresa de la de todos los días sin perderla. */
  const [vista, setVista] = useState<"activas" | "archivadas">("activas");
  const [aEliminar, setAEliminar] = useState<Empresa | null>(null);
  /* El aviso de abajo, con su «Deshacer»: archivar es instantáneo (también al
     deslizar del todo), así que tiene que poder volverse atrás al momento. */
  const [aviso, setAviso] = useState<{ texto: string; deshacer?: () => void } | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    setBloqueadoPorEstado(null);
    try {
      const [r, c] = await Promise.all([
        companiesService.list({ limit: 100, archived: vista === "archivadas" }),
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
  }, [t, vista]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (!aviso) return undefined;
    const reloj = window.setTimeout(() => setAviso(null), 6000);
    return () => window.clearTimeout(reloj);
  }, [aviso]);

  const nombreDe = (e: Empresa) => e.name || t("empresas.sinNombre");

  const archivar = async (e: Empresa) => {
    // Se quita de la vista YA; si el servidor falla, vuelve y se dice.
    setFilas((xs) => xs.filter((x) => x.id !== e.id));
    if (abierta === e.id) setAbierta(null);
    try {
      await companiesService.archive(e.id);
      setAviso({
        texto: t("bajaEmpresa.archivada", { nombre: nombreDe(e) }),
        deshacer: async () => {
          setAviso(null);
          try { await companiesService.restore(e.id); } finally { cargar(); }
        },
      });
    } catch (err: any) {
      setAviso({ texto: err?.message || t("bajaEmpresa.noSeArchivo") });
      cargar();
    }
  };

  const restaurar = async (e: Empresa) => {
    setFilas((xs) => xs.filter((x) => x.id !== e.id));
    try {
      await companiesService.restore(e.id);
      setAviso({ texto: t("bajaEmpresa.restaurada", { nombre: nombreDe(e) }) });
    } catch (err: any) {
      setAviso({ texto: err?.message || t("bajaEmpresa.noSeRestauro") });
      cargar();
    }
  };

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
  const puedeEditar = puede("reseller.company.update");
  const puedeDarDeBaja = puede("reseller.company.suspend");

  const accionesDeFila = (e: Empresa): AccionDeFila[] => (puedeDarDeBaja ? [
    vista === "activas"
      ? { clave: "archivar", etiqueta: t("bajaEmpresa.archivar"), icono: "archivo", tono: "neutro", onAccion: () => archivar(e) }
      : { clave: "restaurar", etiqueta: t("bajaEmpresa.restaurar"), icono: "restaurar", tono: "aviso", onAccion: () => restaurar(e) },
    { clave: "eliminar", etiqueta: t("bajaEmpresa.eliminar"), icono: "papelera", tono: "peligro", onAccion: () => setAEliminar(e) },
  ] : []);

  const opcionesDeMenu = (e: Empresa): OpcionDeMenu[] => [
    { clave: "ficha", etiqueta: t("bajaEmpresa.verDetalle"), icono: "edificio", onElegir: () => navigate(`/companies/${e.id}`) },
    ...(puedeEditar && vista === "activas"
      ? [{ clave: "editar", etiqueta: t("bajaEmpresa.editar"), icono: "lapiz" as const, onElegir: () => navigate(`/companies/${e.id}?editar=1`) }]
      : []),
    ...(puedeDarDeBaja ? [
      vista === "activas"
        ? { clave: "archivar", etiqueta: t("bajaEmpresa.archivar"), icono: "archivo" as const, onElegir: () => archivar(e) }
        : { clave: "restaurar", etiqueta: t("bajaEmpresa.restaurar"), icono: "restaurar" as const, onElegir: () => restaurar(e) },
      { clave: "eliminar", etiqueta: t("bajaEmpresa.eliminar"), icono: "papelera" as const, peligro: true, onElegir: () => setAEliminar(e) },
    ] : []),
  ];

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
        {/* The company cap is enforced but never shown (product decision):
            only how many companies there are. */}
        {cupo && (
          <div className="empresas__cupo">
            <span className="empresas__cupo-texto">{t("empresas.total", { n: cupo.used })}</span>
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

        <div className="empresas__herramientas">
          <div className="empresas__vistas" role="tablist" aria-label={t("bajaEmpresa.vistas")}>
            {(["activas", "archivadas"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={vista === v}
                className={`empresas__vista${vista === v ? " empresas__vista--activa" : ""}`}
                onClick={() => { setVista(v); setAbierta(null); }}
              >
                {t(v === "activas" ? "bajaEmpresa.activas" : "bajaEmpresa.archivadas")}
              </button>
            ))}
          </div>
          <input
            type="search"
            className="empresas__buscar"
            placeholder={t("empresas.buscar")}
            aria-label={t("empresas.buscar")}
            value={buscar}
            onChange={(ev) => setBuscar(ev.target.value)}
          />
        </div>

        <EstadoDeDatos
          cargando={cargando}
          error={error}
          vacio={!cargando && filas.length === 0}
          etiquetaVacio={t(vista === "archivadas" ? "bajaEmpresa.sinArchivadas" : "empresas.vacio")}
          onReintentar={cargar}
        >
          {/* `como="ul"`: ahora cada empresa es un `<li>` que contiene su fila
              Y lo desplegado, y un `<li>` suelto dentro de un `<div>` no es
              marcado válido. La hoja ya venía preparada (`list-style: none`). */}
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
                  <FilaDeslizable acciones={accionesDeFila(e)}>
                  <div className="empresa-fila">
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
                  {/* Los tres puntos: ratón y teclado. En el teléfono, además,
                      se desliza la fila (ver FilaDeslizable). */}
                  <div className="empresa-fila__menu">
                    <MenuDeAcciones
                      etiqueta={t("bajaEmpresa.acciones", { nombre: nombreDe(e) })}
                      opciones={opcionesDeMenu(e)}
                    />
                  </div>
                  </div>
                  </FilaDeslizable>

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

      <EliminarEmpresa
        empresa={aEliminar}
        abierto={!!aEliminar}
        onCerrar={() => setAEliminar(null)}
        onEliminada={() => {
          const e = aEliminar;
          setAEliminar(null);
          if (e) {
            setFilas((xs) => xs.filter((x) => x.id !== e.id));
            setAviso({ texto: t("bajaEmpresa.eliminada", { nombre: nombreDe(e) }) });
          }
          cargar();
        }}
      />

      {aviso && (
        <div className="aviso-inferior" role="status">
          <span>{aviso.texto}</span>
          {aviso.deshacer && (
            <button type="button" className="aviso-inferior__accion" onClick={aviso.deshacer}>
              {t("bajaEmpresa.deshacer")}
            </button>
          )}
        </div>
      )}
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
