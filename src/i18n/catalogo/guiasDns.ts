import type { Idioma } from "@/i18n/idioma";

/**
 * Step-by-step guides for adding the CNAME at the most common DNS providers.
 *
 * Written for someone who has never opened a DNS panel: where to click, what
 * each field is called THERE (every provider names them differently: "Host",
 * "Name", "Host name", "Record name"…) and the traps each one has.
 *
 * Placeholders: {host} = what goes in the name field (relative), {destino} =
 * our target, {dominio} = the registered domain.
 */

export interface GuiaDeProveedor {
  id: string;
  nombre: string;
  /** Where the partner can recognise it from (e.g. "you pay at namecheap.com"). */
  pista: string;
  pasos: string[];
  /** Traps specific to this provider. */
  ojo?: string[];
}

const es: GuiaDeProveedor[] = [
  {
    id: "namecheap",
    nombre: "Namecheap",
    pista: "Compraste el dominio en namecheap.com",
    pasos: [
      "Entra a namecheap.com, abre «Domain List» en el menú de la izquierda y pulsa «Manage» junto a {dominio}.",
      "Abre la pestaña «Advanced DNS».",
      "En «Host Records» pulsa «Add New Record» y elige «CNAME Record».",
      "En «Host» escribe exactamente: {host}",
      "En «Value» (o «Target») escribe exactamente: {destino}",
      "Deja «TTL» en «Automatic» y pulsa el ✓ verde para guardar.",
    ],
    ojo: [
      "En «Host» NO escribas el dominio completo: Namecheap le añade «.{dominio}» por su cuenta. Si pones {host}.{dominio}, el registro queda en {host}.{dominio}.{dominio} y no funciona.",
      "Si ya existe otro registro con Host {host} (A, CNAME, TXT o «URL Redirect»), bórralo con el icono de la papelera: no pueden convivir.",
      "No cambies los «Nameservers»: deja «Namecheap BasicDNS».",
    ],
  },
  {
    id: "godaddy",
    nombre: "GoDaddy",
    pista: "Compraste el dominio en godaddy.com",
    pasos: [
      "Entra a godaddy.com y abre «My Products» (Mis productos).",
      "Junto a {dominio} pulsa «DNS» (o «Manage DNS» / «Administrar DNS»).",
      "Pulsa «Add New Record» (Agregar nuevo registro).",
      "En «Type» elige «CNAME».",
      "En «Name» escribe exactamente: {host}",
      "En «Value» escribe exactamente: {destino}",
      "Deja el «TTL» como está (1 hora) y pulsa «Save».",
    ],
    ojo: [
      "En «Name» NO escribas el dominio completo; GoDaddy le añade «.{dominio}».",
      "Si ya existe un registro con el nombre {host}, edítalo con el lápiz en vez de crear otro.",
    ],
  },
  {
    id: "cloudflare",
    nombre: "Cloudflare",
    pista: "Tu dominio usa Cloudflare (dash.cloudflare.com)",
    pasos: [
      "Entra a dash.cloudflare.com y elige {dominio}.",
      "Abre «DNS» → «Records» y pulsa «Add record».",
      "En «Type» elige «CNAME».",
      "En «Name» escribe exactamente: {host}",
      "En «Target» escribe exactamente: {destino}",
      "Pon «Proxy status» en GRIS («DNS only»): pulsa la nube naranja hasta que quede gris.",
      "Pulsa «Save».",
    ],
    ojo: [
      "La nube tiene que quedar GRIS («DNS only»). En naranja, el certificado HTTPS no se emite y la verificación no pasa.",
    ],
  },
  {
    id: "squarespace",
    nombre: "Squarespace / Google Domains",
    pista: "Lo compraste en Google Domains (ahora es Squarespace) o en Squarespace",
    pasos: [
      "Entra a account.squarespace.com/domains y elige {dominio}.",
      "Abre «DNS» → «DNS Settings».",
      "En «Custom records» pulsa «Add record».",
      "En «Host» escribe exactamente: {host}",
      "En «Type» elige «CNAME».",
      "En «Data» escribe exactamente: {destino}",
      "Pulsa «Save».",
    ],
  },
  {
    id: "hostinger",
    nombre: "Hostinger",
    pista: "Tu dominio está en hPanel de Hostinger",
    pasos: [
      "Entra a hPanel, abre «Domains» y elige {dominio}.",
      "Abre «DNS / Nameservers» → «DNS records».",
      "En «Type» elige «CNAME».",
      "En «Name» escribe exactamente: {host}",
      "En «Target» escribe exactamente: {destino}",
      "Deja el TTL como está y pulsa «Add Record».",
    ],
    ojo: [
      "Si Hostinger avisa de que ya hay un registro con ese nombre, bórralo primero en la lista de abajo.",
    ],
  },
  {
    id: "ionos",
    nombre: "IONOS (1&1)",
    pista: "Tu dominio está en ionos.com",
    pasos: [
      "Entra a ionos.com, abre «Domains & SSL».",
      "Pulsa el engranaje junto a {dominio} y elige «DNS».",
      "Pulsa «Add record» y elige «CNAME».",
      "En «Host name» escribe exactamente: {host}",
      "En «Points to» escribe exactamente: {destino}",
      "Pulsa «Save». Si IONOS ofrece borrar registros que chocan, acepta.",
    ],
  },
  {
    id: "wix",
    nombre: "Wix",
    pista: "Tu dominio está conectado a Wix",
    pasos: [
      "En el panel de Wix abre «Domains».",
      "Pulsa «⋯» junto a {dominio} y elige «Manage DNS Records».",
      "En la sección «CNAME» pulsa «+ Add Record».",
      "En «Host Name» escribe exactamente: {host}",
      "En «Value» escribe exactamente: {destino}",
      "Pulsa «Save» y confirma.",
    ],
  },
  {
    id: "route53",
    nombre: "Amazon Route 53",
    pista: "Tu DNS está en AWS",
    pasos: [
      "En la consola de AWS abre «Route 53» → «Hosted zones» y elige {dominio}.",
      "Pulsa «Create record».",
      "En «Record name» escribe exactamente: {host}",
      "En «Record type» elige «CNAME».",
      "En «Value» escribe exactamente: {destino}",
      "Deja «TTL» en 300 y pulsa «Create records».",
    ],
  },
  {
    id: "otro",
    nombre: "Otro proveedor",
    pista: "Cualquier otro sitio donde administres el DNS",
    pasos: [
      "Entra al panel donde compraste el dominio y busca «DNS», «Zona DNS» o «Registros DNS» de {dominio}.",
      "Crea un registro nuevo de tipo «CNAME».",
      "En el campo del nombre («Host», «Name», «Nombre» o «Alias») escribe: {host}",
      "En el campo del destino («Value», «Target», «Points to», «Valor» o «Destino») escribe: {destino}",
      "Guarda. Si el TTL es obligatorio, pon 3600 o «Automático».",
    ],
    ojo: [
      "Si el panel muestra el dominio al lado del campo del nombre, escribe solo {host}.",
      "Si ya hay otro registro con ese mismo nombre, bórralo: no pueden convivir.",
    ],
  },
];

