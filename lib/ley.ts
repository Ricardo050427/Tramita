// Citas literales de la Ley Nacional para Eliminar Trámites Burocráticos (DOF 16/07/2025).
export const LEY = "Ley Nacional para Eliminar Trámites Burocráticos";
export const LIGA_LEY = "https://www.diputados.gob.mx/LeyesBiblio/pdf/LNETB.pdf";

export type Fundamento = { articulo: string; texto: string };

export const FUNDAMENTOS = {
  soloPublicados: {
    articulo: "Artículo 6, fracción II",
    texto:
      "…que únicamente se exijan trámites y requisitos que se encuentren expresamente establecidos en ordenamientos vigentes y que estén registrados en el Portal Ciudadano Único de Trámites y Servicios.",
  },
  ningunaCondicion: {
    articulo: "Artículo 51",
    texto: "…para que ninguna autoridad solicite trámites, requisitos o cualquier otra condición que no esté expresamente establecida…",
  },
  copias: { articulo: "Artículo 19, fracción IV", texto: "No solicitar copias simples para la gestión de trámites o servicios." },
  propios: { articulo: "Artículo 19, fracción I", texto: "No solicitar documentos que los mismos Sujetos Obligados expidan." },
  digitales: { articulo: "Artículo 19, fracción V", texto: "Los documentos digitales tienen la misma validez que los físicos." },
  monto: {
    articulo: "Artículo 54, fracción XI",
    texto: "El monto de los derechos o aprovechamientos aplicables o la forma de determinar dicho monto…",
  },
  gratuidad: {
    articulo: "Artículo 6, fracción XXIV",
    texto: "Gratuidad en la Atención: la orientación, recepción, atención o canalización de trámites o servicios sea gratuita.",
  },
  plazo: { articulo: "Artículo 54, fracción IX", texto: "El plazo que tiene el Sujeto Obligado para resolver el trámite o servicio…" },
  requisitos: { articulo: "Artículo 54, fracción VI", texto: "Cada uno de los requisitos que se solicitan." },
  noRechazo: {
    articulo: "Artículo 6, fracción XXIII",
    texto: "…ningún Sujeto Obligado niegue la recepción de quejas, solicitudes o demanda ciudadana, y de no ser competente, la canalice…",
  },
} satisfies Record<string, Fundamento>;

// Fracciones del artículo 54 que se pueden comprobar con lo que publica el catálogo municipal.
export const FRACCIONES_54 = [
  { id: "IV", corto: "Fundamento legal", texto: "Fundamento jurídico de la existencia del trámite o servicio y de sus requisitos." },
  { id: "VI", corto: "Requisitos", texto: "Cada uno de los requisitos que se solicitan." },
  { id: "VIII", corto: "Teléfono de contacto", texto: "Los medios de contacto del Sujeto Obligado responsable del trámite o servicio." },
  { id: "IX", corto: "Plazo para resolver", texto: "El plazo que tiene el Sujeto Obligado para resolver el trámite o servicio." },
  { id: "XI", corto: "Costo", texto: "El monto de los derechos o aprovechamientos aplicables o la forma de determinar dicho monto." },
  { id: "XII", corto: "Vigencia", texto: "La vigencia de los avisos, permisos, licencias, autorizaciones, registros y demás resoluciones que se emitan." },
  { id: "XIII", corto: "Oficina y domicilio", texto: "Las oficinas autorizadas para la recepción de la solicitud del trámite o servicio, incluyendo el domicilio y área responsable." },
  { id: "XIV", corto: "Horario", texto: "Los horarios de atención al público." },
] as const;

export type IdFraccion = (typeof FRACCIONES_54)[number]["id"];

// La denuncia oficial ante la Contraloría Municipal (ficha HMO-00025 del catálogo).
export const DENUNCIA = { clave: "HMO-00025", telefono: "662 289 3025" };
export const FECHA_CATALOGO = "2026-11-09";
export const SITIO = "https://tramita-blond.vercel.app";

export const fechaLegible = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "America/Hermosillo" }).format(new Date(`${iso}T12:00:00-07:00`));
