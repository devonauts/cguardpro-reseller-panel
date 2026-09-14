import { ReactNode } from "react";
import "./AuthLayout.css";

/**
 * El marco de la pantalla de entrada: negro mate y un degradado contenido.
 *
 * SIN MARCA. Ni logotipo ni nombre de plataforma: la marca del socio llega en
 * una fase posterior y se resolverá por el anfitrión. Poner aquí «CGuard Pro»
 * sería justo lo contrario de lo que este producto vende.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth">
      <div className="auth__caja">{children}</div>
    </main>
  );
}

export default AuthLayout;
