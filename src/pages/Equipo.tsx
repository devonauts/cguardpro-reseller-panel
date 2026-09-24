import { useCallback, useEffect, useState } from "react";

import { Boton, Campo, Confirmar, EstadoDeDatos, Lista, ListaFila, Panel, Pildora, Selector, Tarjeta, TarjetaCabecera } from "@/components/cristal";
import { Pagina } from "@/components/panel";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import { fechaYHora } from "@/lib/dinero";
import { estadoDeMiembro } from "@/lib/estadoDeMiembro";
import { descripcionDeRol, nombreDeRol } from "@/lib/rolDeSocio";
import { useT } from "@/i18n/IdiomaProvider";
import {
  teamService, type EquipoDelSocio, type MiembroDelEquipo, type RolDeSocio,
} from "@/services/resellerService";
import "./Equipo.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL EQUIPO — QUIÉN TRABAJA EN LA CUENTA COMERCIAL
 *
 * ── LA DISTINCIÓN QUE HAY QUE DECIR EN VOZ ALTA ───────────────────────────
 * Dar a alguien acceso a este panel NO le da acceso a la operación de las
 * empresas: ni rondas, ni incidentes, ni ubicaciones, ni datos de los clientes
 * de esas empresas. Eso requiere una membresía propia en la empresa, que es
 * otra autoridad y otra tabla. Quien invita tiene que entenderlo antes de
 * invitar, no después.
 *
 * ── ESCONDER NO ES AUTORIZAR ──────────────────────────────────────────────
 * Los botones se ocultan según los permisos efectivos de quien mira, pero eso
 * es comodidad. Quien llame a la API sin permiso recibe un 403 igual, y las
 * reglas del dueño —sólo un dueño toca a otro dueño, el último dueño no se
 * puede degradar ni dar de baja, nadie se da de baja a sí mismo— viven en el
 * servidor. Aquí sólo se pintan sus consecuencias.
 * ════════════════════════════════════════════════════════════════════════════
 */


