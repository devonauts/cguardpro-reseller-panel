import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useResellerAuth } from "@/auth/ResellerAuthContext";
import { etiquetaDeEstado } from "@/components/StatusPill";
import {
  Boton, EstadoDeDatos, Icono, Panel, Pildora, Tarjeta, TarjetaCabecera,
} from "@/components/cristal";
import {
  Avatar, BaldosaDeAccion, Grafica, Tabla, TablaCelda, TablaFila,
  TarjetaDeMetrica, TarjetaPromocional,
} from "@/components/panel";
import { fechaCorta } from "@/lib/dinero";
import { useT } from "@/i18n/IdiomaProvider";
import { etiquetaIntl } from "@/i18n/idioma";
import {
  companiesService, domainsService, resellerService, usageService,
  type DominioDelSocio, type Empresa, type ResellerDashboard,
} from "@/services/resellerService";
import "./Dashboard.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL TABLERO
 *
 * ── LO QUE NO SALE AQUÍ ───────────────────────────────────────────────────
 * Nada operativo de sus empresas: ni incidentes, ni pánicos, ni ubicaciones,
 * ni rondas, ni mensajes, ni desempeño. Un socio es el dueño COMERCIAL de unas
 * empresas de seguridad; no es su jefe de operaciones.
 *
 * ── Y NINGUNA CIFRA INVENTADA ─────────────────────────────────────────────
 * Cada número de esta pantalla sale de un dato real:
 *
 *   Empresas   · `dashboard.companies.total`
 *   Usuarios   · los contabilizados en el último mes CERRADO
 *   Dominios   · la lista de direcciones del socio
 *   Ingresos   · NO HAY. El motor de regalías no existe todavía, así que la
 *                tarjeta lo dice. Un «$0» se leería como una medición, y aquí
 *                la medición es dinero que alguien va a reclamar.
 *
 * La gráfica se deriva de las fechas de alta REALES de sus empresas; no hay
 * endpoint de series y no hace falta inventarlo.
 * ════════════════════════════════════════════════════════════════════════════
 */

/* Abreviados: doce nombres completos no caben en el eje y se recortarían con
   puntos suspensivos, que es peor que abreviarlos bien. */
const MESES = [
  "mesCorto.1", "mesCorto.2", "mesCorto.3", "mesCorto.4", "mesCorto.5", "mesCorto.6",
  "mesCorto.7", "mesCorto.8", "mesCorto.9", "mesCorto.10", "mesCorto.11", "mesCorto.12",
] as const;

