import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useResellerAuth } from "@/auth/ResellerAuthContext";
import useModoOscuro from "@/branding/useModoOscuro";
import { logoDeCabecera } from "@/branding/marcaDelSocio";
import { etiquetaDeEstado } from "@/components/StatusPill";
import {
  EstadoDeDatos, Icono, Panel, Pildora, Tarjeta, TarjetaCabecera, type NombreDeIcono,
} from "@/components/cristal";
import {
  Avatar, BaldosaDeAccion, Grafica, Tabla, TablaCelda, TablaFila, TarjetaDeMetrica,
} from "@/components/panel";
import { fechaCorta } from "@/lib/dinero";
import { estadoDeDominio } from "@/lib/estadoDeDominio";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import { etiquetaIntl } from "@/i18n/idioma";
import { EnlaceParaClientes } from "@/components/panel/Enlace";
import {
  brandingService, cobroAEmpresasService, companiesService, domainsService, resellerService, usageService,
  type Cupo, type DominioDelSocio, type Empresa, type Marca, type ResellerDashboard,
} from "@/services/resellerService";
import "./Dashboard.scss";
import { anioYMes, zonaDeLaPlataforma } from "@/lib/horaDeLaPlataforma";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL TABLERO
 *
 * Es el tablero de quien VENDE una plataforma con su marca. Lo que tiene que
 * contestar, por este orden:
 *
 *   1. ¿Mi plataforma está lista para enseñársela a un cliente?  → «Tu plataforma»
 *   2. ¿Qué ven hoy mis clientes?                                 → «Tu marca»
 *   3. ¿Cómo va el negocio?          → las cifras, las empresas y la gráfica
 *
 * ── LO QUE NO SALE AQUÍ ───────────────────────────────────────────────────
 * Nada operativo de sus empresas: ni incidentes, ni pánicos, ni ubicaciones,
 * ni rondas, ni mensajes, ni desempeño. Un socio es el dueño COMERCIAL de unas
 * empresas de seguridad; no es su jefe de operaciones. Tampoco publicidad de
 * CGuard Pro: el panel es su herramienta de trabajo, no un escaparate nuestro.
 *
 * ── Y NINGUNA CIFRA INVENTADA ─────────────────────────────────────────────
 * Cada número sale de un dato real. No hay tarjeta de ingresos: el motor de
 * regalías no existe todavía, y un «$0» —o un «—» ocupando el sitio de una
 * cifra— se lee como una medición. En su sitio va el cupo de empresas, que sí
 * está medido y es lo que limita cuánto puede vender.
 *
 * La lista de «Tu plataforma» se deriva de la marca PUBLICADA: lo que está en
 * el borrador no lo ve ningún cliente, así que todavía no cuenta como hecho.
 * ════════════════════════════════════════════════════════════════════════════
 */

/* Abreviados: doce nombres completos no caben en el eje y se recortarían con
   puntos suspensivos, que es peor que abreviarlos bien. */
const MESES = [
  "mesCorto.1", "mesCorto.2", "mesCorto.3", "mesCorto.4", "mesCorto.5", "mesCorto.6",
  "mesCorto.7", "mesCorto.8", "mesCorto.9", "mesCorto.10", "mesCorto.11", "mesCorto.12",
] as const;

interface Paso {
  id: string;
  hecho: boolean;
  titulo: Clave;
  nota: Clave;
  a: string;
}

