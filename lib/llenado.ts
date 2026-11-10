// Entrevistas para llenar formatos oficiales. Las solicitudes publicadas no traen campos
// rellenables, así que cada dato se escribe sobre su casilla.
// Las posiciones están medidas sobre la hoja 1 dibujada a 1000 px de ancho; `y` es el borde inferior de la casilla.

export type Respuestas = Record<string, string>;
type TipoDato = "texto" | "numero" | "tel" | "correo" | "rfc" | "curp" | "cp";

export type Pregunta = {
  id: string;
  etiqueta: string;
  tipo?: TipoDato;
  ayuda?: string;
  ejemplo?: string;
  obligatoria?: boolean;
  max?: number;
  autocompletar?: string;
  opciones?: { valor: string; etiqueta: string }[];
  visibleSi?: (r: Respuestas) => boolean;
};

export type Paso = { id: string; titulo: string; mensaje: string; preguntas: Pregunta[] };

type CampoTexto = { p: string; x0: number; x1: number; y: number };
type CampoMarca = { p: string; valor: string; x: number; y: number };

export type Formato = {
  id: string;
  clave: string;
  titulo: string;
  archivo: string;
  pasos: Paso[];
  textos: CampoTexto[];
  marcas: CampoMarca[];
  fecha?: { x: number; y: number };
};

const t = (p: string, x0: number, x1: number, y: number): CampoTexto => ({ p, x0, x1, y });
const esOtroDomicilio = (r: Respuestas) => r.n_igual === "otro";

function pasoPredio(conNumeros: boolean): Paso {
  return {
    id: "predio",
    titulo: "Datos del predio",
    mensaje: "¿Dónde está el predio?",
    preguntas: [
      { id: "clave", etiqueta: "Clave catastral", ayuda: "Aparece en tu recibo del predial.", max: 24 },
      { id: "calle", etiqueta: conNumeros ? "Calle" : "Calle o ubicación", obligatoria: true, max: 80, autocompletar: "address-line1" },
      ...(conNumeros
        ? [
            { id: "ext", etiqueta: "Número exterior", max: 10 },
            { id: "int", etiqueta: "Número interior", max: 10 },
          ]
        : []),
      { id: "asent", etiqueta: "Colonia o asentamiento", max: 50 },
      { id: "cp", etiqueta: "Código postal", tipo: "cp", autocompletar: "postal-code" },
    ],
  };
}

const PASO_INTERESADO: Paso = {
  id: "interesado",
  titulo: "Tus datos",
  mensaje: "¿Quién hace el trámite?",
  preguntas: [
    { id: "nombre", etiqueta: "Nombre(s) o razón social", obligatoria: true, max: 70, autocompletar: "given-name" },
    { id: "apellido1", etiqueta: "Primer apellido", max: 40, autocompletar: "family-name", ayuda: "Si tramita una empresa, déjalo vacío." },
    { id: "apellido2", etiqueta: "Segundo apellido", max: 40 },
    { id: "rfc", etiqueta: "RFC", tipo: "rfc", ejemplo: "GOMA800101AB1" },
    { id: "curp", etiqueta: "CURP", tipo: "curp" },
    { id: "telefono", etiqueta: "Teléfono", tipo: "tel", obligatoria: true, autocompletar: "tel-national" },
    { id: "correo", etiqueta: "Correo electrónico", tipo: "correo", max: 70, autocompletar: "email" },
  ],
};

const PASO_NOTIFICACION: Paso = {
  id: "notificacion",
  titulo: "Datos de notificación",
  mensaje: "¿Dónde te avisan?",
  preguntas: [
    {
      id: "n_igual",
      etiqueta: "Domicilio para recibir avisos",
      obligatoria: true,
      opciones: [
        { valor: "igual", etiqueta: "El mismo del predio" },
        { valor: "otro", etiqueta: "Otro domicilio" },
      ],
    },
    { id: "n_calle", etiqueta: "Calle", max: 80, visibleSi: esOtroDomicilio },
    { id: "n_ext", etiqueta: "Número exterior", max: 10, visibleSi: esOtroDomicilio },
    { id: "n_int", etiqueta: "Número interior", max: 10, visibleSi: esOtroDomicilio },
    { id: "n_asent", etiqueta: "Colonia o asentamiento", max: 50, visibleSi: esOtroDomicilio },
    { id: "n_municipio", etiqueta: "Municipio", max: 40, visibleSi: esOtroDomicilio },
    { id: "n_cp", etiqueta: "Código postal", tipo: "cp", visibleSi: esOtroDomicilio },
  ],
};

