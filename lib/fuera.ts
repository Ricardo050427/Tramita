import { normalizar } from "./buscar";

// Trámites que la gente busca seguido pero no hace el Ayuntamiento: se contestan sin IA y sin fichas ajenas.
type Externo = { re: RegExp; nombre: string; quien: string; sitio: string; url: string; plural?: boolean };

const EXTERNOS: Externo[] = [
  { re: /licencias? (de )?(manejo|conducir|chofer|automovilista|motociclista)/, nombre: "La licencia de manejo", quien: "el Gobierno del Estado de Sonora", sitio: "Gobierno del Estado de Sonora", url: "https://www.sonora.gob.mx" },
  { re: /\bplacas\b|tarjeta de circulacion|revalidacion vehicular|alta (de|del) (vehiculo|carro|auto)/, nombre: "Las placas y la tarjeta de circulación", plural: true, quien: "el Gobierno del Estado de Sonora", sitio: "Gobierno del Estado de Sonora", url: "https://www.sonora.gob.mx" },
  { re: /acta de (nacimiento|matrimonio|defuncion|divorcio)/, nombre: "Las actas del Registro Civil", plural: true, quien: "el Registro Civil del Estado de Sonora", sitio: "Copias certificadas en gob.mx", url: "https://www.gob.mx/ActaNacimiento" },
  { re: /\bcurp\b/, nombre: "La CURP", quien: "el Registro Nacional de Población (RENAPO)", sitio: "Consulta de CURP en gob.mx", url: "https://www.gob.mx/curp" },
  { re: /\bine\b|credencial (de|para) (elector|votar)/, nombre: "La credencial para votar", quien: "el Instituto Nacional Electoral (INE)", sitio: "Instituto Nacional Electoral", url: "https://www.ine.mx" },
  { re: /pasaporte/, nombre: "El pasaporte", quien: "la Secretaría de Relaciones Exteriores", sitio: "Secretaría de Relaciones Exteriores", url: "https://www.gob.mx/sre" },
  { re: /\brfc\b|constancia de situacion fiscal|\be\.?firma\b/, nombre: "El RFC y la constancia de situación fiscal", plural: true, quien: "el SAT", sitio: "Servicio de Administración Tributaria", url: "https://www.sat.gob.mx" },
  { re: /numero de seguridad social|\bnss\b/, nombre: "El número de seguridad social", quien: "el IMSS", sitio: "Instituto Mexicano del Seguro Social", url: "https://www.imss.gob.mx" },
];

// Si la pregunta menciona un trámite municipal, el documento externo es solo un requisito de ese trámite.
const ASUNTO_MUNICIPAL = /predial|recibo de agua|agua de hermosillo|licencia de (funcionamiento|construccion|uso de suelo|anuncio)|no adeudo|numero oficial|permiso|ayuntamiento|municipal/;
const QUIERE_OBTENERLO = /sac|tramit|obten|renov|repon|perd|pid|solicit|hago|hacer|necesito|ocupo|quiero|donde|como|cita|requisito|cuanto|cuesta/;

export function fueraDelMunicipio(pregunta: string) {
  const texto = normalizar(pregunta);
  if (ASUNTO_MUNICIPAL.test(texto)) return null;
  const externo = EXTERNOS.find((e) => e.re.test(texto));
  if (!externo) return null;
  if (!QUIERE_OBTENERLO.test(texto) && texto.split(/\s+/).length > 6) return null;
  return externo;
}

/** Frases con las que la respuesta reconoce que el trámite no está en el catálogo municipal. */
export const NO_ESTA_EN_CATALOGO =
  /no (aparece|esta|se encuentra|existe|figura|viene)[^.]{0,40}catalogo|no (lo )?(encontre|hay)[^.]{0,30}catalogo|no (es|corresponde a) un tramite (municipal|del ayuntamiento)/;
