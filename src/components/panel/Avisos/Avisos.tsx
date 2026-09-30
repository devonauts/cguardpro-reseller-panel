import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";

import { Icono, type NombreDeIcono } from "@/components/cristal";
import { useIdioma } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import { ejeDelGesto, type Eje } from "@/lib/deslizar";
import { alVolverLaConexion, escuchar } from "@/lib/tiempoReal";
import { notificacionesService, type Notificacion } from "@/services/resellerService";
import { Deslizable } from "./Deslizable";
import { organizar, type Pila } from "./organizar";
import "./Avisos.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * LA CAMPANA — el centro de avisos del panel.
 *
 * Los avisos viven en el servidor, por persona, con su leído/no leído, y llegan
 * EN VIVO por el websocket (`reseller:aviso`): el contador sube y la campana se
 * mueve sin recargar nada. Pulsar uno lo marca leído y lleva a su pantalla.
 *
 * ── UN CAJÓN, NO UN DESPLEGABLE (2026-09-30) ──────────────────────────────
 * Era un desplegable colgado de la campana y los textos largos se salían de
 * él. Ahora es el cajón de la DERECHA de la campana del CRM, que es lo que el
 * dueño quería: como el centro de notificaciones de Apple.
 *   · Nuevas arriba; lo leído por día (hoy · ayer · antes);
 *   · los seguidos del mismo tipo se APILAN y se despliegan («Mostrar más»);
 *   · cada uno se quita DESLIZANDO a la izquierda (dedo o ratón); una pila
 *     cerrada se quita entera, como iOS;
 *   · el cajón se cierra con la X, Escape, tocando fuera o ARRASTRÁNDOLO a la
 *     derecha.
 *
 * Quitar no borra nada en el servidor: marca leído y lo oculta en ESTE
 * navegador (la lista de quitados se guarda en local).
 *
 * Además se reparte un evento del navegador (`socio:aviso`) para que la
 * pantalla abierta —Soporte— se refresque sola.
 * ════════════════════════════════════════════════════════════════════════════
 */

export const EVENTO_AVISO = "socio:aviso";

const TITULO: Record<string, Clave> = {
  "ticket.respuesta": "notificaciones.ticketRespuesta",
  "ticket.en_curso": "notificaciones.ticketEnCurso",
  "ticket.resuelto": "notificaciones.ticketResuelto",
  "ticket.reabierto": "notificaciones.ticketReabierto",
  "cobro.pasarela": "notificaciones.pasarelaRota",
};

const iconoDe = (tipo: string): NombreDeIcono =>
  tipo.startsWith("ticket.") ? "auriculares" : tipo.startsWith("cobro.") ? "tarjeta" : "campana";

const CLAVE_QUITADOS = "cguard_reseller_avisos_quitados";
function leerQuitados(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(CLAVE_QUITADOS) || "[]")); } catch { return new Set(); }
}
function guardarQuitados(s: Set<string>): void {
  // Los últimos 300 bastan: la lista del servidor trae 30.
  try { localStorage.setItem(CLAVE_QUITADOS, JSON.stringify([...s].slice(-300))); } catch { /* sin almacenamiento */ }
}

/** «hace 5 min», «ayer»… en el idioma del panel. */
function haceCuanto(iso: string, idioma: string): string {
  const seg = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(idioma, { numeric: "auto" });
  const abs = Math.abs(seg);
  if (abs < 45) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(seg / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seg / 3600), "hour");
  if (abs < 7 * 86400) return rtf.format(Math.round(seg / 86400), "day");
  return new Date(iso).toLocaleDateString(idioma, { day: "numeric", month: "short" });
}

