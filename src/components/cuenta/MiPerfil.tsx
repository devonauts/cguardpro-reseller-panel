import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

import { Boton, Campo, Tarjeta, TarjetaCabecera } from "@/components/cristal";
import { Avatar } from "@/components/panel/Avatar";
import { put } from "@/services/api";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import { useT } from "@/i18n/IdiomaProvider";

/**
 * Tu nombre y tu foto — lo único que la persona puede cambiar de sí misma.
 *
 * Va por `PUT /auth/profile`, el mismo del CRM: sólo toca al usuario de la
 * sesión, así que no hace falta ningún permiso de socio. La foto se reduce en
 * el navegador a 512 px antes de subirla: una foto del teléfono pesa varios MB
 * y aquí sólo se pinta en un círculo.
 */
const LADO_MAXIMO = 512;
const PESO_MAXIMO_ORIGINAL = 15 * 1024 * 1024;

function reducirFoto(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, LADO_MAXIMO / Math.max(img.width, img.height));
      const lienzo = document.createElement("canvas");
      lienzo.width = Math.round(img.width * escala);
      lienzo.height = Math.round(img.height * escala);
      const ctx = lienzo.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("canvas")); return; }
      ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
      URL.revokeObjectURL(url);
      resolve(lienzo.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("imagen")); };
    img.src = url;
  });
}

export function MiPerfil() {
  const t = useT();
  const { me, recargar } = useResellerAuth();
  const entrada = useRef<HTMLInputElement>(null);

  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  useEffect(() => {
    setNombres(me?.user.firstName || "");
    setApellidos(me?.user.lastName || "");
  }, [me?.user.firstName, me?.user.lastName]);

  if (!me) return null;

  const nombreVisible = me.user.fullName || me.user.email || "?";
  const foto = me.user.avatarUrl || null;
  const cambioNombre =
    nombres.trim() !== (me.user.firstName || "") || apellidos.trim() !== (me.user.lastName || "");

  const guardarPerfil = async (data: Record<string, unknown>, aviso: string) => {
    setError(null);
    setHecho(null);
    await put("/auth/profile", { data });
    await recargar();
    setHecho(aviso);
  };

  const enviarNombre = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    if (!nombres.trim()) { setError(t("perfil.faltaNombre")); return; }
    setEnviando(true);
    try {
      await guardarPerfil(
        { firstName: nombres.trim(), lastName: apellidos.trim() },
        t("perfil.nombreGuardado"),
      );
    } catch (err: any) {
      setError(err?.message || t("perfil.noGuardo"));
    } finally {
      setEnviando(false);
    }
  };

  const elegirFoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    if (!archivo.type.startsWith("image/")) { setError(t("perfil.fotoNoImagen")); return; }
    if (archivo.size > PESO_MAXIMO_ORIGINAL) { setError(t("perfil.fotoPesada")); return; }
    setSubiendoFoto(true);
    try {
      const base64 = await reducirFoto(archivo);
      await guardarPerfil({ avatars: [{ base64 }] }, t("perfil.fotoGuardada"));
    } catch (err: any) {
      setError(err?.message || t("perfil.noGuardo"));
    } finally {
      setSubiendoFoto(false);
    }
  };

  const quitarFoto = async () => {
    setSubiendoFoto(true);
    try {
      await guardarPerfil({ avatars: [] }, t("perfil.fotoQuitada"));
    } catch (err: any) {
      setError(err?.message || t("perfil.noGuardo"));
    } finally {
      setSubiendoFoto(false);
    }
  };

  return (
    <Tarjeta>
      <TarjetaCabecera titulo={t("perfil.titulo")} />
      <div className="perfil">
        <div className="perfil__foto">
          <Avatar nombre={nombreVisible} foto={foto} tamano={88} />
          <div className="perfil__acciones">
            <input
              ref={entrada}
              type="file"
              accept="image/*"
              hidden
              onChange={elegirFoto}
            />
            <Boton variante="suave" cargando={subiendoFoto} onClick={() => entrada.current?.click()}>
              {foto ? t("perfil.cambiarFoto") : t("perfil.subirFoto")}
            </Boton>
            {foto && (
              <Boton variante="fantasma" disabled={subiendoFoto} onClick={quitarFoto}>
                {t("perfil.quitarFoto")}
              </Boton>
            )}
          </div>
        </div>

        <form className="cuenta__clave" onSubmit={enviarNombre} noValidate>
          <Campo
            etiqueta={t("perfil.nombres")}
            autoComplete="given-name"
            value={nombres}
            maxLength={80}
            onChange={(e) => setNombres(e.target.value)}
          />
          <Campo
            etiqueta={t("perfil.apellidos")}
            autoComplete="family-name"
            value={apellidos}
            maxLength={80}
            onChange={(e) => setApellidos(e.target.value)}
          />
          <div>
            <Boton type="submit" cargando={enviando} disabled={!cambioNombre}>
              {t("perfil.guardarNombre")}
            </Boton>
          </div>
        </form>
      </div>
      {error && <p role="alert" className="cuenta__error">{error}</p>}
      {hecho && <p role="status" className="cuenta__nota">{hecho}</p>}
    </Tarjeta>
  );
}

export default MiPerfil;