const camposPredio = (y1: number, y2: number, xCp: [number, number], xAsent = 727) => [
  t("clave", 71, 262, y1),
  t("calle", 272, 727, y1),
  t("ext", 739, 829, y1),
  t("int", 842, 931, y1),
  t("asent", 71, xAsent, y2),
  t("cp", xCp[0], xCp[1], y2),
];

const camposInteresado = (y1: number, y2: number, y3: number) => [
  t("nombre", 71, 673, y1),
  t("apellido1", 688, 930, y1),
  t("apellido2", 71, 362, y2),
  t("rfc", 386, 628, y2),
  t("curp", 643, 930, y2),
  t("telefono", 71, 362, y3),
  t("correo", 385, 930, y3),
];

const camposNotificacion = (y1: number, y2: number, y3: number) => [
  t("n_calle", 71, 672, y1),
  t("n_ext", 688, 799, y1),
  t("n_int", 814, 930, y1),
  t("n_asent", 71, 502, y2),
  t("n_municipio", 518, 762, y2),
  t("n_cp", 781, 930, y2),
  t("telefono", 71, 362, y3),
  t("correo", 380, 930, y3),
];

const FORMATOS: Formato[] = [
  {
    id: "7-licencia-de-construccion-solicitud-bae7e7",
    clave: "HMO-00186",
    titulo: "Solicitud de licencia de construcción",
    archivo: "7-licencia-de-construccion-solicitud-bae7e7.pdf",
    pasos: [
      {
        id: "obra",
        titulo: "La obra",
        mensaje: "Cuéntame de tu obra",
        preguntas: [
          {
            id: "tipo",
            etiqueta: "Tipo de obra",
            obligatoria: true,
            opciones: [
              { valor: "construccion", etiqueta: "Construcción" },
              { valor: "ampliacion", etiqueta: "Ampliación" },
              { valor: "remodelacion", etiqueta: "Remodelación" },
              { valor: "demolicion", etiqueta: "Demolición" },
              { valor: "rehabilitacion", etiqueta: "Rehabilitación" },
            ],
          },
          {
            id: "genero",
            etiqueta: "Género",
            obligatoria: true,
            opciones: [
              { valor: "habitacional", etiqueta: "Habitacional" },
              { valor: "comercial", etiqueta: "Comercial" },
              { valor: "industrial", etiqueta: "Industrial" },
              { valor: "via", etiqueta: "Vía pública" },
            ],
          },
          { id: "superficie", etiqueta: "Superficie a construir o demoler (m²)", tipo: "numero", obligatoria: true, max: 10 },
          { id: "proyecto", etiqueta: "Nombre o descripción del proyecto", ejemplo: "Casa habitación de una planta", max: 90 },
          { id: "lic_suelo", etiqueta: "Número de licencia de uso de suelo", max: 40, visibleSi: (r) => r.genero === "comercial" || r.genero === "industrial" },
          { id: "lic_ambiental", etiqueta: "Número de licencia ambiental integral", max: 40, visibleSi: (r) => r.genero === "comercial" || r.genero === "industrial" },
        ],
      },
      {
        id: "dro",
        titulo: "Director Responsable de Obra",
        mensaje: "¿Quién es tu DRO?",
        preguntas: [
          { id: "dro_nombre", etiqueta: "Nombre completo del DRO", max: 80, ayuda: "Si todavía no lo tienes, sigue adelante y complétalo después a mano." },
          { id: "dro_rfc", etiqueta: "RFC del DRO", tipo: "rfc" },
          { id: "dro_registro", etiqueta: "Número de registro (DGDU-DRO-)", max: 8 },
        ],
      },
      pasoPredio(true),
      PASO_INTERESADO,
      PASO_NOTIFICACION,
    ],
    textos: [
      t("superficie", 242, 401, 281),
      t("proyecto", 131, 925, 347),
      t("lic_suelo", 71, 473, 413),
      t("lic_ambiental", 524, 927, 413),
      t("dro_rfc", 71, 253, 516),
      t("dro_nombre", 259, 766, 516),
      t("dro_registro", 866, 933, 515),
      ...camposPredio(611, 654, [436, 558], 411),
      ...camposInteresado(752, 797, 843),
      ...camposNotificacion(943, 985, 1029),
    ],
    marcas: [
      { p: "genero", valor: "habitacional", x: 497.5, y: 253 },
      { p: "genero", valor: "comercial", x: 629.5, y: 253 },
      { p: "genero", valor: "industrial", x: 755.5, y: 253 },
      { p: "genero", valor: "via", x: 855.5, y: 253 },
      { p: "tipo", valor: "construccion", x: 494, y: 282 },
      { p: "tipo", valor: "remodelacion", x: 626, y: 282 },
      { p: "tipo", valor: "rehabilitacion", x: 751, y: 282 },
      { p: "tipo", valor: "ampliacion", x: 494, y: 306 },
      { p: "tipo", valor: "demolicion", x: 626, y: 306 },
    ],
  },
  {
    id: "1-licencia-de-uso-de-suelo-solicitud-3a6b46",
    clave: "HMO-00227",
    titulo: "Solicitud de licencia de uso de suelo",
    archivo: "1-licencia-de-uso-de-suelo-solicitud-3a6b46.pdf",
    pasos: [
      {
        id: "establecimiento",
        titulo: "El establecimiento",
        mensaje: "Cuéntame de tu negocio",
        preguntas: [
          { id: "giro", etiqueta: "Actividad o giro", obligatoria: true, ejemplo: "Taquería", max: 90 },
          { id: "sup_usada", etiqueta: "Superficie utilizada, con estacionamiento (m²)", tipo: "numero", max: 10 },
          { id: "sup_escrituras", etiqueta: "Superficie acreditada en las escrituras (m²)", tipo: "numero", max: 10 },
          { id: "sup_rentada", etiqueta: "Superficie rentada (m²)", tipo: "numero", max: 10, ayuda: "Solo si rentas el local." },
          { id: "lic_previa", etiqueta: "Licencia de uso de suelo anterior", max: 40, ayuda: "Solo si es renovación o ratificación." },
        ],
      },
      pasoPredio(true),
      PASO_INTERESADO,
      PASO_NOTIFICACION,
    ],
    textos: [
      t("giro", 71, 931, 258),
      t("lic_previa", 71, 540, 308),
      t("sup_usada", 557, 729, 308),
      t("sup_escrituras", 71, 363, 357),
      t("sup_rentada", 428, 720, 357),
      ...camposPredio(443, 487, [739, 860]),
      ...camposInteresado(586, 631, 678),
      ...camposNotificacion(776, 819, 867),
    ],
    marcas: [],
    fecha: { x: 809, y: 147 },
  },
  {
    id: "2-licencia-de-funcionamiento-solicitud-2e233e",
    clave: "HMO-00420",
    titulo: "Solicitud de licencia de funcionamiento",
    archivo: "2-licencia-de-funcionamiento-solicitud-2e233e.pdf",
    pasos: [
      {
        id: "establecimiento",
        titulo: "El establecimiento",
        mensaje: "Cuéntame de tu negocio",
        preguntas: [
          { id: "giro", etiqueta: "Actividad o giro", obligatoria: true, ejemplo: "Taquería", max: 80 },
          { id: "horario", etiqueta: "Días y horario de atención", ejemplo: "Lunes a sábado de 9:00 a 18:00", max: 90 },
          { id: "area", etiqueta: "Área utilizada, con estacionamiento (m²)", tipo: "numero", max: 10 },
          { id: "cajones", etiqueta: "Cajones de estacionamiento", tipo: "numero", max: 6 },
          { id: "lic_suelo", etiqueta: "Número de licencia de uso de suelo", max: 40 },
          { id: "lic_ambiental", etiqueta: "Número de licencia ambiental integral", max: 40 },
          {
            id: "sareh",
            etiqueta: "¿Tu giro está en el catálogo SAREH?",
            ayuda: "SAREH es el Sistema de Apertura Rápida de Empresas. Si no lo sabes, déjalo en «No sé» y pregunta en ventanilla.",
            opciones: [
              { valor: "si", etiqueta: "Sí" },
              { valor: "no", etiqueta: "No" },
              { valor: "nose", etiqueta: "No sé" },
            ],
          },
        ],
      },
      pasoPredio(true),
      PASO_INTERESADO,
      PASO_NOTIFICACION,
    ],
    textos: [
      t("giro", 69, 760, 296),
      t("lic_suelo", 71, 463, 342),
      t("lic_ambiental", 482, 932, 342),
      t("horario", 71, 931, 390),
      t("area", 256, 410, 427),
      t("cajones", 725, 880, 427),
      ...camposPredio(531, 574, [739, 860]),
      ...camposInteresado(674, 720, 766),
      ...camposNotificacion(869, 912, 959),
    ],
    marcas: [
      { p: "sareh", valor: "si", x: 841, y: 283.5 },
      { p: "sareh", valor: "no", x: 886, y: 283.5 },
    ],
  },
  {
    id: "3-autorizacion-de-numeros-oficiales-014207",
    clave: "HMO-00211",
    titulo: "Solicitud de autorización de número oficial",
    archivo: "3-autorizacion-de-numeros-oficiales-014207.pdf",
    pasos: [pasoPredio(false), PASO_INTERESADO, PASO_NOTIFICACION],
    textos: [
      t("clave", 71, 297, 292),
      t("calle", 324, 931, 292),
      t("asent", 71, 297, 337),
      t("cp", 324, 466, 337),
      ...camposInteresado(446, 491, 537),
      ...camposNotificacion(656, 699, 747),
    ],
    marcas: [],
    fecha: { x: 809, y: 156 },
  },
];

