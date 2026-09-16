import { useCallback, useEffect, useState } from "react";

import {
  Boton, Campo, EstadoDeDatos, Tarjeta, TarjetaCabecera, Pildora,
} from "@/components/ui/kit";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import { fechaYHora } from "@/lib/dinero";
import {
  teamService, type EquipoDelSocio, type MiembroDelEquipo, type RolDeSocio,
} from "@/services/resellerService";
import "./Equipo.css";

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

const ESTADO: Record<string, { texto: string; tono: "ok" | "aviso" | "neutro" }> = {
  active: { texto: "Activo", tono: "ok" },
  invited: { texto: "Invitado", tono: "aviso" },
  archived: { texto: "Desactivado", tono: "neutro" },
};

export function Equipo() {
  const { puede, me } = useResellerAuth();
  const [datos, setDatos] = useState<EquipoDelSocio | null>(null);
  const [roles, setRoles] = useState<RolDeSocio[]>([]);
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
      setError(e?.message || "No se pudo cargar tu equipo.");
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
      setError(e?.message || "No se pudo completar la acción.");
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
      setAviso(
        r.needsPasswordSetup
          ? `Invitación creada. ${email.trim()} tendrá que crear su contraseña la primera vez que entre al panel.`
          : `Invitación creada. ${email.trim()} ya tiene contraseña y puede entrar directamente.`,
      );
      setEmail("");
      setAbierto(false);
      await cargar();
    } catch (e: any) {
      setError(e?.message || "No se pudo invitar.");
    } finally {
      setEnviando(false);
    }
  };

  const rolActual = roles.find((r) => r.id === rol);
  const soyYo = (m: MiembroDelEquipo) =>
    !!datos && !!me && m.email != null && m.email === me.user.email;

  return (
    <section className="pagina">
      <header className="pagina__cabecera">
        <h1>Equipo</h1>
        <p className="pagina__nota">
          Quién puede entrar a este panel y qué puede hacer. El acceso al panel
          <strong> no </strong>da acceso a la operación de tus empresas —rondas,
          incidentes o datos de sus clientes—: eso requiere una cuenta propia en
          cada empresa.
        </p>
      </header>

      {aviso && <div className="equipo__aviso equipo__aviso--ok">{aviso}</div>}
      {error && !cargando && <div className="equipo__aviso equipo__aviso--mal">{error}</div>}

      {gestiona && (
        <Tarjeta>
          <TarjetaCabecera
            titulo="Invitar a alguien"
            nota={
              <Boton variante="suave" onClick={() => setAbierto((v) => !v)}>
                {abierto ? "Cancelar" : "Invitar"}
              </Boton>
            }
          />
          {abierto && (
            <form className="equipo__form" onSubmit={invitar}>
              <Campo
                etiqueta="Correo"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="persona@empresa.com"
              />
              <label className="equipo__campo">
                <span className="equipo__etiqueta">Rol</span>
                <select
                  className="equipo__select"
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                >
                  {roles.map((r) => (
                    /* La etiqueta viene del servidor, igual que los permisos:
                       el panel no define autoridad ni la describe por su cuenta. */
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </label>
              {rolActual && (
                <p className="equipo__explicacion">
                  {rolActual.description}
                  <span className="equipo__permisos">
                    {rolActual.permissions.length} permiso
                    {rolActual.permissions.length === 1 ? "" : "s"}
                  </span>
                </p>
              )}
              <Boton type="submit" cargando={enviando} disabled={!email.trim() || !rol}>
                Enviar invitación
              </Boton>
            </form>
          )}
        </Tarjeta>
      )}

      <Tarjeta>
        <TarjetaCabecera
          titulo="Miembros"
          nota={datos ? `${datos.members.length}` : undefined}
        />
        <EstadoDeDatos
          cargando={cargando}
          error={cargando ? null : (datos ? null : error)}
          vacio={!cargando && !!datos && datos.members.length === 0}
          etiquetaVacio="Todavía no hay nadie más en tu equipo."
          onReintentar={cargar}
        >
          <ul className="equipo__lista">
            {(datos?.members ?? []).map((m) => {
              const est = m.status ? ESTADO[m.status] : null;
              const yo = soyYo(m);
              const activo = m.status !== "archived";
              return (
                <li key={m.id} className="equipo__fila">
                  <div className="equipo__quien">
                    <span className="equipo__nombre">
                      {m.fullName || m.email || "—"}
                      {yo && <span className="equipo__tu">tú</span>}
                    </span>
                    {/* El correo se parte: uno largo no puede estirar la fila. */}
                    <span className="equipo__correo">{m.email}</span>
                  </div>

                  <div className="equipo__estado">
                    <Pildora tono="neutro">{m.roleLabel || m.role}</Pildora>
                    {est && <Pildora tono={est.tono}>{est.texto}</Pildora>}
                    {m.status === "invited" && !m.hasPassword && (
                      <span className="equipo__pista">sin contraseña aún</span>
                    )}
                  </div>

                  {gestiona && (
                    <div className="equipo__acciones">
                      <label className="equipo__rol-inline">
                        <span className="sr-only">Rol de {m.email}</span>
                        <select
                          className="equipo__select equipo__select--mini"
                          value={m.role ?? ""}
                          disabled={ocupado === m.id || !activo}
                          onChange={(e) =>
                            accion(m.id, () => teamService.cambiarRol(m.id, e.target.value),
                              "Rol actualizado.")}
                        >
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>{r.label}</option>
                          ))}
                        </select>
                      </label>

                      {m.status === "invited" && (
                        <Boton
                          variante="suave"
                          cargando={ocupado === m.id}
                          onClick={() => accion(m.id, () => teamService.volverAInvitar(m.id),
                            "Invitación renovada. Recibirá el enlace al intentar entrar.")}
                        >
                          Reinvitar
                        </Boton>
                      )}

                      {activo && !yo && (
                        <Boton
                          variante="peligro"
                          cargando={ocupado === m.id}
                          onClick={() => accion(m.id, () => teamService.darDeBaja(m.id),
                            "Miembro desactivado.")}
                        >
                          Desactivar
                        </Boton>
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
          <TarjetaCabecera titulo="Qué puede hacer cada rol" />
          <ul className="equipo__roles">
            {roles.map((r) => (
              <li key={r.id}>
                <span className="equipo__rol-nombre">{r.label}</span>
                <span className="equipo__rol-desc">{r.description}</span>
              </li>
            ))}
          </ul>
          <p className="equipo__nota-operacion">
            Ninguno de estos roles da acceso a la operación de tus empresas.
          </p>
        </Tarjeta>
      )}
    </section>
  );
}

export default Equipo;
