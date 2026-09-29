import { FormEvent, useCallback, useEffect, useId, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Boton, Campo, EstadoDeDatos, Pildora, Selector, Tarjeta, TarjetaCabecera, type Tono } from "@/components/cristal";
import { Pagina } from "@/components/panel";
import { EVENTO_AVISO } from "@/components/panel/Avisos";
import { fechaYHora } from "@/lib/dinero";
import {
  companiesService, soporteService,
  type CategoriaDeTicket, type Empresa, type PrioridadDeTicket, type TicketDeSoporte,
} from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import "./Soporte.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SOPORTE — LOS TICKETS DEL SOCIO A LA PLATAFORMA
 *
 * El socio abre un ticket cuando algo falla en SU plataforma o con una de SUS
 * empresas. Llega al superadmin por correo, SMS y la campana; la respuesta
 * vuelve aquí y al correo del socio.
 *
 * ── LA EMPRESA ES OPCIONAL, Y SÓLO LAS SUYAS ──────────────────────────────
 * El desplegable sale de `/reseller/companies`, y el servidor comprueba igual
 * que la empresa sea del socio: el desplegable es comodidad, no la garantía.
 * ════════════════════════════════════════════════════════════════════════════
 */

const CATEGORIAS: CategoriaDeTicket[] = ["problema", "pregunta", "sugerencia", "facturacion", "otro"];
const PRIORIDADES: PrioridadDeTicket[] = ["normal", "alta", "baja"];

const TONO: Record<TicketDeSoporte["status"], Tono> = {
  open: "aviso", in_progress: "aviso", resolved: "ok", closed: "neutro",
};

function FormularioDeTicket({ empresas, onCreado }: {
  empresas: Empresa[];
  onCreado: (t: TicketDeSoporte) => void;
}) {
  const t = useT();
  const idMensaje = useId();
  const [asunto, setAsunto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [categoria, setCategoria] = useState<CategoriaDeTicket>("problema");
  const [prioridad, setPrioridad] = useState<PrioridadDeTicket>("normal");
  const [empresa, setEmpresa] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    if (!asunto.trim() || !mensaje.trim()) { setError(t("soporte.faltan")); return; }
    setEnviando(true);
    setError(null);
    setEnviado(false);
    try {
      const creado = await soporteService.crear({
        subject: asunto.trim(),
        message: mensaje.trim(),
        category: categoria,
        priority: prioridad,
        tenantId: empresa || undefined,
        pageUrl: window.location.href,
      });
      onCreado(creado);
      setAsunto("");
      setMensaje("");
      setEmpresa("");
      setCategoria("problema");
      setPrioridad("normal");
      setEnviado(true);
    } catch (err: any) {
      setError(err?.message || t("comun.noSePudo"));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Tarjeta>
      <TarjetaCabecera titulo={t("soporte.nuevo")} nota={t("soporte.nuevoNota")} />
      <form className="soporte__form" onSubmit={enviar} noValidate>
        <Campo
          etiqueta={t("soporte.asunto")}
          ayuda={t("soporte.asuntoAyuda")}
          value={asunto}
          maxLength={200}
          onChange={(e) => setAsunto(e.target.value)}
        />

        <div className="soporte__fila">
          <Selector
            etiqueta={t("soporte.categoria")}
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaDeTicket)}
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>{t(`soporte.cat.${c}` as Clave)}</option>
            ))}
          </Selector>
          <Selector
            etiqueta={t("soporte.prioridad")}
            value={prioridad}
            onChange={(e) => setPrioridad(e.target.value as PrioridadDeTicket)}
          >
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>{t(`soporte.prio.${p}` as Clave)}</option>
            ))}
          </Selector>
        </div>

        {empresas.length > 0 && (
          <Selector
            etiqueta={t("soporte.empresa")}
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
          >
            <option value="">{t("soporte.empresaNinguna")}</option>
            {empresas.map((em) => (
              <option key={em.id} value={em.id}>{em.name || em.id}</option>
            ))}
          </Selector>
        )}

        {/* Mismo material que `Campo`: sus clases, no una receta nueva. */}
        <div className="campo">
          <label className="campo__etiqueta" htmlFor={idMensaje}>{t("soporte.mensaje")}</label>
          <div className="campo__caja">
            <textarea
              id={idMensaje}
              className="campo__control soporte__mensaje"
              rows={6}
              maxLength={5000}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="soporte__error" role="alert">{error}</p>}
        {enviado && <p className="soporte__ok" role="status">{t("soporte.enviado")}</p>}

        <div className="soporte__acciones">
          <Boton type="submit" cargando={enviando}>{t("soporte.enviar")}</Boton>
        </div>
      </form>
    </Tarjeta>
  );
}

