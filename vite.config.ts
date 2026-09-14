import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * El panel de socio es su propia aplicación.
 *
 * Se sirve bajo `/panel/` del host de la plataforma, igual que el panel de
 * superadmin se sirve bajo `/superadmin/`: mismo backend, artefacto distinto.
 * Que sea `base` y no raíz importa — con `base: '/'` los recursos se pedirían a
 * `/assets/...` y los serviría el CRM, que es otra aplicación.
 *
 * ── EL CORTAFUEGOS ────────────────────────────────────────────────────────
 * `resolve.alias` NO define `@/` apuntando a ningún otro proyecto, y no hay
 * ningún alias hacia `frontend/` ni `superadmin/`. Además, `npm run build`
 * ejecuta `scripts/checkImportFirewall.mjs` ANTES de compilar y
 * `scripts/checkBundle.mjs` DESPUÉS, así que una importación cruzada no llega a
 * producirse ni se cuela en el paquete.
 */
export default defineConfig({
  base: "/panel/",
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
