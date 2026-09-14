import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Boton, Campo, Tarjeta, TarjetaCabecera } from "@/components/ui/kit";
import { companiesService, type AltaDeEmpresa } from "@/services/resellerService";
import "./CompanyForm.css";

/**
 * Dar de alta una empresa.
 *
 * ── LO QUE ESTE FORMULARIO NO TIENE, Y ES LO IMPORTANTE ───────────────────
 * No hay selector de quién factura, ni de socio, ni de plan, ni de prueba, ni
 * de Stripe, ni de suspensión, ni de módulos. Esos valores los pone el servidor
 * y no son negociables: una empresa dada de alta por un socio nace suya, la
 * factura él, y CGuardPro no le abre ninguna prueba ni le cobra nada
 * directamente. Ofrecer un control para algo que el servidor va a ignorar sólo
 * enseña a la gente que el formulario miente.
 *
 * Se explica en la pantalla, además, porque quien la rellena está dando de alta
 * a un cliente suyo y necesita saber qué acaba de pasar.
 */
export function CompanyCreate() {
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [businessTitle, setBusinessTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [taxNumber, setTaxNumber] = useState("");

  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");

  const puedeEnviar = name.trim().length > 0 && ownerEmail.trim().length > 0;

  const enviar = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!puedeEnviar || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const datos: AltaDeEmpresa = {
        name: name.trim(),
        businessTitle: businessTitle.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        country: country.trim() || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        taxNumber: taxNumber.trim() || undefined,
        owner: {
          email: ownerEmail.trim(),
          firstName: ownerFirstName.trim() || undefined,
          lastName: ownerLastName.trim() || undefined,
        },
      };
      const r = await companiesService.create(datos);
      navigate(`/companies/${r.company.id}`, { replace: true });
    } catch (e: any) {
      /* El 409 del cupo lleno llega aquí. Se enseña el mensaje del servidor tal
         cual: dice cuántas empresas son el límite, que es lo que hace falta
         saber. */
      setError(e?.message || "No se pudo dar de alta la empresa.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} noValidate>
      <header className="cabecera">
        <div>
          <h1 className="cabecera__titulo">Dar de alta una empresa</h1>
          <p className="cabecera__sub">
            Quedará bajo tu marca y tú te encargas de su facturación.
          </p>
        </div>
        <Boton variante="fantasma" onClick={() => navigate("/companies")}>
          Cancelar
        </Boton>
      </header>

      <div className="ficha">
        <div className="ficha__columna">
          <Tarjeta>
            <TarjetaCabecera titulo="La empresa" />
            <div className="ficha__campos">
              <Campo
                etiqueta="Nombre"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                ayuda="Con el que la vas a reconocer en tu panel."
              />
              <Campo
                etiqueta="Razón social"
                value={businessTitle}
                onChange={(e) => setBusinessTitle(e.target.value)}
              />
              <Campo
                etiqueta="Correo de contacto"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Campo
                etiqueta="Teléfono"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Campo
                etiqueta="País"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                ayuda="Dos letras, p. ej. EC."
              />
              <Campo
                etiqueta="Ciudad"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <Campo
                etiqueta="Dirección"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <Campo
                etiqueta="Identificación tributaria"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
              />
            </div>
          </Tarjeta>
        </div>

        <div className="ficha__columna">
          <Tarjeta>
            <TarjetaCabecera
              titulo="Su administrador"
              nota="Recibirá una invitación para entrar y poner su contraseña."
            />
            <div className="ficha__campos">
              <Campo
                etiqueta="Correo"
                type="email"
                required
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
              />
              <Campo
                etiqueta="Nombre"
                value={ownerFirstName}
                onChange={(e) => setOwnerFirstName(e.target.value)}
              />
              <Campo
                etiqueta="Apellido"
                value={ownerLastName}
                onChange={(e) => setOwnerLastName(e.target.value)}
              />
            </div>
          </Tarjeta>

          <Tarjeta>
            <TarjetaCabecera titulo="Qué va a pasar" />
            <ul className="ficha__lista">
              <li>La empresa queda bajo tu marca, con tu logotipo y tus colores.</li>
              <li>
                <strong>CGuard Pro no le factura nada</strong> ni le pide una
                tarjeta: tú te encargas de cobrarle.
              </li>
              <li>
                No tiene periodo de prueba de CGuard Pro — empieza operativa
                desde el primer día.
              </li>
              <li>
                Su administrador recibe una invitación por correo para entrar.
              </li>
            </ul>
          </Tarjeta>
        </div>
      </div>

      {error && <p role="alert" className="ficha__error">{error}</p>}

      <div className="ficha__pie">
        <Boton variante="fantasma" onClick={() => navigate("/companies")}>
          Cancelar
        </Boton>
        <Boton type="submit" cargando={enviando} disabled={!puedeEnviar}>
          Dar de alta
        </Boton>
      </div>
    </form>
  );
}

export default CompanyCreate;