export function Dashboard() {
  const { me } = useResellerAuth();
  const t = useT();

  const [datos, setDatos] = useState<ResellerDashboard | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [dominios, setDominios] = useState<DominioDelSocio[]>([]);
  const [usuarios, setUsuarios] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** El portero comercial puede negar la lectura entera; no es un fallo. */
  const [bloqueadoPorEstado, setBloqueadoPorEstado] = useState<string | null>(null);

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
      const [emp, dom, uso] = await Promise.allSettled([
        companiesService.list({ limit: 100 }),
        domainsService.listar(),
        usageService.list({ limit: 1 }),
      ]);
      if (emp.status === "fulfilled") setEmpresas(emp.value.rows ?? []);
      if (dom.status === "fulfilled") setDominios(dom.value.dominios ?? []);
      if (uso.status === "fulfilled") {
        setUsuarios(uso.value.periods?.[0]?.totalRoyaltySeats ?? null);
      }
    } catch (e: any) {
      if (e?.status === 403 && e?.resellerStatus) setBloqueadoPorEstado(e.resellerStatus);
      else setError(e?.message || t("resumen.noCargo"));
    } finally {
      setCargando(false);
    }
  }, [t]);

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

  const altaDeEsteMes = (() => {
    const ahora = new Date();
    return empresas.filter((e) => {
      const d = e.createdAt ? new Date(e.createdAt) : null;
      return d && !Number.isNaN(d.getTime())
        && d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear();
    }).length;
  })();

  /* Doce meses del año en curso, contados sobre las fechas de alta reales. */
  const anio = new Date().getFullYear();
  const serie = MESES.map((clave, i) => ({
    etiqueta: t(clave),
    valor: empresas.filter((e) => {
      const d = e.createdAt ? new Date(e.createdAt) : null;
      return d && !Number.isNaN(d.getTime()) && d.getFullYear() === anio && d.getMonth() === i;
    }).length,
  }));

  const conectados = dominios.filter((d) => d.isActive).length;
  const recientes = [...empresas]
    .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")))
    .slice(0, 5);

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
              nota={t("tablero.esteMes", { n: altaDeEsteMes })}
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
              icono="globo"
              etiqueta={t("tablero.dominios")}
              valor={dominios.length}
              nota={t("tablero.dominiosNota", { n: conectados })}
              a="/domains"
            />
            {/* EL HUECO DECLARADO. Aquí es donde sería fácil —y equivocado—
                poner un «$0» para que la fila no se vea coja. */}
            <TarjetaDeMetrica
              icono="tarjeta"
              etiqueta={t("tablero.ingresos")}
              valor="—"
              nota={t("tablero.ingresosNota")}
              a="/billing"
            />
          </div>

          <div className="tablero__dos">
            <Panel
              titulo={t("tablero.crecimiento")}
              nota={t("tablero.crecimientoSub")}
              acciones={<span className="tablero__enlace-panel">{anio}</span>}
            >
              <Grafica datos={serie} etiquetaAccesible={t("tablero.crecimientoSub")} />
            </Panel>

            <Panel titulo={t("tablero.accionesRapidas")}>
              <div className="baldosas">
                <BaldosaDeAccion icono="mas" etiqueta={t("empresas.alta")} a="/companies/new" />
                <BaldosaDeAccion icono="globo" etiqueta={t("tablero.conectarDominio")} a="/domains" />
                <BaldosaDeAccion icono="paleta" etiqueta={t("tablero.personalizarMarca")} a="/branding" />
                <BaldosaDeAccion icono="personas" etiqueta={t("tablero.gestionarEquipo")} a="/team" />
              </div>
            </Panel>
          </div>

          <div className="tablero__dos">
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
                          <Avatar nombre={e.name || "?"} tamano={28} />
                          {e.name || t("empresas.sinNombre")}
                        </Link>
                      </TablaCelda>
                      <TablaCelda etiqueta={t("tablero.columnaEstado")}>
                        <Pildora tono={e.suspendedAt ? "peligro" : "ok"}>
                          {t(e.suspendedAt ? "empresas.suspendida" : "empresas.activa")}
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
                dominios.slice(0, 4).map((d) => (
                  <div key={d.id} className="tablero__dominio">
                    <span className="tablero__dominio-icono"><Icono nombre="globo" tamano={17} /></span>
                    <span className="tablero__dominio-host">{d.hostname}</span>
                    <Pildora tono={d.isActive ? "ok" : "aviso"}>
                      {t(d.isActive ? "dominios.conectado" : "dominios.dnsRequerida")}
                    </Pildora>
                  </div>
                ))
              )}
            </Panel>
          </div>

          <div className="tablero__dos">
            <TarjetaPromocional />

            <Panel titulo={t("tablero.ayudaTitulo")} nota={t("tablero.ayudaSub")}>
              <div className="baldosas">
                <BaldosaDeAccion
                  icono="libro"
                  etiqueta={t("tablero.documentacion")}
                  href="https://cguardpro.com"
                />
                <BaldosaDeAccion
                  icono="auriculares"
                  etiqueta={t("tablero.contactar")}
                  href="mailto:support@cguardpro.com"
                />
                {/* Sugerencias va a soporte con un asunto puesto: no hay tablero
                    de peticiones, y un enlace a uno que no existe sería peor. */}
                <BaldosaDeAccion
                  icono="bocadillo"
                  etiqueta={t("tablero.sugerencias")}
                  href="mailto:support@cguardpro.com?subject=Feature%20request"
                />
              </div>
            </Panel>
          </div>
        </div>
      </EstadoDeDatos>
    </>
  );
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
