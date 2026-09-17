import { esNativo } from "./plataforma";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * DÓNDE VIVE LA CREDENCIAL DE SESIÓN
 *
 * ── LO QUE DICE LA AUDITORÍA ──────────────────────────────────────────────
 * Se miró qué hacen las apps nativas que ya existen antes de escribir nada.
 * Respuesta: `worker-app` y `supervisor-app` guardan su token en el
 * `localStorage` del WebView (`worker-app/src/lib/api.ts`). NO hay ningún
 * patrón de almacenamiento seguro en el repositorio — ni Keychain, ni Keystore,
 * ni un plugin que los envuelva. No hay nada que reutilizar.
 *
 * ── POR QUÉ ESTO NO ES «GUARDARLO IGUAL Y YA» ─────────────────────────────
 * En el navegador, `localStorage` está acotado por origen y es lo que hay. En
 * una app instalada es OTRA cosa: vive en el sandbox de la aplicación, entra en
 * las copias de seguridad del dispositivo y sobrevive a que alguien cierre
 * sesión mal. Un panel de socio da acceso a la cartera comercial entera —
 * empresas, contratos, facturación—, así que la credencial merece el almacén
 * del sistema operativo, no un almacén web dentro de una app.
 *
 * ── LO QUE SE HACE HOY, Y LO QUE FALTA ────────────────────────────────────
 * Esto es la FRONTERA. Todo el panel pide la credencial aquí y nadie más toca
 * el almacenamiento, así que cambiar el respaldo nativo es cambiar un fichero.
 *
 * Hoy los dos respaldos son el mismo (`localStorage`), igual que en las otras
 * dos apps. Elegir el plugin de Keychain/Keystore es una decisión que afecta a
 * las tres y tiene consecuencias de compilación y de firma, así que se REPORTA
 * en vez de meterla de tapadillo en el panel de socio. Lo que no se hace, bajo
 * ningún concepto, es inventar cifrado propio.
 *
 * ── Y ES ASÍNCRONO A PROPÓSITO ────────────────────────────────────────────
 * `localStorage` es síncrono; Keychain y Keystore NO lo son. La interfaz es
 * asíncrona desde el primer día para que el día que se cambie el respaldo no
 * haya que tocar a quien la llama. Una interfaz síncrona aquí sería una trampa
 * con fecha.
 * ════════════════════════════════════════════════════════════════════════════
 */

/** Propia del panel. El CRM usa la suya y NUNCA se mezclan: son canales
 *  distintos y el backend emite un `sid` por canal precisamente para eso. */
const LLAVE = "cguard_reseller_token";

export interface AlmacenDeCredenciales {
  leer(): Promise<string | null>;
  guardar(token: string): Promise<void>;
  borrar(): Promise<void>;
  /** Para el informe y para las pruebas: qué respaldo está en uso. */
  readonly respaldo: string;
}

/** El navegador. Acotado por origen; es lo que hay y es lo correcto en web. */
const almacenWeb: AlmacenDeCredenciales = {
  respaldo: "localStorage",
  async leer() {
    try { return localStorage.getItem(LLAVE); } catch { return null; }
  },
  async guardar(token) {
    try { localStorage.setItem(LLAVE, token); } catch { /* modo privado */ }
  },
  async borrar() {
    try { localStorage.removeItem(LLAVE); } catch { /* modo privado */ }
  },
};

/**
 * El respaldo nativo.
 *
 * Mismo comportamiento que el web mientras no haya plugin de almacén seguro
 * aprobado. Se declara APARTE y no como un alias para que el cambio sea
 * evidente en el diff del día que se decida, y para que `respaldo` diga la
 * verdad en el informe en vez de presumir de una seguridad que no existe.
 */
const almacenNativo: AlmacenDeCredenciales = {
  respaldo: "localStorage (pendiente: Keychain/Keystore)",
  leer: almacenWeb.leer,
  guardar: almacenWeb.guardar,
  borrar: almacenWeb.borrar,
};

export const almacenDeCredenciales: AlmacenDeCredenciales =
  esNativo ? almacenNativo : almacenWeb;

export default almacenDeCredenciales;