export function Soporte() {
  const t = useT();
  const [tickets, setTickets] = useState<TicketDeSoporte[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [params] = useSearchParams();
  const destacado = params.get("ticket");

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    setError(null);
    try {
      setTickets((await soporteService.lista()).rows ?? []);
    } catch (e: any) {
      if (!silencioso) setError(e?.message || t("soporte.noCargo"));
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, [t]);

  useEffect(() => { cargar(); }, [cargar]);

  /* Llega un aviso por el websocket (el superadmin cambió o contestó un
     ticket): la lista se refresca SOLA, sin esqueleto ni parpadeo. */
  useEffect(() => {
    const alAviso = () => { void cargar(true); };
    window.addEventListener(EVENTO_AVISO, alAviso);
    return () => window.removeEventListener(EVENTO_AVISO, alAviso);
  }, [cargar]);

  /* Desde la campana se llega con `?ticket=<id>`: ése se centra y se resalta. */
  useEffect(() => {
    if (!destacado || cargando) return;
    /* Un instante después y SIN animación: al cerrarse la campana devuelve el
       foco a su botón, y eso cancelaba un desplazamiento suave lanzado antes.
       El halo del ticket ya dice cuál es. */
    const id = window.setTimeout(() => {
      document.getElementById(`ticket-${destacado}`)?.scrollIntoView({ block: "center" });
    }, 300);
    return () => window.clearTimeout(id);
  }, [destacado, cargando]);

  useEffect(() => {
    let vivo = true;
    companiesService.list({ limit: 100 })
      .then((r) => { if (vivo) setEmpresas(r.rows ?? []); })
      .catch(() => { /* sin empresas, el ticket va sin empresa */ });
    return () => { vivo = false; };
  }, []);

  return (
    <Pagina titulo={t("soporte.titulo")} nota={t("soporte.nota")}>
      <div className="soporte">
        <FormularioDeTicket empresas={empresas} onCreado={(n) => setTickets((l) => [n, ...l])} />

        <Tarjeta>
          <TarjetaCabecera titulo={t("soporte.misTickets")} />
          <EstadoDeDatos
            cargando={cargando}
            error={error}
            vacio={!cargando && !error && tickets.length === 0}
            etiquetaVacio={t("soporte.vacio")}
            onReintentar={() => cargar()}
          >
            <ul className="soporte__lista">
              {tickets.map((k) => (
                <li
                  key={k.id}
                  id={`ticket-${k.id}`}
                  className={`soporte__ticket${k.id === destacado ? " soporte__ticket--destacado" : ""}`}
                >
                  <div className="soporte__cab">
                    <span className="soporte__asunto">{k.subject}</span>
                    <Pildora tono={TONO[k.status] ?? "neutro"}>
                      {t(`soporte.estado.${k.status}` as Clave)}
                    </Pildora>
                  </div>
                  <div className="soporte__meta">
                    <span>{fechaYHora(k.createdAt)}</span>
                    <span>· {t(`soporte.cat.${k.category}` as Clave)}</span>
                    {k.tenant?.name && <span>· {k.tenant.name}</span>}
                  </div>
                  <p className="soporte__texto">{k.message}</p>
                  {k.reply ? (
                    <div className="soporte__respuesta">
                      <span className="soporte__respuesta-titulo">{t("soporte.respuesta")}</span>
                      <p>{k.reply}</p>
                    </div>
                  ) : (
                    <p className="soporte__pendiente">{t("soporte.sinRespuesta")}</p>
                  )}
                </li>
              ))}
            </ul>
          </EstadoDeDatos>
        </Tarjeta>
      </div>
    </Pagina>
  );
}

export default Soporte;