export function Equipo() {
  const { puede, me } = useResellerAuth();
  const t = useT();
  const [datos, setDatos] = useState<EquipoDelSocio | null>(null);
  const [roles, setRoles] = useState<RolDeSocio[]>([]);
  const [rolPendiente, setRolPendiente] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Formulario de invitación
  const [abierto, setAbierto] = useState(false);
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState("");
  const [enviando, setEnviando] = useState(false);

  const gestiona = puede("reseller.team.manage");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [eq, rl] = await Promise.all([teamService.listar(), teamService.roles()]);
      setDatos(eq);
      setRoles(rl.roles);
      if (!rol && rl.roles.length) setRol("reseller:readonly");
    } catch (e: any) {
      setError(e?.message || t("equipo.noCargo"));
    } finally {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  /** Toda acción pasa por aquí: el error del servidor se ENSEÑA tal cual. */
  const accion = async (id: string, fn: () => Promise<unknown>, exito: string) => {
    setOcupado(id);
    setAviso(null);
    setError(null);
    try {
      await fn();
      setAviso(exito);
      await cargar();
    } catch (e: any) {
      /* El servidor explica por qué («tu cuenta quedaría sin ningún
         propietario activo»). Sustituirlo por un genérico dejaría a la persona
         sin saber qué hacer. */
      setError(e?.message || t("comun.noSePudoAccion"));
    } finally {
      setOcupado(null);
    }
  };

  const invitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setAviso(null);
    setError(null);
    try {
      const r = await teamService.invitar({ email: email.trim(), role: rol });
      /* Tres desenlaces, y se distinguen: la invitación salió y esa persona
         tiene que crear su contraseña; salió y ya tiene una; o la membresía se
         creó pero el correo NO salió — y eso hay que decirlo, porque si no
         quien invita se queda esperando a alguien que no ha recibido nada. */
      const clave = !r.invitationSent
        ? "equipo.invitadoSinCorreo"
        : r.needsPasswordSetup
          ? "equipo.invitadoSinContrasena"
          : "equipo.invitadoConContrasena";
      setAviso(t(clave, { correo: email.trim() }));
      setEmail("");
      setAbierto(false);
      await cargar();
    } catch (e: any) {
      setError(e?.message || t("equipo.noInvito"));
    } finally {
      setEnviando(false);
    }
  };

  const rolActual = roles.find((r) => r.id === rol);
  const soyYo = (m: MiembroDelEquipo) =>
    !!datos && !!me && m.email != null && m.email === me.user.email;

  return (
    <Pagina
      titulo={t("equipo.titulo")}
      nota={
        <>
          {t("equipo.nota1")}
          <strong> {t("equipo.notaFuerte")} </strong>
          {t("equipo.nota2")}
        </>
      }
    >

      {aviso && <div className="equipo__aviso equipo__aviso--ok">{aviso}</div>}
      {error && !cargando && <div className="equipo__aviso equipo__aviso--mal">{error}</div>}

      {gestiona && (
        <Tarjeta>
          <TarjetaCabecera
            titulo={t("equipo.invitarTitulo")}
            nota={
              <Boton variante="suave" onClick={() => setAbierto((v) => !v)}>
                {t(abierto ? "comun.cancelar" : "equipo.invitar")}
              </Boton>
            }
          />
          {abierto && (
            <form className="equipo__form" onSubmit={invitar}>
              <Campo
                etiqueta={t("equipo.correo")}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("equipo.correoEjemplo")}
              />
              <Selector
                etiqueta={t("equipo.rol")}
                value={rol}
                onChange={(e) => setRol(e.target.value)}
              >
                {roles.map((r) => (
                  /* El rol que se manda es `r.id` —la autoridad es suya—; lo
                     que cambia es cómo se escribe. Ver `lib/rolDeSocio`. */
                  <option key={r.id} value={r.id}>{nombreDeRol(r.id, r.label)}</option>
                ))}
              </Selector>
              {rolActual && (
                <p className="equipo__explicacion">
                  {descripcionDeRol(rolActual.id, rolActual.description)}
                  <span className="equipo__permisos">
                    {t(
                      rolActual.permissions.length === 1
                        ? "equipo.permisoUno"
                        : "equipo.permisosVarios",
                      { n: rolActual.permissions.length },
                    )}
                  </span>
                </p>
              )}
              <Boton type="submit" cargando={enviando} disabled={!email.trim() || !rol}>
                {t("equipo.enviarInvitacion")}
              </Boton>
            </form>
          )}
        </Tarjeta>
      )}

      <Tarjeta>
        <TarjetaCabecera
          titulo={t("equipo.miembros")}
          nota={datos ? `${datos.members.length}` : undefined}
        />
        <EstadoDeDatos
          cargando={cargando}
          error={cargando ? null : (datos ? null : error)}
          vacio={!cargando && !!datos && datos.members.length === 0}
          etiquetaVacio={t("equipo.vacio")}
          onReintentar={cargar}
        >
          <ul className="equipo__lista">
            {(datos?.members ?? []).map((m) => {
              const est = estadoDeMiembro(m.status);
              const yo = soyYo(m);
              const activo = m.status !== "archived";
              return (
                <li key={m.id} className="equipo__fila">
                  <div className="equipo__quien">
                    <span className="equipo__nombre">
                      {m.fullName || m.email || "—"}
                      {yo && <span className="equipo__tu">{t("equipo.tu")}</span>}
                    </span>
                    {/* El correo se parte: uno largo no puede estirar la fila. */}
                    <span className="equipo__correo">{m.email}</span>
                  </div>

                  <div className="equipo__estado">
                    <Pildora tono="neutro">{nombreDeRol(m.role, m.roleLabel)}</Pildora>
                    {est && <Pildora tono={est.tono}>{est.texto}</Pildora>}
                    {m.status === "invited" && !m.hasPassword && (
                      <span className="equipo__pista">{t("equipo.sinContrasenaAun")}</span>
                    )}
                  </div>

                  {gestiona && (
                    <div className="equipo__acciones">
                      <Selector
                        compacto
                        etiquetaOculta={t("equipo.rolDe", { correo: m.email ?? "" })}
                        value={rolPendiente[m.id] ?? m.role ?? ""}
                        disabled={ocupado === m.id || !activo}
                        /* Picking a role only stages it: a stray scroll on the
                           select used to demote an owner on the spot. */
                        onChange={(e) => setRolPendiente((p) => ({ ...p, [m.id]: e.target.value }))}
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>{nombreDeRol(r.id, r.label)}</option>
                        ))}
                      </Selector>

                      {rolPendiente[m.id] && rolPendiente[m.id] !== m.role && (
                        <>
                          <Boton
                            cargando={ocupado === m.id}
                            onClick={() => {
                              const nuevo = rolPendiente[m.id];
                              setRolPendiente(({ [m.id]: _, ...resto }) => resto);
                              accion(m.id, () => teamService.cambiarRol(m.id, nuevo),
                                t("equipo.rolActualizado"));
                            }}
                          >
                            {t("comun.guardar")}
                          </Boton>
                          <Boton
                            variante="fantasma"
                            onClick={() => setRolPendiente(({ [m.id]: _, ...resto }) => resto)}
                          >
                            {t("comun.cancelar")}
                          </Boton>
                        </>
                      )}

                      {m.status === "invited" && (
                        <Boton
                          variante="suave"
                          cargando={ocupado === m.id}
                          onClick={() => accion(m.id, () => teamService.volverAInvitar(m.id),
                            t("equipo.invitacionRenovada"))}
                        >
                          {t("equipo.reinvitar")}
                        </Boton>
                      )}

                      {activo && !yo && (
                        <Confirmar
                          variante="peligro"
                          cargando={ocupado === m.id}
                          pregunta={t("equipo.desactivarPregunta", { correo: m.email ?? "" })}
                          onConfirmar={() => accion(m.id, () => teamService.darDeBaja(m.id),
                            t("equipo.miembroDesactivado"))}
                        >
                          {t("equipo.desactivar")}
                        </Confirmar>
                      )}
                    </div>
                  )}

                  <span className="equipo__fecha">{fechaYHora(m.invitedAt)}</span>
                </li>
              );
            })}
          </ul>
        </EstadoDeDatos>
      </Tarjeta>

      {roles.length > 0 && (
        <Tarjeta>
          <TarjetaCabecera titulo={t("equipo.rolesTitulo")} />
          <ul className="equipo__roles">
            {roles.map((r) => (
              <li key={r.id}>
                <span className="equipo__rol-nombre">{nombreDeRol(r.id, r.label)}</span>
                <span className="equipo__rol-desc">
                  {descripcionDeRol(r.id, r.description)}
                </span>
              </li>
            ))}
          </ul>
          <p className="equipo__nota-operacion">{t("equipo.notaOperacion")}</p>
        </Tarjeta>
      )}
    </Pagina>
  );
}

export default Equipo;
