import { useCallback, useEffect, useState } from "react";
import {
  Boton, Campo, Emergente, EstadoDeDatos, Icono, Pildora, Selector,
} from "@/components/cristal";
import {
  personasService, type PersonaDeLaEmpresa, type PersonasDeLaEmpresa as Datos,
} from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import "./PersonasDeLaEmpresa.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * QUIÉN ENTRA AL CRM DE UNA EMPRESA
 *
 * Lo que se despliega dentro de cada empresa del acordeón. Es la gente con
 * cuenta: administradores, despacho, oficina. Los vigilantes salen en un número
 * y nada más — son cientos, son la plantilla operativa del cliente, y
 * enseñárselos uno a uno al proveedor de su proveedor no es llevar la cuenta.
 *
 * ── SE PIDE AL ABRIR, NO ANTES ────────────────────────────────────────────
 * Un socio con cuarenta empresas haría cuarenta peticiones para pintar una
 * lista en la que va a abrir una. Se pide la primera vez que se despliega y se
 * queda; volver a plegar y desplegar no vuelve a pedir.
 * ════════════════════════════════════════════════════════════════════════════
 */

/** Los estados de una membresía, con el tono que les corresponde. */
const TONO: Record<string, "ok" | "aviso" | "neutro"> = {
  active: "ok",
  invited: "aviso",
  pending: "aviso",
  archived: "neutro",
};

