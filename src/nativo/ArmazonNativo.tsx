import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { useResellerAuth } from "@/auth/ResellerAuthContext";
import { FondoEspacial, Icono } from "@/components/cristal";
import { nombreDeRol } from "@/lib/rolDeSocio";
import { useT } from "@/i18n/IdiomaProvider";
import { IonApp, IonContent, IonPage, setupIonicReact } from "./ionic";
import BarraDePestanas from "./BarraDePestanas";
import HojaDeSecciones from "./HojaDeSecciones";
import "./ArmazonNativo.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL ARMAZÓN DE LA APP INSTALADA
 *
 * El mismo panel, con la forma de una aplicación: cabecera fina arriba,
 * contenido que se desplaza con inercia, y una barra de pestañas abajo.
 *
 * ── POR QUÉ ESTE FICHERO SE CARGA SOLO ────────────────────────────────────
 * Es el único sitio que toca Ionic, y está detrás de un `import()`. Se midió
 * por qué: con Ionic dentro del armazón compartido, el paquete de entrada
 * pasaba de 221 kB a 1.030 kB — y quien abre el panel en un navegador no usa
 * nada de eso. §42 dice que la web sigue siendo un producto de primera, y
 * cuadruplicarle la descarga para servir al móvil es justo lo contrario.
 *
 * ── QUÉ PONE IONIC Y QUÉ PONEMOS NOSOTROS ─────────────────────────────────
 * Ionic: el contenedor de desplazamiento con inercia, el hueco de las zonas
 * seguras y las clases de plataforma que hacen que iOS se sienta como iOS.
 * Nosotros: todo lo que se ve — el cristal ahumado, los iconos, la letra y el
 * acento. La app se parece al panel, no a una app de Ionic pintada por encima.
 * ════════════════════════════════════════════════════════════════════════════
 */

/* Una vez, al cargar el módulo. `setupIonicReact` decide el modo —`ios` o
   `md`— y ese modo no puede cambiar a mitad de sesión sin dejar componentes
   pintados con dos reglas distintas. */
setupIonicReact({ mode: undefined });

export function ArmazonNativo({ children }: { children: ReactNode }) {
  const { me, salir } = useResellerAuth();
  const t = useT();
  const location = useLocation();
  const [mas, setMas] = useState(false);

  /* Al navegar se cierra la hoja. Sin esto, al volver de una sección queda
     abierta sobre la pantalla nueva. */
  useEffect(() => { setMas(false); }, [location.pathname]);

  const nombreDelSocio = me?.branding?.platformName
    || me?.reseller.displayName
    || me?.reseller.legalName
    || t("armazon.tituloNeutro");

  const persona = me?.user.fullName
    || [me?.user.firstName, me?.user.lastName].filter(Boolean).join(" ")
    || me?.user.email
    || t("armazon.miCuenta");

  return (
    <IonApp>
      <FondoEspacial />

      <IonPage className="nativo">
        {/* La cabecera NO es `IonHeader`: ese trae su propia barra opaca y su
            sombra, y habría que desactivarle las dos para que dejara ver el
            fondo. Una tira de cristal nuestra hace lo mismo y ya combina. */}
        <header className="nativo__cabecera">
          <div className="nativo__socio">
            <span className="nativo__socio-nombre">{nombreDelSocio}</span>
            {me?.reseller.publicId && (
              <span className="nativo__socio-codigo">{me.reseller.publicId}</span>
            )}
          </div>

          <div className="nativo__persona" title={persona}>
            <Icono nombre="personas" tamano={16} />
            <span className="nativo__persona-texto">
              <span className="nativo__persona-nombre">{persona}</span>
              {me?.membership?.role && (
                <span className="nativo__persona-rol">{nombreDeRol(me.membership.role)}</span>
              )}
            </span>
          </div>
        </header>

        {/* `fullscreen` deja que el contenido corra por debajo de las zonas
            seguras; el hueco lo pone la cabecera, que sí las respeta. */}
        <IonContent fullscreen className="nativo__contenido">
          <main id="contenido" className="nativo__interior" tabIndex={-1}>
            {children}
          </main>
        </IonContent>

        <HojaDeSecciones
          abierta={mas}
          onCerrar={() => setMas(false)}
          onSalir={salir}
        />

        <BarraDePestanas masAbierto={mas} onMas={() => setMas((v) => !v)} />
      </IonPage>
    </IonApp>
  );
}

export default ArmazonNativo;
