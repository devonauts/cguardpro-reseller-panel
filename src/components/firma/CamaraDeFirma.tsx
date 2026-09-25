import { useEffect, useRef, useState } from "react";
import { Boton } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import "./CamaraDeFirma.scss";

type Estado = "inicial" | "pidiendo" | "enVivo" | "tomada" | "denegada" | "sinCamara";

/**
 * The signing photo, taken live with the device's camera.
 *
 * There is no file picker on purpose: an uploaded picture could be any old
 * photo of anyone. The browser asks for camera permission, the partner sees
 * themselves, and the shot is taken on the spot and sent as a JPEG. The time
 * and place of the signature come from the signing moment and the device's
 * geolocation, which the form requires separately.
 */
export function CamaraDeFirma({ onCambio }: { onCambio: (foto: File | null, vista: string | null) => void }) {
  const t = useT();
  const video = useRef<HTMLVideoElement>(null);
  const flujo = useRef<MediaStream | null>(null);
  const [estado, setEstado] = useState<Estado>("inicial");
  const [vista, setVista] = useState<string | null>(null);

  const apagar = () => {
    flujo.current?.getTracks().forEach((p) => p.stop());
    flujo.current = null;
  };

  useEffect(() => () => { apagar(); }, []);
  useEffect(() => () => { if (vista) URL.revokeObjectURL(vista); }, [vista]);

  const abrir = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setEstado("sinCamara"); return; }
    setEstado("pidiendo");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      flujo.current = s;
      setEstado("enVivo");
      // The <video> mounts with the live state: attach the stream once it exists.
      window.setTimeout(() => {
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play().catch(() => undefined);
        }
      }, 0);
    } catch (e: any) {
      setEstado(e?.name === "NotFoundError" || e?.name === "OverconstrainedError" ? "sinCamara" : "denegada");
    }
  };

  const disparar = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob((b) => {
      if (!b) return;
      const archivo = new File([b], `firma-${Date.now()}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
      const url = URL.createObjectURL(archivo);
      setVista(url);
      setEstado("tomada");
      apagar();
      onCambio(archivo, url);
    }, "image/jpeg", 0.9);
  };

  const otra = () => {
    setVista(null);
    onCambio(null, null);
    void abrir();
  };

  return (
    <div className="camara-firma">
      {estado === "enVivo" && (
        <>
          <video ref={video} className="camara-firma__video" playsInline muted autoPlay aria-label={t("firma.camaraEnVivo")} />
          <Boton type="button" onClick={disparar}>{t("firma.fotoDisparar")}</Boton>
        </>
      )}

      {estado === "tomada" && vista && (
        <>
          <img className="camara-firma__foto" src={vista} alt={t("firma.fotoAlt")} />
          <Boton variante="suave" type="button" onClick={otra}>{t("firma.fotoOtra")}</Boton>
        </>
      )}

      {(estado === "inicial" || estado === "pidiendo" || estado === "denegada" || estado === "sinCamara") && (
        <Boton variante="suave" type="button" onClick={abrir} cargando={estado === "pidiendo"}>
          {t("firma.camaraAbrir")}
        </Boton>
      )}
      {estado === "pidiendo" && <p className="camara-firma__nota">{t("firma.camaraPermiso")}</p>}
      {estado === "denegada" && <p role="alert" className="camara-firma__error">{t("firma.camaraDenegada")}</p>}
      {estado === "sinCamara" && <p role="alert" className="camara-firma__error">{t("firma.camaraNoHay")}</p>}
    </div>
  );
}

export default CamaraDeFirma;