export const idsFormatos = FORMATOS.map((f) => f.id);
export const formatoPorId = (id: string) => FORMATOS.find((f) => f.id === id);
export const esLlenable = (id: string) => idsFormatos.includes(id);

// Datos que se recuerdan en el dispositivo para no volver a pedirlos en otro formato.
const DATOS_RECORDADOS = ["nombre", "apellido1", "apellido2", "rfc", "curp", "telefono", "correo", "clave", "calle", "ext", "int", "asent", "cp", "n_igual", "n_calle", "n_ext", "n_int", "n_asent", "n_municipio", "n_cp"];
const PERFIL = "tramita:perfil";

export function leerPerfil(): Respuestas {
  try {
    return JSON.parse(localStorage.getItem(PERFIL) ?? "{}");
  } catch {
    return {};
  }
}

export function guardarPerfil(r: Respuestas) {
  try {
    localStorage.setItem(PERFIL, JSON.stringify(Object.fromEntries(DATOS_RECORDADOS.filter((k) => r[k]).map((k) => [k, r[k]]))));
  } catch {}
}

export function borrarPerfil() {
  try {
    localStorage.removeItem(PERFIL);
  } catch {}
}

const COPIA_DEL_PREDIO: Record<string, string> = { n_calle: "calle", n_ext: "ext", n_int: "int", n_asent: "asent", n_cp: "cp" };

