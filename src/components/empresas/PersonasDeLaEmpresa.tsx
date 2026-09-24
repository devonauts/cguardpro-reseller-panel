import { useCallback, useEffect, useState } from "react";
import { Boton, Campo, Confirmar, EstadoDeDatos, Icono, Pildora, Selector } from "@/components/cristal";
import {
  personasService, type PersonaDeLaEmpresa, type PersonasDeLaEmpresa as Datos,
} from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import "./PersonasDeLaEmpresa.scss";

/** `t()` returns the key itself when it is missing, so `t(k) || r` never fell
 *  back: a CRM role with no label showed up as "rolEmpresa.centralOperator". */
function nombreDeRolEmpresa(t: (k: Clave) => string, r: string): string {
  const clave = `rolEmpresa.${r}` as Clave;
  const texto = t(clave);
  return texto === clave ? r : texto;
}

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
 *
 * ── LA FICHA SE ABRE DEBAJO, NO EN UN DIÁLOGO ─────────────────────────────
 * Primero se hizo con `Emergente` y fue un error: ese componente es un
 * desplegable ANCLADO a su padre (`role="menu"`, 320 px), no un diálogo — y
 * dentro de una lista con `overflow: hidden` y un ancestro con
 * `backdrop-filter`, que convierte el `fixed` en relativo, quedaba recortado y
 * sin verse. Estaba en el DOM y no se pintaba.
 *
 * Abrir debajo, como un segundo nivel del acordeón, además orienta mejor: no
 * se pierde de vista de qué empresa y de qué persona se está hablando.
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
  /* El ID de la abierta, no la persona: tras recargar, el objeto es otro y
     guardar el viejo dejaría pintada una ficha con datos de antes. */
  const [abierta, setAbierta] = useState<string | null>(null);
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
    p.roles.map((r) => nombreDeRolEmpresa(t, r)).join(", ") || "—";

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

            {invitando && (
              <Invitacion
                tenantId={tenantId}
                roles={datos.rolesDisponibles}
                onCerrar={() => setInvitando(false)}
                onHecho={() => { setInvitando(false); void cargar(); }}
              />
            )}

            {datos.conAcceso.length === 0 ? (
              <p className="personas__vacio">{t("personas.vacio")}</p>
            ) : (
              <ul className="personas__lista">
                {datos.conAcceso.map((p) => {
                  const Fila: any = puedeGestionar ? "button" : "div";
                  const desplegada = abierta === p.id;
                  return (
                    <li key={p.id}>
                      <Fila
                        className={`persona${desplegada ? " persona--abierta" : ""}`}
                        {...(puedeGestionar
                          ? {
                            type: "button",
                            "aria-expanded": desplegada,
                            onClick: () => setAbierta(desplegada ? null : p.id),
                          }
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
                          <Icono
                            nombre="galon"
                            tamano={16}
                            className={`persona__galon${desplegada ? " persona__galon--abierto" : ""}`}
                          />
                        )}
                      </Fila>

                      {desplegada && (
                        <FichaDePersona
                          tenantId={tenantId}
                          persona={p}
                          roles={datos.rolesDisponibles}
                          onCambio={() => { setAbierta(null); void cargar(); }}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </EstadoDeDatos>

    </div>
  );
}

/* ── La ficha de una persona ─────────────────────────────────────────────── */

/**
 * Se abre DEBAJO de la persona, como segundo nivel del acordeón.
 *
 * Sin cabecera repetida: el nombre, el correo y el estado están justo encima,
 * en la fila que se acaba de pulsar. Repetirlos aquí llenaría la mitad del
 * panel con lo que ya se está mirando.
 */
function FichaDePersona({
  tenantId, persona, roles, onCambio,
}: {
  tenantId: string;
  persona: PersonaDeLaEmpresa;
  roles: string[];
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
    <div className="persona-ficha">
      <Selector
        etiqueta={t("personas.rol")}
        value={rol}
        disabled={guardando || archivada}
        onChange={(e) => setRol(e.target.value)}
      >
        {/* Si su rol actual no está entre los que el panel concede —porque se
            lo puso alguien dentro del CRM— se enseña igual, para no fingir que
            tiene otro. Al guardar pasaría a ser uno de la lista. */}
        {!roles.includes(rol) && rol && (
          <option value={rol}>{t(`rolEmpresa.${rol}` as Clave) || rol}</option>
        )}
        {roles.map((r) => (
          <option key={r} value={r}>{nombreDeRolEmpresa(t, r)}</option>
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
            <Confirmar
              variante="peligro"
              disabled={guardando}
              pregunta={t("personas.quitarPregunta")}
              onConfirmar={() => hacer(() => personasService.quitarAcceso(tenantId, persona.id))}
            >
              {t("personas.quitar")}
            </Confirmar>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Invitar ─────────────────────────────────────────────────────────────── */

/** Un panel encima de la lista, no un diálogo. Mismo motivo que la ficha. */
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
    <div className="persona-ficha persona-ficha--alta">
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
          <option key={r} value={r}>{nombreDeRolEmpresa(t, r)}</option>
        ))}
      </Selector>

      {error && <p className="persona-ficha__error" role="alert">{error}</p>}
      <p className="persona-ficha__nota">{t("personas.invitarNota")}</p>

      <div className="persona-ficha__acciones">
        <Boton cargando={enviando} disabled={!email.trim() || !rol} onClick={enviar}>
          {t("personas.enviarInvitacion")}
        </Boton>
        <Boton variante="fantasma" disabled={enviando} onClick={onCerrar}>
          {t("comun.cancelar")}
        </Boton>
      </div>
    </div>
  );
}

export default PersonasDeLaEmpresa;