const en: GuiaDeProveedor[] = [
  {
    id: "namecheap",
    nombre: "Namecheap",
    pista: "You bought the domain at namecheap.com",
    pasos: [
      "Go to namecheap.com, open “Domain List” on the left and click “Manage” next to {dominio}.",
      "Open the “Advanced DNS” tab.",
      "Under “Host Records” click “Add New Record” and choose “CNAME Record”.",
      "In “Host” type exactly: {host}",
      "In “Value” (or “Target”) type exactly: {destino}",
      "Leave “TTL” on “Automatic” and click the green ✓ to save.",
    ],
    ojo: [
      "Do NOT type the full domain in “Host”: Namecheap appends “.{dominio}” itself. {host}.{dominio} would end up at {host}.{dominio}.{dominio} and not work.",
      "If another record with Host {host} exists (A, CNAME, TXT or “URL Redirect”), delete it with the trash icon: they cannot coexist.",
      "Do not change the “Nameservers”: keep “Namecheap BasicDNS”.",
    ],
  },
  {
    id: "godaddy",
    nombre: "GoDaddy",
    pista: "You bought the domain at godaddy.com",
    pasos: [
      "Go to godaddy.com and open “My Products”.",
      "Next to {dominio} click “DNS” (or “Manage DNS”).",
      "Click “Add New Record”.",
      "In “Type” choose “CNAME”.",
      "In “Name” type exactly: {host}",
      "In “Value” type exactly: {destino}",
      "Keep the “TTL” (1 hour) and click “Save”.",
    ],
    ojo: [
      "Do NOT type the full domain in “Name”; GoDaddy appends “.{dominio}”.",
      "If a record named {host} already exists, edit it with the pencil instead of adding another.",
    ],
  },
  {
    id: "cloudflare",
    nombre: "Cloudflare",
    pista: "Your domain uses Cloudflare (dash.cloudflare.com)",
    pasos: [
      "Go to dash.cloudflare.com and pick {dominio}.",
      "Open “DNS” → “Records” and click “Add record”.",
      "In “Type” choose “CNAME”.",
      "In “Name” type exactly: {host}",
      "In “Target” type exactly: {destino}",
      "Set “Proxy status” to GREY (“DNS only”): click the orange cloud until it turns grey.",
      "Click “Save”.",
    ],
    ojo: [
      "The cloud must be GREY (“DNS only”). With orange, the HTTPS certificate is not issued and verification fails.",
    ],
  },
  {
    id: "squarespace",
    nombre: "Squarespace / Google Domains",
    pista: "You bought it at Google Domains (now Squarespace) or Squarespace",
    pasos: [
      "Go to account.squarespace.com/domains and pick {dominio}.",
      "Open “DNS” → “DNS Settings”.",
      "Under “Custom records” click “Add record”.",
      "In “Host” type exactly: {host}",
      "In “Type” choose “CNAME”.",
      "In “Data” type exactly: {destino}",
      "Click “Save”.",
    ],
  },
  {
    id: "hostinger",
    nombre: "Hostinger",
    pista: "Your domain is in Hostinger's hPanel",
    pasos: [
      "Log in to hPanel, open “Domains” and pick {dominio}.",
      "Open “DNS / Nameservers” → “DNS records”.",
      "In “Type” choose “CNAME”.",
      "In “Name” type exactly: {host}",
      "In “Target” type exactly: {destino}",
      "Keep the TTL and click “Add Record”.",
    ],
    ojo: [
      "If Hostinger says a record with that name already exists, delete it first in the list below.",
    ],
  },
  {
    id: "ionos",
    nombre: "IONOS (1&1)",
    pista: "Your domain is at ionos.com",
    pasos: [
      "Go to ionos.com and open “Domains & SSL”.",
      "Click the gear next to {dominio} and choose “DNS”.",
      "Click “Add record” and choose “CNAME”.",
      "In “Host name” type exactly: {host}",
      "In “Points to” type exactly: {destino}",
      "Click “Save”. If IONOS offers to delete conflicting records, accept.",
    ],
  },
  {
    id: "wix",
    nombre: "Wix",
    pista: "Your domain is connected to Wix",
    pasos: [
      "In the Wix dashboard open “Domains”.",
      "Click “⋯” next to {dominio} and choose “Manage DNS Records”.",
      "In the “CNAME” section click “+ Add Record”.",
      "In “Host Name” type exactly: {host}",
      "In “Value” type exactly: {destino}",
      "Click “Save” and confirm.",
    ],
  },
  {
    id: "route53",
    nombre: "Amazon Route 53",
    pista: "Your DNS is on AWS",
    pasos: [
      "In the AWS console open “Route 53” → “Hosted zones” and pick {dominio}.",
      "Click “Create record”.",
      "In “Record name” type exactly: {host}",
      "In “Record type” choose “CNAME”.",
      "In “Value” type exactly: {destino}",
      "Keep “TTL” at 300 and click “Create records”.",
    ],
  },
  {
    id: "otro",
    nombre: "Other provider",
    pista: "Anywhere else you manage DNS",
    pasos: [
      "Log in where you bought the domain and look for “DNS”, “DNS zone” or “DNS records” for {dominio}.",
      "Create a new record of type “CNAME”.",
      "In the name field (“Host”, “Name” or “Alias”) type: {host}",
      "In the target field (“Value”, “Target” or “Points to”) type: {destino}",
      "Save. If TTL is required, use 3600 or “Automatic”.",
    ],
    ojo: [
      "If the panel shows the domain next to the name field, type only {host}.",
      "If another record with the same name exists, delete it: they cannot coexist.",
    ],
  },
];

export const GUIAS_DNS: Record<Idioma, GuiaDeProveedor[]> = { es, en };

export function rellenar(texto: string, v: { host: string; destino: string; dominio: string }): string {
  return texto
    .split("{host}").join(v.host)
    .split("{destino}").join(v.destino)
    .split("{dominio}").join(v.dominio);
}
