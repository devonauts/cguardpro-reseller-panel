import { Icono } from "../Icono";
import "./Marca.scss";

/**
 * El emblema de C-Guard Pro Partners.
 *
 * ── AQUÍ SÍ VA NUESTRA MARCA, Y ANTES NO ──────────────────────────────────
 * La pantalla de entrada llevaba escrito «SIN MARCA» a propósito: cuando el
 * panel vivía bajo `app.cguardpro.com/panel/` compartía anfitrión con el CRM
 * de los clientes, y ahí poner «CGuard Pro» sería lo contrario de lo que este
 * producto vende — marca blanca.
 *
 * `partners.cguardpro.com` es OTRA cosa: es el portal de socios DE CGuard Pro,
 * y quien entra es nuestro socio comercial, no el cliente de nadie. Aquí la
 * marca que corresponde es la nuestra. La del socio sigue sin aparecer jamás
 * en el CRM de sus clientes, que es donde importaba.
 */
export function Marca() {
  return (
    <div className="marca-cgp">
      <span className="marca-cgp__escudo">
        <Icono nombre="escudo" tamano={22} />
      </span>
      <span className="marca-cgp__texto">
        {/* NINGUNA de las dos se traduce: «C-Guard Pro Partners» es el nombre
            del producto, no una frase. Traducir la coletilla daría «C-GUARD PRO
            SOCIOS», que no es como se llama esto en ningún idioma. */}
        <span className="marca-cgp__nombre">C-GUARD PRO</span>
        <span className="marca-cgp__coletilla">PARTNERS</span>
      </span>
    </div>
  );
}

export default Marca;
