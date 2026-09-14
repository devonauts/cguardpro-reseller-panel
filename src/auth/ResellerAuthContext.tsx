import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode,
} from "react";
import {
  clearAuthToken, getAuthToken, onSessionLost, setAuthToken,
} from "@/services/api";
import { resellerService, type ResellerMe } from "@/services/resellerService";

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
  const [estado, setEstado] = useState<Estado>({
    cargando: !!getAuthToken(),
    me: null,
    motivo: getAuthToken() ? null : "sin-sesion",
    mensaje: null,
  });

  /** Pide `/me` y traduce el fallo a algo que se pueda contar en pantalla. */
  const cargarMe = useCallback(async () => {
    setEstado((s) => ({ ...s, cargando: true }));
    try {
      const me = await resellerService.me();
      setEstado({ cargando: false, me, motivo: null, mensaje: null });
    } catch (e: any) {
      const status = e?.status;
      // La capa apagada contesta 404 en TODO el árbol: no es que falte esta
      // ruta, es que la función no está disponible todavía.
      if (status === 404) {
        setEstado({
          cargando: false, me: null, motivo: "capa-apagada",
          mensaje: "El panel de socio no está disponible en este momento.",
        });
        return;
      }
      /* 403 aquí significa que la sesión guardada no es de socio (o su membresía
         ya no vale). Se descarta SIN intentar reaprovecharla. */
      if (status === 403) {
        clearAuthToken();
        setEstado({
          cargando: false, me: null, motivo: "canal-incorrecto",
          mensaje: "Esta sesión no pertenece a un panel de socio. Vuelve a entrar.",
        });
        return;
      }
      if (status === 401) {
        setEstado({ cargando: false, me: null, motivo: "sin-sesion", mensaje: null });
        return;
      }
      setEstado({
        cargando: false, me: null, motivo: "error",
        mensaje: e?.message || "No se pudo comprobar la sesión.",
      });
    }
  }, []);

  // Restauración al arrancar: si hay token guardado, se valida contra el
  // servidor antes de enseñar nada. Un token caducado no debe llegar a pintar
  // media pantalla y desaparecer después.
  useEffect(() => {
    if (getAuthToken()) cargarMe();
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
      throw { message: "El servidor no devolvió una sesión válida." };
    }
    setAuthToken(token);
    await cargarMe();
  }, [cargarMe]);

  const salir = useCallback(() => {
    clearAuthToken();
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