export function Avisos() {
  const { t, idioma } = useIdioma();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [filas, setFilas] = useState<Notificacion[]>([]);
  const [noLeidos, setNoLeidos] = useState(0);
  const [fallo, setFallo] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [timbre, setTimbre] = useState(false);
  const [quitados, setQuitados] = useState<Set<string>>(leerQuitados);
  const [desplegadas, setDesplegadas] = useState<Set<string>>(new Set());
  const temporizador = useRef<number | null>(null);
  const campana = useRef<HTMLButtonElement>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await notificacionesService.lista(30);
      setFilas(r.rows ?? []);
      setNoLeidos(r.noLeidos ?? 0);
      setFallo(false);
    } catch {
      setFallo(true);
    } finally {
      setCargado(true);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  // En vivo: el aviso entra arriba, sube el contador y la campana se mueve.
  useEffect(() => {
    const quitar = escuchar("reseller:aviso", (a: Notificacion) => {
      if (!a || !a.id) return;
      setFilas((l) => [a, ...l.filter((x) => x.id !== a.id)].slice(0, 30));
      if (!a.leido) setNoLeidos((n) => n + 1);
      setTimbre(true);
      if (temporizador.current) window.clearTimeout(temporizador.current);
      temporizador.current = window.setTimeout(() => setTimbre(false), 1200);
      window.dispatchEvent(new CustomEvent(EVENTO_AVISO, { detail: a }));
    });
    const alVolver = alVolverLaConexion(() => { void cargar(); });
    return () => {
      quitar();
      alVolver();
      if (temporizador.current) window.clearTimeout(temporizador.current);
    };
  }, [cargar]);

  const cerrar = useCallback(() => {
    setAbierto(false);
    campana.current?.focus();
  }, []);

  // Escape cierra, y la página de detrás no se desplaza mientras está abierto.
  useEffect(() => {
    if (!abierto) return undefined;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); };
    document.addEventListener("keydown", tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = antes;
    };
  }, [abierto, cerrar]);

  const marcarLeidos = (ids: string[]) => {
    const pendientes = filas.filter((x) => ids.includes(x.id) && !x.leido).map((x) => x.id);
    if (!pendientes.length) return;
    setFilas((l) => l.map((x) => (pendientes.includes(x.id) ? { ...x, leido: true } : x)));
    setNoLeidos((n) => Math.max(0, n - pendientes.length));
    notificacionesService.marcarLeidas(pendientes).catch(() => { /* se reintenta al abrir */ });
  };

  const abrir = (a: Notificacion) => {
    setAbierto(false);
    marcarLeidos([a.id]);
    if (a.enlace) navigate(a.enlace);
  };

  const quitar = (ids: string[]) => {
    marcarLeidos(ids);
    setQuitados((s) => {
      const n = new Set(s);
      ids.forEach((id) => n.add(id));
      guardarQuitados(n);
      return n;
    });
  };

  const marcarTodo = async () => {
    setFilas((l) => l.map((x) => ({ ...x, leido: true })));
    setNoLeidos(0);
    try { await notificacionesService.marcarLeidas(); } catch { void cargar(); }
  };

  const bandeja = useMemo(() => organizar(filas, quitados), [filas, quitados]);
  const vacio = bandeja.nuevas.length === 0 && bandeja.secciones.length === 0;
  const contador = noLeidos > 9 ? "9+" : String(noLeidos);

  const alternarPila = (clave: string) =>
    setDesplegadas((s) => {
      const n = new Set(s);
      if (n.has(clave)) n.delete(clave); else n.add(clave);
      return n;
    });

  const fila = (a: Notificacion) => (
    <button
      type="button"
      className={`aviso${a.leido ? "" : " aviso--nuevo"}`}
      onClick={() => abrir(a)}
    >
      <span className="aviso__icono" aria-hidden="true"><Icono nombre={iconoDe(a.tipo)} tamano={16} /></span>
      <span className="aviso__cuerpo">
        <span className="aviso__linea">
          <span className="aviso__titulo">
            {TITULO[a.tipo] ? t(TITULO[a.tipo]) : t("notificaciones.generico")}
          </span>
          <span className="aviso__cuando">{haceCuanto(a.createdAt, idioma)}</span>
        </span>
        {a.datos?.asunto && <span className="aviso__detalle">{a.datos.asunto}</span>}
        {a.datos?.respuesta && <span className="aviso__respuesta">{a.datos.respuesta}</span>}
      </span>
      {!a.leido && <span className="aviso__punto" aria-label={t("notificaciones.sinLeer")} />}
    </button>
  );

  const pila = (p: Pila) => {
    const [primero, ...resto] = p.avisos;
    if (!resto.length) {
      return <Deslizable key={p.clave} onQuitar={() => quitar([primero.id])}>{fila(primero)}</Deslizable>;
    }
    const abiertaP = desplegadas.has(p.clave);
    return (
      <div key={p.clave} className={`pila${abiertaP ? " pila--abierta" : ""}`}>
        {abiertaP ? (
          <>
            <div className="pila__cabecera">
              <span>{TITULO[p.tipo] ? t(TITULO[p.tipo]) : t("notificaciones.generico")} · {p.avisos.length}</span>
              <button type="button" className="pila__menos" onClick={() => alternarPila(p.clave)}>
                {t("notificaciones.mostrarMenos")}
              </button>
            </div>
            {p.avisos.map((a) => (
              <Deslizable key={a.id} onQuitar={() => quitar([a.id])}>{fila(a)}</Deslizable>
            ))}
          </>
        ) : (
          <>
            {/* Cerrada, se desliza la pila ENTERA, como en iOS. */}
            <Deslizable onQuitar={() => quitar(p.avisos.map((a) => a.id))}>{fila(primero)}</Deslizable>
            <button type="button" className="pila__mas" onClick={() => alternarPila(p.clave)}>
              <span className="pila__cantos" aria-hidden="true" />
              {t("notificaciones.mostrarMas", { n: resto.length })}
            </button>
          </>
        )}
      </div>
    );
  };

  const DIA: Record<string, Clave> = {
    hoy: "notificaciones.hoy", ayer: "notificaciones.ayer", antes: "notificaciones.antes",
  };

  return (
    <div className="avisos">
      <button
        ref={campana}
        type="button"
        className={`avisos__boton${timbre ? " avisos__boton--timbre" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-label={noLeidos > 0
          ? t("notificaciones.abrirConPendientes", { n: noLeidos })
          : t("notificaciones.titulo")}
        onClick={() => {
          if (!abierto) void cargar();
          setAbierto((v) => !v);
        }}
      >
        <Icono nombre="campana" tamano={18} />
        {noLeidos > 0 && <span className="avisos__contador" aria-hidden="true">{contador}</span>}
      </button>

      {abierto && createPortal(
        <Cajon titulo={t("notificaciones.titulo")} cerrarRotulo={t("notificaciones.cerrar")} onCerrar={cerrar}>
          <div className="cajon__cabecera">
            <div className="cajon__titulos">
              <h2 className="cajon__titulo">{t("notificaciones.titulo")}</h2>
              {noLeidos > 0 && <span className="cajon__cuenta">{t("notificaciones.sinLeerN", { n: noLeidos })}</span>}
            </div>
            <button type="button" className="cajon__cerrar" aria-label={t("notificaciones.cerrar")} onClick={cerrar}>
              <Icono nombre="mas" tamano={18} className="cajon__x" />
            </button>
          </div>
          {noLeidos > 0 && (
            <button type="button" className="cajon__marcar" onClick={marcarTodo}>
              <Icono nombre="visto" tamano={14} />
              {t("notificaciones.marcarTodo")}
            </button>
          )}

          <div className="cajon__lista">
            {!cargado ? (
              <div aria-hidden="true">{[0, 1, 2].map((i) => <div key={i} className="aviso__esqueleto" />)}</div>
            ) : fallo && filas.length === 0 ? (
              <p className="cajon__vacio">{t("notificaciones.noCargo")}</p>
            ) : vacio ? (
              <div className="cajon__vacio">
                <Icono nombre="campana" tamano={26} />
                <span>{t("notificaciones.vacio")}</span>
              </div>
            ) : (
              <>
                {bandeja.nuevas.length > 0 && (
                  <section className="cajon__seccion">
                    <h3 className="cajon__dia">{t("notificaciones.nuevas")}</h3>
                    {bandeja.nuevas.map(pila)}
                  </section>
                )}
                {bandeja.secciones.map((s) => (
                  <section key={s.dia} className="cajon__seccion">
                    <h3 className="cajon__dia">{t(DIA[s.dia])}</h3>
                    {s.pilas.map(pila)}
                  </section>
                ))}
                <p className="cajon__pista">{t("notificaciones.pistaDeslizar")}</p>
              </>
            )}
          </div>

          <Link to="/activity" className="cajon__pie" onClick={() => setAbierto(false)}>
            <Icono nombre="libro" tamano={15} />
            {t("notificaciones.verActividad")}
          </Link>
        </Cajon>,
        document.body,
      )}
    </div>
  );
}

/**
 * El cajón: velo detrás, lámina de cristal por la derecha. Se ARRASTRA a la
 * derecha para cerrarlo (dedo o ratón); hacia la izquierda no se mueve, que ese
 * gesto es de las filas (quitar un aviso).
 */
function Cajon({ titulo, cerrarRotulo, onCerrar, children }: {
  titulo: string; cerrarRotulo: string; onCerrar: () => void; children: React.ReactNode;
}) {
  const [dx, setDx] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const inicio = useRef<{ x: number; y: number; t: number; ancho: number } | null>(null);
  const eje = useRef<Eje>(null);
  const lamina = useRef<HTMLDivElement>(null);

  useEffect(() => { lamina.current?.focus(); }, []);

  const soltar = (x: number) => {
    const i = inicio.current;
    inicio.current = null;
    setArrastrando(false);
    if (!i || eje.current !== "horizontal") { setDx(0); return; }
    const d = Math.max(0, x - i.x);
    const rapido = d / Math.max(1, performance.now() - i.t) > 0.6 && d > 40;
    if (d > i.ancho * 0.35 || rapido) { setDx(i.ancho); window.setTimeout(onCerrar, 180); }
    else setDx(0);
  };

  return (
    <div className="cajon-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div
        ref={lamina}
        className={`cajon${arrastrando ? " cajon--arrastrando" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        style={{ transform: dx ? `translate3d(${dx}px,0,0)` : undefined }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          inicio.current = { x: e.clientX, y: e.clientY, t: performance.now(), ancho: e.currentTarget.getBoundingClientRect().width };
          eje.current = null;
        }}
        onPointerMove={(e) => {
          const i = inicio.current;
          if (!i) return;
          if (!eje.current) {
            eje.current = ejeDelGesto(e.clientX - i.x, e.clientY - i.y);
            // Sólo a la DERECHA arrastra el cajón; a la izquierda es de la fila.
            if (eje.current !== "horizontal" || e.clientX - i.x < 0) { inicio.current = null; return; }
            setArrastrando(true);
          }
          setDx(Math.max(0, e.clientX - i.x));
        }}
        onPointerUp={(e) => soltar(e.clientX)}
        onPointerCancel={() => { inicio.current = null; setArrastrando(false); setDx(0); }}
      >
        <span className="cajon__asa" aria-hidden="true" title={cerrarRotulo} />
        {children}
      </div>
    </div>
  );
}

export default Avisos;
