import type { CapacitorConfig } from "@capacitor/cli";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * LA APP INSTALADA DEL PANEL DE SOCIOS
 *
 * El identificador y el equipo los decidió Mike; no se inventan aquí. Son los
 * mismos que usan las otras dos apps de la casa:
 *
 *   com.cguardpro.operaciones  · la del vigilante
 *   com.cguardpro.supervisor   · la del supervisor
 *   com.cguardpro.partners     · ésta
 *
 * ── NO HAY `server.url` ───────────────────────────────────────────────────
 * La app sirve su propio paquete desde dentro. Apuntar `server.url` a
 * `partners.cguardpro.com` habría sido un navegador disfrazado: sin conexión
 * no arranca, la tienda lo rechaza como «sólo una web», y cada despliegue del
 * panel cambiaría la app instalada sin pasar por revisión.
 * ════════════════════════════════════════════════════════════════════════════
 */
const config: CapacitorConfig = {
  appId: "com.cguardpro.partners",
  appName: "CGuardPro Partners",
  webDir: "dist",

  /* El esquema de Android. `https` —y no `http`— porque el almacenamiento del
     WebView está acotado por origen: cambiarlo después tira la sesión guardada
     de todo el que ya tuviera la app. Es el mismo que usan las otras dos. */
  android: { allowMixedContent: false },
  server: { androidScheme: "https" },

  plugins: {
    /* La pantalla de arranque la quita el código, no un temporizador: se va
       cuando hay algo pintado detrás. Un temporizador o se queda corto —y se
       ve la app vacía— o se pasa y hace esperar de más. */
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#0A0A0A",
      androidSplashResourceName: "splash",
    },
    Keyboard: { resize: "native" },
  },
};

export default config;