export function PersonasDeLaEmpresa({
  tenantId, puedeGestionar,
}: {
  tenantId: string;
  /** Sin `users.manage` esto es una lista y nada más: ni botones ni ficha. */
  puedeGestionar: boolean;
}) {
  const t = useT();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<PersonaDeLaEmpresa | null>(null);
  const [invitando, setInvitando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await personasService.list(tenantId));
    } catch (e: any) {
      setError(e?.message || t("personas.noCarga"));
    } finally {
      setCargando(false);
    }
  }, [tenantId, t]);

  useEffect(() => { void cargar(); }, [cargar]);

  /* `rolEmpresa.*` y no `rol.*`: ese otro espacio ya son los roles DEL SOCIO
     (propietario, facturación…), y `rol.admin` significaría dos cosas. */
  const rol = (p: PersonaDeLaEmpresa) =>
    p.roles.map((r) => t(`rolEmpresa.${r}` as Clave) || r).join(", ") || "—";

  return (
    <div className="personas">
      <EstadoDeDatos cargando={cargando} error={error} onReintentar={cargar}>
        {datos && (
          <>
            <div className="personas__resumen">
              <span>
                {t("personas.conAcceso", { n: datos.conAcceso.length })}
                {datos.enCampo > 0 && (
                  <>
                    {" · "}
                    {/* Los de campo, en número. Es lo que dimensiona al cliente
                        sin enseñar a cada persona de su plantilla. */}
                    <span className="personas__campo">
                      {t("personas.enCampo", { n: datos.enCampo })}
                    </span>
                  </>
                )}
              </span>
              {puedeGestionar && (
                <Boton variante="suave" onClick={() => setInvitando(true)}>
                  {t("personas.invitar")}
                </Boton>
              )}
            </div>

            {datos.conAcceso.length === 0 ? (
              <p className="personas__vacio">{t("personas.vacio")}</p>
            ) : (
              <ul className="personas__lista">
                {datos.conAcceso.map((p) => {
                  const Fila: any = puedeGestionar ? "button" : "div";
                  return (
                    <li key={p.id}>
                      <Fila
                        className="persona"
                        {...(puedeGestionar
                          ? { type: "button", onClick: () => setAbierta(p) }
                          : {})}
                      >
                        <span className="persona__principal">
                          <span className="persona__nombre">
                            {p.nombre || t("personas.sinNombre")}
                          </span>
                          <span className="persona__correo">{p.email}</span>
                        </span>
                        <span className="persona__rol">{rol(p)}</span>
                        <Pildora tono={TONO[p.status] ?? "neutro"}>
                          {t(`personas.estado.${p.status}` as Clave) || p.status}
                        </Pildora>
                        {puedeGestionar && (
                          <Icono nombre="galon" tamano={16} className="persona__galon" />
                        )}
                      </Fila>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </EstadoDeDatos>

      {abierta && (
        <FichaDePersona
          tenantId={tenantId}
          persona={abierta}
          roles={datos?.rolesDisponibles ?? []}
          onCerrar={() => setAbierta(null)}
          onCambio={() => { setAbierta(null); void cargar(); }}
        />
      )}

      {invitando && (
        <Invitacion
          tenantId={tenantId}
          roles={datos?.rolesDisponibles ?? []}
          onCerrar={() => setInvitando(false)}
          onHecho={() => { setInvitando(false); void cargar(); }}
        />
      )}
    </div>
  );
}

/* ── La ficha de una persona ─────────────────────────────────────────────── */

function FichaDePersona({
  tenantId, persona, roles, onCerrar, onCambio,
}: {
  tenantId: string;
  persona: PersonaDeLaEmpresa;
  roles: string[];
  onCerrar: () => void;
  onCambio: () => void;
}) {
  const t = useT();
  const [rol, setRol] = useState(persona.roles[0] ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const archivada = persona.status === "archived";

  const hacer = async (fn: () => Promise<unknown>) => {
    setGuardando(true);
    setError(null);
    try {
      await fn();
      onCambio();
    } catch (e: any) {
      setError(e?.message || t("personas.noSePudo"));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Emergente abierto onCerrar={onCerrar} etiqueta={persona.nombre || persona.email}>
      <div className="persona-ficha">
        <header className="persona-ficha__cabecera">
          <div>
            <h2>{persona.nombre || t("personas.sinNombre")}</h2>
            <p>{persona.email}</p>
          </div>
          <Pildora tono={TONO[persona.status] ?? "neutro"}>
            {t(`personas.estado.${persona.status}` as Clave) || persona.status}
          </Pildora>
        </header>

        <Selector
          etiqueta={t("personas.rol")}
          value={rol}
          disabled={guardando || archivada}
          onChange={(e) => setRol(e.target.value)}
        >
          {/* Si su rol actual no está entre los que el panel concede —porque se
              lo puso alguien dentro del CRM— se enseña igual, para no fingir
              que tiene otro. Al guardar pasaría a ser uno de la lista. */}
          {!roles.includes(rol) && rol && (
            <option value={rol}>{t(`rolEmpresa.${rol}` as Clave) || rol}</option>
          )}
          {roles.map((r) => (
            <option key={r} value={r}>{t(`rolEmpresa.${r}` as Clave) || r}</option>
          ))}
        </Selector>

        {error && <p className="persona-ficha__error" role="alert">{error}</p>}

        <p className="persona-ficha__nota">
          {archivada ? t("personas.notaArchivada") : t("personas.notaQuitar")}
        </p>

        <div className="persona-ficha__acciones">
          {archivada ? (
            <Boton
              cargando={guardando}
              onClick={() => hacer(() => personasService.devolverAcceso(tenantId, persona.id))}
            >
              {t("personas.devolver")}
            </Boton>
          ) : (
            <>
              <Boton
                cargando={guardando}
                disabled={!rol || rol === persona.roles[0]}
                onClick={() => hacer(() => personasService.cambiarRol(tenantId, persona.id, rol))}
              >
                {t("comun.guardar")}
              </Boton>
              <Boton
                variante="peligro"
                disabled={guardando}
                onClick={() => hacer(() => personasService.quitarAcceso(tenantId, persona.id))}
              >
                {t("personas.quitar")}
              </Boton>
            </>
          )}
        </div>
      </div>
    </Emergente>
  );
}

/* ── Invitar ─────────────────────────────────────────────────────────────── */

function Invitacion({
  tenantId, roles, onCerrar, onHecho,
}: {
  tenantId: string;
  roles: string[];
  onCerrar: () => void;
  onHecho: () => void;
}) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [rol, setRol] = useState(roles[0] ?? "");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await personasService.invitar(tenantId, {
        email: email.trim(), firstName: nombre.trim(), lastName: apellido.trim(), rol,
      });
      onHecho();
    } catch (e: any) {
      setError(e?.message || t("personas.noSePudo"));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Emergente abierto onCerrar={onCerrar} etiqueta={t("personas.invitar")}>
      <div className="persona-ficha">
        <header className="persona-ficha__cabecera">
          <div>
            <h2>{t("personas.invitar")}</h2>
            <p>{t("personas.invitarSub")}</p>
          </div>
        </header>

        <Campo
          etiqueta={t("personas.correo")}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="persona-ficha__dos">
          <Campo
            etiqueta={t("personas.nombre")}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <Campo
            etiqueta={t("personas.apellido")}
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
          />
        </div>
        <Selector etiqueta={t("personas.rol")} value={rol} onChange={(e) => setRol(e.target.value)}>
          {roles.map((r) => (
            <option key={r} value={r}>{t(`rolEmpresa.${r}` as Clave) || r}</option>
          ))}
        </Selector>

        {error && <p className="persona-ficha__error" role="alert">{error}</p>}
        <p className="persona-ficha__nota">{t("personas.invitarNota")}</p>

        <div className="persona-ficha__acciones">
          <Boton cargando={enviando} disabled={!email.trim() || !rol} onClick={enviar}>
            {t("personas.enviarInvitacion")}
          </Boton>
        </div>
      </div>
    </Emergente>
  );
}

export default PersonasDeLaEmpresa;
