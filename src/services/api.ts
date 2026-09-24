import axios, { AxiosError, AxiosInstance } from "axios";

import { idioma, t } from "@/i18n/idioma";

/**
 * El cliente HTTP del panel de socio.
 *
 * ── LA SESIÓN NO SE MEZCLA CON NINGUNA OTRA ───────────────────────────────
 * La llave de almacenamiento es propia (`cguard_reseller_token`). El CRM usa la
 * suya y el panel de superadmin la suya, así que una misma persona puede tener
 * abierta su empresa en una pestaña y su panel de socio en otra sin que una
 * sesión pise a la otra. Eso no es comodidad: el backend emite un `sid` por
 * canal precisamente para que sean independientes, y compartir la llave aquí
 * desharía esa separación desde el navegador.
 *
 * ── LO QUE NUNCA SE MANDA ─────────────────────────────────────────────────
 * Ningún `resellerId`. Ni en el cuerpo, ni en la consulta, ni en una cabecera.
 * El socio de la sesión sale del token firmado y lo resuelve el servidor; que
 * el navegador lo propusiera no serviría de nada —el backend ni lo lee— pero
 * mandarlo invitaría a alguien, algún día, a empezar a hacerle caso.
 */

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || "/api";
const TOKEN_KEY = "cguard_reseller_token";

let _token: string | null = null;
try {
  _token = localStorage.getItem(TOKEN_KEY);
} catch {
  /* modo privado o almacenamiento bloqueado: se trabaja sin persistir */
}

export const getAuthToken = () => _token;

export function setAuthToken(token: string | null) {
  _token = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* la sesión sigue viva en memoria aunque no se pueda guardar */
  }
}

export const clearAuthToken = () => setAuthToken(null);

export interface ApiError {
  status?: number;
  message: string;
  code?: string;
  /** El estado comercial que devuelve el portero cuando contesta 403. */
  resellerStatus?: string | null;
  messageCode?: string | null;
}

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  config.headers = config.headers || ({} as any);
  if (token) {
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  // Server messages follow the language picked in the panel, not the
  // browser's Accept-Language.
  (config.headers as any)["x-language"] = idioma();
  return config;
});

/**
 * Qué hacer cuando el servidor dice que no.
 *
 *   401 → la sesión ya no vale. Se borra y se manda a entrar de nuevo. No se
 *         intenta refrescar ni reintentar: el backend rota la sesión por canal
 *         y un reintento a ciegas sólo alarga la confusión.
 *   403 → la sesión ES válida; lo que no se puede es ESTA operación. No se
 *         cierra sesión —hacerlo echaría del panel a un socio moroso que venía
 *         justo a pagar—, se deja que la pantalla lo cuente.
 *   404 → con la capa apagada, la familia entera contesta 404. Se traduce a un
 *         mensaje entendible en vez de «no encontrado».
 */
let alPerderLaSesion: (() => void) | null = null;
export function onSessionLost(fn: () => void) {
  alPerderLaSesion = fn;
}

function normalizar(error: AxiosError): ApiError {
  const status = error.response?.status;
  const data: any = error.response?.data;
  /* Axios's own texts ("Network Error", "timeout of 30000ms exceeded",
     "Request failed with status code 500") and HTML error pages from a proxy
     never reach the screen: they are English, technical and say nothing to
     a partner. A bare 500 says "could not do it" in the panel's language. */
  const delServidor =
    (data && typeof data === "object" && (data.message || data.error)) ||
    (typeof data === "string" && !/^\s*</.test(data) ? data : "");
  const message =
    (status && status !== 500 && delServidor) || t("comun.noSePudo");
  return {
    status,
    message,
    code: data?.code,
    /** The server's message key (e.g. `auth.passwordReset.invalidToken`). */
    messageCode: data?.messageCode ?? null,
    resellerStatus: data?.resellerStatus ?? null,
  };
}

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    const e = normalizar(error);
    if (e.status === 401) {
      clearAuthToken();
      alPerderLaSesion?.();
    }
    return Promise.reject(e);
  },
);

/** El backend envuelve las respuestas; aquí se desenvuelven en un solo sitio. */
function desenvolver<T>(payload: any): T {
  if (payload && typeof payload === "object" && "data" in payload && !("rows" in payload)) {
    return payload.data as T;
  }
  return payload as T;
}

export async function get<T>(url: string, params?: any): Promise<T> {
  const r = await api.get(url, { params });
  return desenvolver<T>(r.data);
}

export async function post<T>(url: string, body?: any): Promise<T> {
  const r = await api.post(url, body);
  return desenvolver<T>(r.data);
}

export async function patch<T>(url: string, body?: any): Promise<T> {
  const r = await api.patch(url, body);
  return desenvolver<T>(r.data);
}

/** `PUT` existe por UNA ruta: `/auth/password-reset`, que es un PUT de siempre. */
export async function put<T>(url: string, body?: any): Promise<T> {
  const r = await api.put(url, body);
  return desenvolver<T>(r.data);
}

/**
 * Sube UN archivo como multipart.
 *
 * No se pone `Content-Type` a mano: el navegador tiene que componerlo él para
 * incluir la frontera del multipart, y escribirlo aquí produce una petición que
 * el servidor no sabe despiezar. Se borra el de por defecto para que lo haga.
 */
export async function del<T>(url: string, params?: any): Promise<T> {
  const r = await api.delete(url, { params });
  return desenvolver<T>(r.data);
}

/** Multipart with several fields and files (the signing photo + its form). */
export async function enviarFormulario<T>(url: string, datos: FormData): Promise<T> {
  const r = await api.post(url, datos, { headers: { "Content-Type": undefined } as any });
  return desenvolver<T>(r.data);
}

export async function subirArchivo<T>(url: string, archivo: File): Promise<T> {
  const fd = new FormData();
  fd.append("file", archivo);
  const r = await api.post(url, fd, { headers: { "Content-Type": undefined } as any });
  return desenvolver<T>(r.data);
}

export default api;

/**
 * Download a file from an authenticated route (a PDF).
 *
 * A plain `<a href>` does not carry the session — it lives in a Bearer header,
 * not a cookie — so the route answered 403. The file is fetched here, with the
 * header, and handed to the browser as a download.
 */
export async function descargarArchivo(url: string, nombrePorDefecto: string): Promise<void> {
  const r = await api.get(url, {
    responseType: "blob",
    headers: { Accept: "application/pdf, application/json" },
    validateStatus: () => true,
  });
  if (r.status >= 400) {
    let message = t("comun.noSePudo");
    try {
      const cuerpo = JSON.parse(await (r.data as Blob).text());
      if (r.status !== 500 && (cuerpo?.message || cuerpo?.error)) message = cuerpo.message || cuerpo.error;
    } catch { /* not JSON: keep the generic message */ }
    if (r.status === 401) {
      clearAuthToken();
      alPerderLaSesion?.();
    }
    throw { status: r.status, message } as ApiError;
  }
  const cabecera = String(r.headers["content-disposition"] || "");
  const nombre = /filename="?([^";]+)"?/i.exec(cabecera)?.[1] || nombrePorDefecto;
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(r.data as Blob);
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 10_000);
}
