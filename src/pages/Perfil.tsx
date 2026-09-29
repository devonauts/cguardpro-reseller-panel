import { Dato, Tarjeta, TarjetaCabecera } from "@/components/cristal";
import { Pagina } from "@/components/panel";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import { useT } from "@/i18n/IdiomaProvider";
import { nombreDeRol } from "@/lib/rolDeSocio";
import { MiPerfil } from "@/components/cuenta/MiPerfil";
import { CambiarContrasena } from "@/components/cuenta/CambiarContrasena";
import "./Cuenta.scss";

/**
 * MI PERFIL — la PERSONA, no la empresa.
 *
 * Se entra desde la ficha de la barra superior («Mi perfil»). Aquí vive lo que
 * cada quien cambia de sí mismo: su foto, su nombre y su contraseña. Lo de la
 * empresa (razón social, facturación, marca) sigue en «Tu cuenta».
 *
 * Sin permiso de socio: es tu propio usuario, y el servidor sólo deja tocar al
 * de la sesión (`PUT /auth/profile`, `/auth/change-password`).
 */
export function Perfil() {
  const t = useT();
  const { me } = useResellerAuth();

  return (
    <Pagina titulo={t("perfil.pagina")} nota={t("perfil.paginaNota")}>
      <MiPerfil />

      {me && (
        <Tarjeta>
          <TarjetaCabecera titulo={t("perfil.acceso")} />
          <div className="cuenta__rejilla">
            <Dato etiqueta={t("cuenta.correo")} valor={me.user.email || "—"} />
            <Dato
              etiqueta={t("cuenta.rol")}
              valor={me.membership?.role ? nombreDeRol(me.membership.role) : "—"}
            />
            <Dato etiqueta={t("perfil.empresa")} valor={me.reseller.displayName || "—"} />
          </div>
          <p className="cuenta__nota">{t("perfil.notaAcceso")}</p>
        </Tarjeta>
      )}

      <CambiarContrasena />
    </Pagina>
  );
}

export default Perfil;
