import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * El panel de socio es su propia aplicación, en su PROPIO ANFITRIÓN.
 *
 * `https://partners.cguardpro.com` — el plano de control comercial de los
 * socios, separado de `app.cguardpro.com`, que es la operación.
 *
 * ── POR QUÉ RAÍZ Y YA NO `/panel/` ────────────────────────────────────────
 * Vivía bajo `/panel/` del anfitrión del CRM porque compartía sitio con él, y
 * entonces `base` tenía que ser el prefijo: con la raíz, los recursos se
 * habrían pedido a `/assets/...` y los habría servido el CRM, que es otra
 * aplicación.
 *
 * Con anfitrión propio ese problema desaparece —no hay nada más ahí— y el
 * prefijo pasa a ser sólo ruido en cada URL que el socio ve y comparte:
 * `partners.cguardpro.com/domains` en vez de
 * `partners.cguardpro.com/panel/domains`.
 *
 * Y no es sólo estética. Mezclar el plano de control comercial con el
 * anfitrión de la operación significaba que un fallo de aislamiento en uno
 * quedaba a un `location` de distancia del otro, y que ambos compartían origen
 * de navegador: mismo `localStorage`, mismas cookies, mismo alcance de
 * `Service Worker`. Separarlos es aislamiento de arquitectura, no decoración.
 *
 * ── Y NO ES UNA MEDIDA DE SEGURIDAD ───────────────────────────────────────
 * Que el anfitrión sea otro no protege nada por sí mismo: es público y
 * adivinable. Lo que protege sigue siendo la autenticación del socio, su
 * membresía, sus permisos, los límites de frecuencia y la auditoría.
 *
 * ── EL CORTAFUEGOS ────────────────────────────────────────────────────────
 * `resolve.alias` NO define `@/` apuntando a ningún otro proyecto, y no hay
 * ningún alias hacia `frontend/` ni `superadmin/`. Además, `npm run build`
 * ejecuta `scripts/checkImportFirewall.mjs` ANTES de compilar y
 * `scripts/checkBundle.mjs` DESPUÉS, así que una importación cruzada no llega a
 * producirse ni se cuela en el paquete.
 */
export default defineConfig({
  base: "/",
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 5184,
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_API_TARGET || "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: { "vendor-react": ["react", "react-dom", "react-router-dom"] },
      },
    },
  },
});
