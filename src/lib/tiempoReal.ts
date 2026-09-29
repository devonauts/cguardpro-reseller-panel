import { io, type Socket } from "socket.io-client";

import { getAuthToken } from "@/services/api";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL TIEMPO REAL DEL PANEL — una sola conexión para toda la aplicación.
 *
 * El servidor ya tenía socket.io en `/api/socket.io`; lo que faltaba era que el
 * panel se conectara, y que el servidor aceptara un token de SOCIO (sin
 * empresa): con `canal: 'reseller'` entra sólo a su sala personal
 * `reseller:<socio>:user:<persona>`, que es por donde llegan los avisos de la
 * campana (`reseller:aviso`).
 *
 * · Sólo WEBSOCKET: el servidor no hace sondeo, y pedirlo haría fallar el
 *   primer intento en cada carga.
 * · Mismo origen que la API: si `VITE_API_URL` apunta a otro dominio, el socket
 *   va allí; si no, al anfitrión del panel.
 * · Al reconectar se avisa a los suscriptores, que vuelven a pedir la lista:
 *   lo que llegó mientras no había conexión no se pierde.
 * ════════════════════════════════════════════════════════════════════════════
 */

type Oyente = (payload: any) => void;

let socket: Socket | null = null;
let tokenConectado: string | null = null;
const oyentes = new Map<string, Set<Oyente>>();
const alReconectar = new Set<() => void>();

function origenDeLaApi(): string {
  const api = (import.meta.env.VITE_API_URL as string | undefined) || "";
  if (/^https?:\/\//.test(api)) {
    try { return new URL(api).origin; } catch { /* cae al del panel */ }
  }
  return window.location.origin;
}

function conectar(): void {
  const token = getAuthToken();
  if (!token) { desconectarTiempoReal(); return; }
  if (socket && tokenConectado === token) return;
  desconectarTiempoReal();

  tokenConectado = token;
  socket = io(origenDeLaApi(), {
    path: "/api/socket.io",
    transports: ["websocket"],
    auth: { token, canal: "reseller" },
    reconnectionDelayMax: 30_000,
  });

  let primeraVez = true;
  socket.on("connect", () => {
    if (!primeraVez) alReconectar.forEach((f) => { try { f(); } catch { /* nada */ } });
    primeraVez = false;
  });

  // Cada evento se reparte a quien lo escucha en ese momento.
  socket.onAny((evento: string, payload: any) => {
    oyentes.get(evento)?.forEach((f) => { try { f(payload); } catch { /* nada */ } });
  });
}

/** Escucha un evento del servidor. Devuelve la función para dejar de escuchar. */
export function escuchar(evento: string, f: Oyente): () => void {
  conectar();
  if (!oyentes.has(evento)) oyentes.set(evento, new Set());
  oyentes.get(evento)!.add(f);
  return () => { oyentes.get(evento)?.delete(f); };
}

/** Se llama al volver la conexión tras un corte (no en la primera). */
export function alVolverLaConexion(f: () => void): () => void {
  alReconectar.add(f);
  return () => { alReconectar.delete(f); };
}

export function desconectarTiempoReal(): void {
  if (socket) {
    try { socket.removeAllListeners(); socket.disconnect(); } catch { /* ya cerrado */ }
  }
  socket = null;
  tokenConectado = null;
}
