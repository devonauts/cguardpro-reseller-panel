import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * LOS PROYECTOS NATIVOS · LO QUE NO SE DECIDE EN CÓDIGO
 *
 * El identificador, el equipo y los permisos no son detalles de maquetación:
 * cambiarlos rompe la firma, o pide en la tienda algo que esta app no usa. Se
 * decidieron una vez y esto los sujeta.
 * ════════════════════════════════════════════════════════════════════════════
 */

const RAIZ = path.resolve(__dirname, "../../..");
const hay = (p: string) => fs.existsSync(path.join(RAIZ, p));
const leer = (p: string) => fs.readFileSync(path.join(RAIZ, p), "utf8");

const ID = "com.cguardpro.partners";
const EQUIPO = "CT355863NH";

describe("los proyectos nativos", () => {
  it("el identificador es el mismo en los tres sitios donde se escribe", () => {
    /* Capacitor lo propaga al crear la plataforma, pero después cada proyecto
       lleva el suyo. Si se separan, la firma deja de casar con el perfil y el
       fallo aparece al archivar, no al compilar. */
    expect(leer("capacitor.config.ts")).toContain(`appId: "${ID}"`);
    if (hay("android/app/build.gradle")) {
      expect(leer("android/app/build.gradle")).toContain(`applicationId "${ID}"`);
      expect(leer("android/app/build.gradle")).toContain(`namespace "${ID}"`);
    }
    if (hay("ios/App/App.xcodeproj/project.pbxproj")) {
      expect(leer("ios/App/App.xcodeproj/project.pbxproj"))
        .toContain(`PRODUCT_BUNDLE_IDENTIFIER = ${ID}`);
    }
  });

  it("el equipo de Apple es el de la casa, en TODAS las configuraciones", () => {
    if (!hay("ios/App/App.xcodeproj/project.pbxproj")) return;
    const pbx = leer("ios/App/App.xcodeproj/project.pbxproj");
    const equipos = [...pbx.matchAll(/DEVELOPMENT_TEAM = ([^;]+);/g)].map((m) => m[1].trim());
    const config = [...pbx.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = /g)].length;

    expect(equipos.length, "falta el equipo en alguna configuración").toBe(config);
    expect([...new Set(equipos)], "dos configuraciones firman con equipos distintos")
      .toEqual([EQUIPO]);
  });

  it("§41 · la app del socio pide lo MÍNIMO, y no lo que piden las otras", () => {
    /* La app del vigilante declara quince permisos: cámara, micrófono,
       ubicación en segundo plano, servicios en primer plano… Los necesita:
       ficha, hace rondas, manda pánico y habla por radio.
     *
     * El socio no hace nada de eso. Es un panel de administración: mira
     * empresas, dominios, facturación y su marca. Copiar el manifiesto de al
     * lado —que es lo cómodo— haría que la tienda preguntara por qué esta app
     * quiere el micrófono, y la respuesta sería que no lo quiere. */
    if (hay("android/app/src/main/AndroidManifest.xml")) {
      const man = leer("android/app/src/main/AndroidManifest.xml");
      const permisos = [...man.matchAll(/android:name="android\.permission\.([A-Z_]+)"/g)]
        .map((m) => m[1]).sort();
      /* INTERNET y nada más. Cualquier añadido futuro tiene que justificarse
         aquí, que es donde alguien lo va a leer. */
      expect(permisos, "permisos de más en la app del socio").toEqual(["INTERNET"]);
    }

    if (hay("ios/App/App/Info.plist")) {
      const plist = leer("ios/App/App/Info.plist");
      const usos = [...plist.matchAll(/<key>(NS\w*UsageDescription)<\/key>/g)].map((m) => m[1]);
      expect(usos, "iOS pide permisos que esta app no usa").toEqual([]);
      expect(plist, "modos de segundo plano que el socio no necesita")
        .not.toContain("UIBackgroundModes");
    }
  });

  it("la app sirve SU paquete: no es un navegador apuntando al panel", () => {
    /* `server.url` haría que la app cargara `partners.cguardpro.com`. Sin
       conexión no arrancaría, la tienda la rechaza como «sólo una web», y cada
       despliegue del panel cambiaría la app instalada sin pasar por revisión. */
    const cfg = leer("capacitor.config.ts").replace(/\/\*[\s\S]*?\*\//g, " ");
    expect(cfg).not.toMatch(/url\s*:/);
    expect(cfg).toContain('webDir: "dist"');
  });

  it("el nombre visible es el de la familia", () => {
    if (hay("android/app/src/main/res/values/strings.xml")) {
      expect(leer("android/app/src/main/res/values/strings.xml"))
        .toContain("CGuardPro Partners");
    }
    expect(leer("capacitor.config.ts")).toContain('appName: "CGuardPro Partners"');
  });
});
