import { FormEvent, useState } from "react";

import { Boton, Campo, Tarjeta, TarjetaCabecera } from "@/components/cristal";
import { CamposDeClave, claveCompleta } from "@/components/acceso";
import { put } from "@/services/api";
import { useT } from "@/i18n/IdiomaProvider";

/**
 * Change your own password while signed in.
 *
 * There was no way to do it: the only path was to sign out and use "forgot
 * password". Same rules and fields as creating one (`CamposDeClave`).
 */
export function CambiarContrasena() {
  const t = useT();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    setHecho(false);
    if (!actual) { setError(t("cuenta.claveFaltaActual")); return; }
    if (nueva !== repetida) { setError(t("clave.noCoincide")); return; }
    if (!claveCompleta(nueva)) { setError(t("clave.debil")); return; }
    setError(null);
    setEnviando(true);
    try {
      await put("/auth/change-password", { oldPassword: actual, newPassword: nueva });
      setActual(""); setNueva(""); setRepetida("");
      setHecho(true);
    } catch (err: any) {
      setError(err?.message || t("cuenta.claveNoCambio"));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Tarjeta>
      <TarjetaCabecera titulo={t("cuenta.claveTitulo")} />
      <form className="cuenta__clave" onSubmit={enviar} noValidate>
        <Campo
          etiqueta={t("cuenta.claveActual")}
          type="password"
          revelable
          autoComplete="current-password"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
        />
        <CamposDeClave
          clave={nueva}
          repetida={repetida}
          onClave={setNueva}
          onRepetida={setRepetida}
          etiqueta={t("cuenta.claveNueva")}
        />
        {error && <p role="alert" className="cuenta__error">{error}</p>}
        {hecho && <p role="status" className="cuenta__nota">{t("cuenta.claveCambiada")}</p>}
        <div>
          <Boton type="submit" cargando={enviando}>{t("cuenta.claveGuardar")}</Boton>
        </div>
      </form>
    </Tarjeta>
  );
}

export default CambiarContrasena;