export function Dashboard() {
  const { me, puede } = useResellerAuth();
  const t = useT();
  const oscuro = useModoOscuro();

  const [datos, setDatos] = useState<ResellerDashboard | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cupo, setCupo] = useState<Cupo | null>(null);
  const [dominios, setDominios] = useState<DominioDelSocio[]>([]);
  const [usuarios, setUsuarios] = useState<number | null>(null);
  /** `null` = sin permiso para leer la marca, o la lectura falló. */
  const [marca, setMarca] = useState<{ publicada: Marca | null; pendiente: boolean } | null>(null);
  /** ¿Cobra ya a sus empresas por la plataforma? `null` = no se pudo saber. */
  const [cobraEmpresas, setCobraEmpresas] = useState<boolean | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** El portero comercial puede negar la lectura entera; no es un fallo. */
  const [bloqueadoPorEstado, setBloqueadoPorEstado] = useState<string | null>(null);

  const leeMarca = puede("reseller.branding.manage");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    setBloqueadoPorEstado(null);
    try {
      const resumen = await resellerService.dashboard();
      setDatos(resumen);

      /* Lo de los lados NO puede tumbar el tablero: si la lista de dominios
         falla, el resumen sigue siendo útil. Por eso van en `allSettled` y
         cada uno se rellena sólo si salió bien. */
      const [emp, dom, uso, mar, cob] = await Promise.allSettled([
        companiesService.list({ limit: 100 }),
        domainsService.listar(),
        usageService.list({ limit: 1 }),
        leeMarca ? brandingService.obtener() : Promise.resolve(null),
        cobroAEmpresasService.leer(),
      ]);
      setCobraEmpresas(cob.status === "fulfilled"
        ? cob.value.gateway?.status === "connected" && !!cob.value.pricing
        : null);
      if (emp.status === "fulfilled") {
        setEmpresas(emp.value.rows ?? []);
        setCupo(emp.value.quota ?? null);
      }
      if (dom.status === "fulfilled") setDominios(dom.value.dominios ?? []);
      if (uso.status === "fulfilled") {
        setUsuarios(uso.value.periods?.[0]?.totalRoyaltySeats ?? null);
      }
      setMarca(mar.status === "fulfilled" && mar.value
        ? { publicada: mar.value.published, pendiente: mar.value.hasUnpublishedChanges }
        : null);
    } catch (e: any) {
      if (e?.status === 403 && e?.resellerStatus) setBloqueadoPorEstado(e.resellerStatus);
      else setError(e?.message || t("resumen.noCargo"));
    } finally {
      setCargando(false);
    }
  }, [t, leeMarca]);

  useEffect(() => { cargar(); }, [cargar]);

  const persona = me?.user.firstName
    || me?.user.fullName?.split(" ")[0]
    || me?.user.email?.split("@")[0]
    || "";

  /* Mañana, tarde o noche según la hora de QUIEN MIRA. No se pregunta al
     servidor: su reloj está en otro sitio y diría «buenas noches» a mediodía. */
  const hora = new Date().getHours();
  const saludo = hora < 12 ? "tablero.saludoManana"
    : hora < 19 ? "tablero.saludoTarde"
    : "tablero.saludoNoche";

  if (bloqueadoPorEstado) {
    return (
      <>
        <Cabecera saludo={t(saludo, { nombre: persona })} />
        <Tarjeta>
          <TarjetaCabecera
            titulo={t("resumen.bloqueada", {
              estado: etiquetaDeEstado(bloqueadoPorEstado).toLowerCase(),
            })}
          />
          <p className="tablero__vacio">
            {me?.reseller.statusReason || t("resumen.bloqueadaNota")}
          </p>
        </Tarjeta>
      </>
    );
  }

  /* El mes de cada alta, en la hora de la plataforma: el mismo mes que dicen
     las facturas (ver lib/horaDeLaPlataforma). */
  const ahora = anioYMes(new Date());
  const mesDe = (v: string | null | undefined) => {
    const d = v ? new Date(v) : null;
    return d && !Number.isNaN(d.getTime()) ? anioYMes(d) : null;
  };
  const altaDeEsteMes = empresas.filter((e) => {
    const m = mesDe(e.createdAt);
    return m && m.mes === ahora.mes && m.anio === ahora.anio;
  }).length;

  /* Doce meses del año en curso, contados sobre las fechas de alta reales. */
  const anio = ahora.anio;
  const serie = MESES.map((clave, i) => ({
    etiqueta: t(clave),
    valor: empresas.filter((e) => {
      const m = mesDe(e.createdAt);
      return m && m.anio === anio && m.mes === i + 1;
    }).length,
  }));

  const conectados = dominios.filter((d) => d.isActive);
  /* La dirección que se le enseña: la principal si está viva; si no, la
     primera que funcione. Una dirección sin conectar no se ofrece para abrir. */
  const direccion = (conectados.find((d) => d.isPrimary) ?? conectados[0])?.hostname ?? null;

  const recientes = [...empresas]
    .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")))
    .slice(0, 5);

  /* La marca que VEN sus clientes. `/me` la trae siempre, ya resuelta; la
     lectura completa (con el asistente y los cambios pendientes) sólo llega a
     quien puede gestionarla. */
  const vista = me?.branding ?? null;
  const publicada = marca?.publicada ?? null;
  const logo = logoDeCabecera(vista, oscuro);
  const soporte = vista?.supportEmail || vista?.supportPhone || vista?.supportUrl || null;

  const pasos: Paso[] = [
    { id: "nombre", hecho: !!vista?.platformName, titulo: "tablero.pasoNombre",
      nota: "tablero.pasoNombreNota", a: "/branding" },
    { id: "logo", hecho: !!(vista?.assets?.fullLight || vista?.assets?.fullDark),
      titulo: "tablero.pasoLogo", nota: "tablero.pasoLogoNota", a: "/branding" },
    { id: "icono", hecho: !!vista?.assets?.favicon, titulo: "tablero.pasoIcono",
      nota: "tablero.pasoIconoNota", a: "/branding" },
    { id: "color", hecho: vista?.brandHue !== null && vista?.brandHue !== undefined,
      titulo: "tablero.pasoColor", nota: "tablero.pasoColorNota", a: "/branding" },
    { id: "soporte", hecho: !!soporte, titulo: "tablero.pasoSoporte",
      nota: "tablero.pasoSoporteNota", a: "/branding" },
    { id: "dominio", hecho: conectados.length > 0, titulo: "tablero.pasoDominio",
      nota: "tablero.pasoDominioNota", a: "/domains" },
    /* El asistente sólo se puede comprobar con la lectura completa de la marca.
       Sin ella el paso NO sale: marcarlo pendiente sería afirmar algo que no
       se ha mirado. */
    ...(marca ? [{ id: "asistente", hecho: !!publicada?.agentName,
      titulo: "tablero.pasoAsistente" as Clave, nota: "tablero.pasoAsistenteNota" as Clave,
      a: "/assistant" }] : []),
    /* Cobrar a sus empresas es lo que convierte la plataforma en un negocio.
       Sólo sale si se pudo leer: marcarlo pendiente sin mirar sería mentir. */
    ...(cobraEmpresas === null ? [] : [{ id: "cobro", hecho: cobraEmpresas,
      titulo: "tablero.pasoCobro" as Clave, nota: "tablero.pasoCobroNota" as Clave, a: "/company-billing" }]),
    { id: "empresa", hecho: (datos?.companies.total ?? 0) > 0, titulo: "tablero.pasoEmpresa",
      nota: "tablero.pasoEmpresaNota", a: "/companies/new" },
  ];
  const hechos = pasos.filter((p) => p.hecho).length;
  /* Lo pendiente arriba: es lo único de la lista sobre lo que hay que actuar. */
  const ordenados = [...pasos.filter((p) => !p.hecho), ...pasos.filter((p) => p.hecho)];

  return (
    <>
      <Cabecera saludo={t(saludo, { nombre: persona })} />

      <EstadoDeDatos cargando={cargando} error={error} onReintentar={cargar}>
        <div className="tablero">
          <div className="tablero__metricas">
            <TarjetaDeMetrica
              icono="edificio"
              etiqueta={t("resumen.empresas")}
              valor={datos?.companies.total ?? 0}
              nota={t("tablero.empresasNota", {
                activas: datos?.companies.active ?? 0, n: altaDeEsteMes,
              })}
              a="/companies"
            />
            <TarjetaDeMetrica
              icono="personas"
              etiqueta={t("tablero.usuarios")}
              valor={usuarios ?? "—"}
              nota={usuarios === null ? t("tablero.sinPeriodo") : t("tablero.usuariosNota")}
              a="/usage"
            />
            <TarjetaDeMetrica
              icono="corona"
              etiqueta={t("tablero.cupo")}
              valor={!cupo ? "—" : cupo.unlimited ? t("tablero.sinLimite") : (cupo.remaining ?? 0)}
              nota={cupo ? t("tablero.cupoNota", { n: cupo.used }) : undefined}
              a="/entitlements"
            />
            <TarjetaDeMetrica
              icono="globo"
              etiqueta={t("tablero.dominios")}
              valor={dominios.length}
              nota={t("tablero.dominiosNota", { n: conectados.length })}
              a="/domains"
            />
          </div>

          {/* La puerta del negocio, arriba: por aquí entran sus clientes. */}
          <EnlaceParaClientes />

          <div className="tablero__dos">
            <Panel
              className="lanzamiento"
              titulo={t("tablero.plataforma")}
              nota={hechos === pasos.length
                ? t("tablero.plataformaLista")
                : t("tablero.plataformaSub")}
              acciones={
                <span className="lanzamiento__cuenta">
                  {t("tablero.progreso", { hechos, total: pasos.length })}
                </span>
              }
            >
              <div
                className="lanzamiento__barra"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={pasos.length}
                aria-valuenow={hechos}
                aria-label={t("tablero.plataforma")}
              >
                <span style={{ width: `${(hechos / pasos.length) * 100}%` }} />
              </div>

              {marca?.pendiente && (
                <Link to="/branding" className="lanzamiento__aviso">
                  <Icono nombre="paleta" tamano={16} />
                  <span>{t("tablero.sinPublicar")}</span>
                  <strong>{t("tablero.revisarYPublicar")}</strong>
                </Link>
              )}

              <ul className="lanzamiento__pasos">
                {ordenados.map((p) => (
                  <li
                    key={p.id}
                    className={`lanzamiento__paso${p.hecho ? " lanzamiento__paso--hecho" : ""}`}
                  >
                    <span className="lanzamiento__marca" aria-hidden="true">
                      {p.hecho && <Icono nombre="visto" tamano={13} />}
                    </span>
                    <span className="lanzamiento__texto">
                      <span className="lanzamiento__titulo">{t(p.titulo)}</span>
                      {!p.hecho && <span className="lanzamiento__nota">{t(p.nota)}</span>}
                    </span>
                    {!p.hecho && (
                      <Link to={p.a} className="tablero__enlace-panel">
                        {t("tablero.configurar")}
                        <Icono nombre="flecha" tamano={15} />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel
              className="ficha-marca"
              titulo={t("tablero.tuMarca")}
              nota={t("tablero.tuMarcaSub")}
            >
              <div className="ficha-marca__escaparate">
                {logo ? (
                  <img src={logo} alt={vista?.platformName ?? ""} className="ficha-marca__logo" />
                ) : (
                  <span className="ficha-marca__nombre">
                    {vista?.platformName || me?.reseller.displayName || t("tablero.sinConfigurar")}
                  </span>
                )}
                {vista?.loginTagline && (
                  <span className="ficha-marca__lema">{vista.loginTagline}</span>
                )}
              </div>

              <dl className="ficha-marca__datos">
                <Dato icono="globo" etiqueta={t("tablero.marcaDireccion")}>
                  {direccion ? (
                    <a href={`https://${direccion}`} target="_blank" rel="noreferrer"
                       className="ficha-marca__host">{direccion}</a>
                  ) : <Falta />}
                </Dato>
                <Dato icono="paleta" etiqueta={t("tablero.marcaColor")}>
                  {vista?.brandHue !== null && vista?.brandHue !== undefined ? (
                    <span className="ficha-marca__color">
                      <span className="ficha-marca__muestra" />
                      {`${t("marca.colorTono")} ${vista.brandHue}°`}
                    </span>
                  ) : <Falta />}
                </Dato>
                <Dato icono="auriculares" etiqueta={t("tablero.marcaSoporte")}>
                  {soporte ?? <Falta />}
                </Dato>
                {marca && (
                  <Dato icono="bocadillo" etiqueta={t("tablero.marcaAsistente")}>
                    {publicada?.agentName ?? t("tablero.asistenteDeFabrica")}
                  </Dato>
                )}
                <Dato icono="sol" etiqueta={t("tablero.marcaPublicada")}>
                  {vista?.publishedAt ? fechaCorta(vista.publishedAt) : t("tablero.sinPublicarNunca")}
                </Dato>
              </dl>

              <div className="ficha-marca__acciones">
                <Link to="/branding" className="btn btn--primario">
                  <Icono nombre="paleta" tamano={16} />
                  {t("tablero.editarMarca")}
                </Link>
                {direccion && (
                  <a href={`https://${direccion}`} target="_blank" rel="noreferrer" className="btn">
                    {t("tablero.abrirPlataforma")}
                    <Icono nombre="flecha" tamano={15} />
                  </a>
                )}
              </div>
            </Panel>
          </div>

          {/* Dos PILAS y no dos filas: cada fila emparejaba paneles de alturas
              distintas y el corto dejaba un hueco. Apilados por columna, la
              diferencia la absorbe el último panel de la columna más corta. */}
          <div className="tablero__dos">
            <div className="tablero__pila">
              <Panel
                titulo={t("tablero.empresasRecientes")}
                acciones={<EnlaceVerTodo a="/companies" />}
              >
                {recientes.length === 0 ? (
                  <p className="tablero__vacio">{t("empresas.vacio")}</p>
                ) : (
                  <Tabla
                    etiqueta={t("tablero.empresasRecientes")}
                    columnas={[
                      t("tablero.columnaNombre"),
                      t("tablero.columnaEstado"),
                      t("tablero.columnaAlta"),
                    ]}
                  >
                    {recientes.map((e) => (
                      <TablaFila key={e.id}>
                        <TablaCelda etiqueta={t("tablero.columnaNombre")} principal>
                          <Link to={`/companies/${e.id}`} className="tablero__enlace-panel">
                            <Avatar nombre={e.name || "?"} tamano={26} />
                            {e.name || t("empresas.sinNombre")}
                          </Link>
                        </TablaCelda>
                        <TablaCelda etiqueta={t("tablero.columnaEstado")}>
                          {/* Tres estados, no dos: una empresa que su dueño todavía
                              no ha terminado de configurar no está «activa» para el
                              socio — es a quien tiene que llamar esta semana. */}
                          <Pildora tono={e.suspendedAt ? "peligro" : e.onboardingCompleted ? "ok" : "aviso"}>
                            {t(e.suspendedAt ? "empresas.suspendida"
                              : e.onboardingCompleted ? "empresas.activa" : "tablero.configurando")}
                          </Pildora>
                        </TablaCelda>
                        <TablaCelda etiqueta={t("tablero.columnaAlta")}>
                          {fechaCorta(e.createdAt)}
                        </TablaCelda>
                      </TablaFila>
                    ))}
                  </Tabla>
                )}
              </Panel>
              <Panel
                titulo={t("tablero.estadoDominios")}
                acciones={<EnlaceVerTodo a="/domains" />}
              >
                {dominios.length === 0 ? (
                  <p className="tablero__vacio">{t("tablero.sinDominios")}</p>
                ) : (
                  dominios.slice(0, 4).map((d) => {
                    const est = estadoDeDominio(d.estado);
                    return (
                      <div key={d.id} className="tablero__dominio">
                        <span className="tablero__dominio-icono"><Icono nombre="globo" tamano={16} /></span>
                        <span className="tablero__dominio-host">{d.hostname}</span>
                        <Pildora tono={est.tono}>{t(est.texto)}</Pildora>
                      </div>
                    );
                  })
                )}
              </Panel>
            </div>
            <div className="tablero__pila">
              <Panel titulo={t("tablero.accionesRapidas")}>
                <div className="baldosas">
                  <BaldosaDeAccion icono="mas" etiqueta={t("empresas.alta")} a="/companies/new" />
                  <BaldosaDeAccion icono="globo" etiqueta={t("tablero.conectarDominio")} a="/domains" />
                  <BaldosaDeAccion icono="personas" etiqueta={t("tablero.gestionarEquipo")} a="/team" />
                  <BaldosaDeAccion icono="grafico" etiqueta={t("tablero.medicion")} a="/analytics" />
                </div>

                {/* La ayuda cabe en una línea: tres enlaces no justifican un panel
                    entero, que era lo que dejaba el tablero con huecos. */}
                <nav className="tablero__ayuda" aria-label={t("tablero.ayudaTitulo")}>
                  <span className="tablero__ayuda-titulo">{t("tablero.ayudaTitulo")}</span>
                  <a href="https://cguardpro.com" target="_blank" rel="noreferrer">
                    <Icono nombre="libro" tamano={15} />{t("tablero.documentacion")}
                  </a>
                  <a href="mailto:support@cguardpro.com">
                    <Icono nombre="auriculares" tamano={15} />{t("tablero.contactar")}
                  </a>
                  {/* Sugerencias va a soporte con un asunto puesto: no hay tablero
                      de peticiones, y un enlace a uno que no existe sería peor. */}
                  <a href="mailto:support@cguardpro.com?subject=Feature%20request">
                    <Icono nombre="bocadillo" tamano={15} />{t("tablero.sugerencias")}
                  </a>
                </nav>
              </Panel>
              <Panel
                titulo={t("tablero.crecimiento")}
                nota={t("tablero.crecimientoSub")}
                acciones={<span className="tablero__enlace-panel">{anio}</span>}
              >
                <Grafica datos={serie} etiquetaAccesible={t("tablero.crecimientoSub")} />
              </Panel>
            </div>
          </div>
        </div>
      </EstadoDeDatos>
    </>
  );
}

/** Una fila de la ficha de marca: icono, rótulo y valor. */
function Dato({
  icono, etiqueta, children,
}: { icono: NombreDeIcono; etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="ficha-marca__dato">
      <dt><Icono nombre={icono} tamano={15} />{etiqueta}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Lo que todavía no se ha configurado. Dicho, no un hueco en blanco. */
function Falta() {
  const t = useT();
  return <span className="ficha-marca__falta">{t("tablero.sinConfigurar")}</span>;
}

function EnlaceVerTodo({ a }: { a: string }) {
  const t = useT();
  return (
    <Link to={a} className="tablero__enlace-panel">
      {t("tablero.verTodo")}
      <Icono nombre="flecha" tamano={15} />
    </Link>
  );
}

function Cabecera({ saludo }: { saludo: string }) {
  /* La píldora de estado NO se repite aquí: ya está en la barra superior, y el
     mismo dato dos veces en la misma pantalla hace dudar de si son el mismo. */
  const t = useT();
  const hoy = new Date().toLocaleDateString(etiquetaIntl(), {
    weekday: "long", year: "numeric", month: "short", day: "numeric",
    timeZone: zonaDeLaPlataforma(),
  });

  return (
    <header className="cabecera">
      <div>
        <h1 className="cabecera__titulo">{saludo}</h1>
        <p className="cabecera__sub">{t("tablero.sub")}</p>
      </div>
      <div className="cabecera__acciones">
        <Tarjeta className="cabecera__fecha">
          <span className="cabecera__fecha-icono"><Icono nombre="sol" tamano={18} /></span>
          <span className="cabecera__fecha-texto">
            <span className="cabecera__fecha-dia">{hoy}</span>
            <span className="cabecera__fecha-nota">{t("tablero.planoDeControl")}</span>
          </span>
        </Tarjeta>
        <Link to="/companies/new" className="btn btn--primario cabecera__alta">
          <Icono nombre="mas" tamano={17} />
          {t("empresas.alta")}
        </Link>
      </div>
    </header>
  );
}

export default Dashboard;
