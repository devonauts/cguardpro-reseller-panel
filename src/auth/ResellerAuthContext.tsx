import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode,
} from "react";
import {
  clearAuthToken, onSessionLost, restaurarSesion, setAuthToken,
} from "@/services/api";
import { resellerService, type ResellerMe } from "@/services/resellerService";
import { aplicarMarca, limpiarMarca } from "@/branding/marcaDelSocio";
import { t } from "@/i18n/idioma";

/**
 * La sesión del panel.
 *
 * ── QUIÉN ERES LO DICE EL SERVIDOR ────────────────────────────────────────
 * Tras entrar, el panel guarda el token y pregunta `/me`. La identidad, el
 * socio y los permisos salen SIEMPRE de esa respuesta: nada se deduce del
 * cuerpo del token ni se guarda de la respuesta de entrada. Si el servidor deja
 * de reconocer la sesión —membresía archivada, rol cambiado, socio borrado—, la
 * siguiente carga lo refleja sin que el panel tenga que enterarse por su cuenta.
 *
 * ── UNA SESIÓN DE OTRO CANAL NO SE REINTERPRETA ───────────────────────────
 * Si en el almacenamiento hay un token que no es de socio, `/me` contesta 403 y
 * aquí se descarta. No se intenta reutilizar la identidad de esa persona en su
 * empresa, ni se le pregunta al backend si «por casualidad» también es socio.
 * Un canal es un canal.
 */

interface Estado {
  cargando: boolean;
  me: ResellerMe | null;
  /** Motivo por el que no hay sesión utilizable, para poder explicarlo. */
  motivo: "sin-sesion" | "canal-incorrecto" | "capa-apagada" | "error" | null;
  mensaje: string | null;
}

interface Contexto extends Estado {
  autenticado: boolean;
  entrar: (email: string, password: string) => Promise<void>;
  salir: () => void;
  recargar: () => Promise<void>;
  puede: (permiso: string) => boolean;
}

const Ctx = createContext<Contexto | null>(null);

export function ResellerAuthProvider({ children }: { children: ReactNode }) {
  /**
   * Arranca SIEMPRE cargando.
   *
   * Antes se preguntaba `getAuthToken()` en el primer render para decidir si
   * había sesión que restaurar. Ya no se puede: el token vive en un almacén que
   * en nativo es asíncrono (Keychain/Keystore no responden en el mismo tic),
   * así que en el primer render todavía no se sabe.
   *
   * «Cargando» es la única respuesta honesta mientras no se sepa. Empezar en
   * «sin sesión» pintaría la pantalla de entrada durante un fotograma a quien
   * ya estaba dentro — y en un teléfono ese parpadeo se ve perfectamente.
   */
  const [estado, setEstado] = useState<Estado>({
    cargando: true,
    me: null,
    motivo: null,
    mensaje: null,
  });

  /** Pide `/me` y traduce el fallo a algo que se pueda contar en pantalla. */
  const cargarMe = useCallback(async () => {
    setEstado((s) => ({ ...s, cargando: true }));
    try {
      const me = await resellerService.me();
      /* En cuanto se sabe de quién es este panel, se viste. Va aquí y no en un
         efecto de la pantalla para que no haya un fotograma con el título
         neutro ya pintado. */
      aplicarMarca(me?.branding ?? null);
      setEstado({ cargando: false, me, motivo: null, mensaje: null });
    } catch (e: any) {
      const status = e?.status;
      // La capa apagada contesta 404 en TODO el árbol: no es que falte esta
      // ruta, es que la función no está disponible todavía.
      if (status === 404) {
        setEstado({
          cargando: false, me: null, motivo: "capa-apagada",
          mensaje: t("sesion.capaApagada"),
        });
        return;
      }
      /* 403 aquí significa que la sesión guardada no es de socio (o su membresía
         ya no vale). Se descarta SIN intentar reaprovecharla. */
      if (status === 403) {
        clearAuthToken();
        limpiarMarca();
        setEstado({
          cargando: false, me: null, motivo: "canal-incorrecto",
          mensaje: t("sesion.canalIncorrecto"),
        });
        return;
      }
      if (status === 401) {
        setEstado({ cargando: false, me: null, motivo: "sin-sesion", mensaje: null });
        return;
      }
      setEstado({
        cargando: false, me: null, motivo: "error",
        mensaje: e?.message || t("sesion.noComprobada"),
      });
    }
  }, []);

  // Restauración al arrancar: se lee el almacén y, si había token, se valida
  // contra el servidor antes de enseñar nada. Un token caducado no debe llegar
  // a pintar media pantalla y desaparecer después.
  useEffect(() => {
    let vivo = true;
    void (async () => {
      const guardado = await restaurarSesion();
      if (!vivo) return;
      if (guardado) await cargarMe();
      else setEstado({ cargando: false, me: null, motivo: "sin-sesion", mensaje: null });
    })();
    return () => { vivo = false; };
  }, [cargarMe]);

  // Un 401 en cualquier petición posterior cierra la sesión aquí también, para
  // que la pantalla no se quede enseñando datos de una sesión que ya no existe.
  useEffect(() => {
    onSessionLost(() => {
      setEstado({ cargando: false, me: null, motivo: "sin-sesion", mensaje: null });
    });
  }, []);

  const entrar = useCallback(async (email: string, password: string) => {
    const r = await resellerService.signIn(email, password);
    const token = (r as any)?.token ?? (r as any);
    if (!token || typeof token !== "string") {
      throw { message: t("sesion.sinSesionValida") };
    }
    setAuthToken(token);
    await cargarMe();
  }, [cargarMe]);

  const salir = useCallback(() => {
    clearAuthToken();
    /* Al salir el panel deja de ser de nadie: título, icono y color vuelven a
       los neutros. Si no, la pantalla de entrada se quedaría con la marca del
       último que entró — y en un equipo compartido eso le dice al siguiente de
       quién es la sesión anterior. */
    limpiarMarca();
    setEstado({ cargando: false, me: null, motivo: "sin-sesion", mensaje: null });
  }, []);

  const puede = useCallback(
    (permiso: string) => !!estado.me?.permissions?.includes(permiso),
    [estado.me],
  );

  const valor = useMemo<Contexto>(
    () => ({ ...estado, autenticado: !!estado.me, entrar, salir, recargar: cargarMe, puede }),
    [estado, entrar, salir, cargarMe, puede],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useResellerAuth(): Contexto {
  const c = useContext(Ctx);
  if (!c) throw new Error("useResellerAuth fuera de ResellerAuthProvider");
  return c;
}