/** Lo que va escrito en cada casilla: la notificación repite el predio salvo que la persona indique otro domicilio. */
export function valorDe(id: string, r: Respuestas): string {
  if (!esOtroDomicilio(r)) {
    if (id === "n_municipio") return "Hermosillo";
    if (COPIA_DEL_PREDIO[id]) return r[COPIA_DEL_PREDIO[id]] ?? "";
  }
  return r[id] ?? "";
}

const VALIDACIONES: Partial<Record<TipoDato, [RegExp, string]>> = {
  numero: [/^\d+([.,]\d+)?$/, "Escribe solo el número."],
  tel: [/^\d{10}$/, "Debe tener 10 dígitos."],
  cp: [/^\d{5}$/, "Debe tener 5 dígitos."],
  correo: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Revisa el correo: falta algo."],
  rfc: [/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/, "El RFC tiene 12 o 13 caracteres, como GOMA800101AB1."],
  curp: [/^[A-Z]{4}\d{6}[HMX][A-Z]{5}[A-Z0-9]\d$/, "La CURP tiene 18 caracteres. Revísala."],
};

export function errorDe(p: Pregunta, valor = ""): string | null {
  const limpio = valor.trim();
  if (!limpio) return p.obligatoria ? (p.opciones ? "Elige una opción." : "Este dato hace falta.") : null;
  const regla = p.tipo && VALIDACIONES[p.tipo];
  return regla && !regla[0].test(limpio) ? regla[1] : null;
}

export const preguntasVisibles = (paso: Paso, r: Respuestas) => paso.preguntas.filter((p) => !p.visibleSi || p.visibleSi(r));
