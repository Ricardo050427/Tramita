import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { CITAS_DENUNCIA, FECHA_CATALOGO, SITIO, fechaLegible } from "./ley";
import type { Hallazgo } from "./veredictos";

// Arma, en el teléfono de la persona, el escrito que pide la Contraloría Municipal (ficha HMO-00025):
// los hechos, el contraste con la ficha oficial y las pruebas. Nada de esto sale del dispositivo.

export type DatosDenuncia = {
  tramite: { clave: string; nombre: string; dependencia: string; costo: string; plazo: string; requisitos: string[] };
  hallazgos: Hallazgo[];
  fecha: string;
  hora?: string;
  oficina: string;
  quien?: string;
  extra?: string;
  testigos?: string;
  nombre?: string;
  contacto?: string;
};

const TINTA = rgb(0.08, 0.07, 0.06);
export const SUAVE = rgb(0.31, 0.33, 0.36);
const LINEA = rgb(0.79, 0.8, 0.83);
const ANCHO = 612;
const ALTO = 792;
export const MARGEN = 64;
const TAM = 10.5;
const INTERLINEA = 15;
const ORDINALES = ["PRIMERO", "SEGUNDO", "TERCERO", "CUARTO", "QUINTO", "SEXTO", "SÉPTIMO", "OCTAVO"];

// La fuente estándar del PDF solo admite el alfabeto occidental.
export const escribible = (texto: string) =>
  texto
    .normalize("NFC")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E\xA0-\xFF«»–—…•]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const corto = (t: string, n: number) => {
  const limpio = t.replace(/\s+/g, " ").trim();
  return limpio.length > n ? `${limpio.slice(0, n - 1).replace(/\s+\S*$/, "")}…` : limpio;
};

/** Lo que se le pidió y por qué no corresponde con la ficha, dicho en lenguaje de escrito. */
export function hechoDe(h: Hallazgo, t: DatosDenuncia["tramite"]) {
  if (h.veredicto === "no_publicado") return `Se me solicitó «${h.dicho}», que no figura entre los ${t.requisitos.length} requisitos publicados en la ficha oficial del trámite.`;
  if (h.veredicto === "plazo") return `Se me indicó «${h.dicho}», plazo mayor al publicado en la ficha oficial: «${corto(t.plazo, 90)}».`;
  if (h.reporte === "dinero") return `Se me pidió «${h.dicho}», pago que no está previsto en la ficha oficial del trámite.`;
  return `Se me cobró o pidió «${h.dicho}», que no coincide con el costo publicado en la ficha oficial: «${corto(t.costo, 110)}».`;
}

/** Lo que dice la ficha oficial sobre ese punto, para el anexo. */
function publicadoDe(h: Hallazgo, t: DatosDenuncia["tramite"]) {
  if (h.veredicto === "no_publicado") return `No figura entre los ${t.requisitos.length} requisitos publicados (Anexo 2).`;
  if (h.veredicto === "plazo") return `Plazo de respuesta publicado: ${corto(t.plazo, 120)}.`;
  if (h.reporte === "dinero") return `La ficha no prevé ese pago. Costo publicado: ${corto(t.costo, 120)}.`;
  return `Costo publicado: ${corto(t.costo, 160)}.`;
}

function partir(texto: string, fuente: PDFFont, tam: number, ancho: number) {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of escribible(texto).split(" ")) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (fuente.widthOfTextAtSize(prueba, tam) <= ancho || !actual) actual = prueba;
    else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

export class Hoja {
  pagina!: PDFPage;
  y = 0;
  constructor(
    private pdf: PDFDocument,
    public normal: PDFFont,
    public negrita: PDFFont,
  ) {
    this.nueva();
  }
  nueva() {
    this.pagina = this.pdf.addPage([ANCHO, ALTO]);
    this.y = ALTO - MARGEN;
  }
  espacio(alto: number) {
    if (this.y - alto < MARGEN + 30) this.nueva();
  }
  texto(t: string, { negrita = false, tam = TAM, sangria = 0, color = TINTA, alinear = "izquierda" as "izquierda" | "derecha", despues = 6 } = {}) {
    const fuente = negrita ? this.negrita : this.normal;
    const ancho = ANCHO - MARGEN * 2 - sangria;
    for (const linea of partir(t, fuente, tam, ancho)) {
      this.espacio(INTERLINEA);
      const x = alinear === "derecha" ? ANCHO - MARGEN - fuente.widthOfTextAtSize(linea, tam) : MARGEN + sangria;
      this.pagina.drawText(linea, { x, y: this.y - tam, size: tam, font: fuente, color });
      this.y -= INTERLINEA * (tam / TAM);
    }
    this.y -= despues;
  }
  titulo(t: string) {
    this.espacio(INTERLINEA * 3);
    this.y -= 8;
    this.texto(t, { negrita: true, despues: 4 });
  }
  regla() {
    this.pagina.drawLine({ start: { x: MARGEN, y: this.y }, end: { x: ANCHO - MARGEN, y: this.y }, thickness: 0.6, color: LINEA });
    this.y -= 8;
  }
  /** Tabla de dos columnas con celdas que se parten en varias líneas. */
  tabla(encabezado: [string, string], filas: [string, string][]) {
    const ancho = ANCHO - MARGEN * 2;
    const columnas = [ancho * 0.42, ancho * 0.58 - 12];
    const fila = (celdas: [string, string], negrita: boolean) => {
      const fuente = negrita ? this.negrita : this.normal;
      const partes = celdas.map((c, i) => partir(c, fuente, 9.5, columnas[i]));
      const alto = Math.max(...partes.map((p) => p.length)) * 13 + 8;
      this.espacio(alto);
      partes.forEach((p, i) =>
        p.forEach((linea, j) =>
          this.pagina.drawText(linea, { x: MARGEN + (i ? columnas[0] + 12 : 0), y: this.y - 10 - j * 13, size: 9.5, font: fuente, color: TINTA }),
        ),
      );
      this.y -= alto;
      this.regla();
    };
    fila(encabezado, true);
    for (const f of filas) fila(f, false);
  }
}

export async function generarEscrito(d: DatosDenuncia): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Denuncia: ${escribible(d.tramite.nombre)}`);
  pdf.setLanguage("es-MX");
  pdf.setCreator("Tramita");
  const h = new Hoja(pdf, await pdf.embedFont(StandardFonts.Helvetica), await pdf.embedFont(StandardFonts.HelveticaBold));
  const dinero = d.hallazgos.some((x) => x.reporte === "dinero");

  h.texto(`Hermosillo, Sonora, a ${fechaLegible(new Date().toLocaleDateString("en-CA", { timeZone: "America/Hermosillo" }))}.`, { alinear: "derecha", despues: 18 });
  h.texto("C. Titular de la Coordinación Investigadora", { negrita: true, despues: 0 });
  h.texto("Contraloría Municipal de Hermosillo", { negrita: true, despues: 0 });
  h.texto("Presente.", { negrita: true, despues: 14 });

  h.texto(
    `${d.nombre ? escribible(d.nombre) : "Quien suscribe"}, por mi propio derecho${d.contacto ? `, señalando como medio para recibir notificaciones ${escribible(d.contacto)}` : ""}, presento denuncia por hechos que podrían constituir faltas administrativas de personas servidoras públicas municipales, con base en los siguientes:`,
  );

  h.titulo("HECHOS");
  const hechos = [
    `El día ${fechaLegible(d.fecha)}${d.hora ? `, aproximadamente a las ${d.hora} horas` : ""}, acudí a ${escribible(d.oficina)} para realizar el trámite «${d.tramite.nombre}» (clave ${d.tramite.clave}), a cargo de ${d.tramite.dependencia}.`,
    `En la atención de dicho trámite se me requirió lo siguiente, que no corresponde con lo publicado en la ficha oficial del Catálogo Municipal de Trámites y Servicios: ${d.hallazgos.map((x, i) => `${String.fromCharCode(97 + i)}) ${hechoDe(x, d.tramite)}`).join(" ")}`,
    ...(d.quien ? [`La persona que me atendió puede identificarse así: ${d.quien}.`] : []),
    ...(d.extra ? [d.extra] : []),
    ...(d.testigos ? [`Los hechos fueron presenciados por: ${d.testigos}.`] : []),
  ];
  hechos.forEach((t, i) => h.texto(`${ORDINALES[i]}. ${t}`, { despues: 8 }));

  h.titulo("PRUEBAS");
  const pruebas = [
    `Documental: ficha oficial del trámite ${d.tramite.clave} publicada en el Catálogo Municipal de Trámites y Servicios (tramites.hermosillo.gob.mx), consultada el ${fechaLegible(FECHA_CATALOGO)}, cuyo contenido se resume en el Anexo 2.`,
    "Comparación punto por punto entre lo que se me solicitó y lo que publica la ficha oficial (Anexo 1).",
    ...(d.testigos ? [`Testimonial: a cargo de ${d.testigos}.`] : []),
    "Constancia de sello de tiempo de este escrito (archivo .ots, protocolo abierto OpenTimestamps), que acredita que el documento existía en la fecha de su preparación y que no ha sido modificado.",
  ];
  pruebas.forEach((t, i) => h.texto(`${i + 1}. ${t}`, { despues: 6 }));

  h.titulo("FUNDAMENTO");
  for (const cita of [...CITAS_DENUNCIA.requisitos, ...(dinero ? CITAS_DENUNCIA.cohecho : []), ...CITAS_DENUNCIA.denuncia]) h.texto(cita, { despues: 6 });

  h.titulo("PETICIÓN");
  h.texto("ÚNICO. Se tenga por presentada esta denuncia, se investiguen los hechos narrados y se me informe del trámite que recaiga.");
  h.texto("Declaro bajo protesta de decir verdad que los hechos narrados son ciertos.", { despues: 40 });
  h.espacio(70);
  h.pagina.drawLine({ start: { x: MARGEN, y: h.y }, end: { x: MARGEN + 220, y: h.y }, thickness: 0.8, color: TINTA });
  h.y -= 6;
  h.texto(d.nombre ? escribible(d.nombre) : "Nombre y firma", { despues: 0 });

  h.nueva();
  h.texto("ANEXO 1. Lo que se solicitó frente a lo que publica la ficha oficial", { negrita: true, despues: 10 });
  h.tabla(
    ["Lo que se solicitó", "Lo que publica la ficha oficial"],
    d.hallazgos.map((x) => [x.dicho, publicadoDe(x, d.tramite)]),
  );

  h.titulo(`ANEXO 2. Ficha oficial del trámite ${d.tramite.clave}`);
  h.texto(`${d.tramite.nombre}. ${d.tramite.dependencia}.`, { despues: 6 });
  h.texto(`Costo publicado: ${corto(d.tramite.costo, 300)}`, { despues: 4 });
  h.texto(`Plazo de respuesta publicado: ${corto(d.tramite.plazo, 200)}`, { despues: 8 });
  h.texto(`Requisitos publicados (${d.tramite.requisitos.length}):`, { negrita: true, despues: 2 });
  d.tramite.requisitos.forEach((r, i) => h.texto(`${i + 1}. ${r}`, { sangria: 12, despues: 1 }));
  h.y -= 8;
  h.texto(`Fuente: Catálogo Municipal de Trámites y Servicios de Hermosillo, consultado el ${fechaLegible(FECHA_CATALOGO)}.`, { color: SUAVE, tam: 9 });

  const paginas = pdf.getPages();
  paginas.forEach((p, i) => {
    const pie = escribible(`Preparado con Tramita (${SITIO.replace("https://", "")}), herramienta ciudadana independiente. Página ${i + 1} de ${paginas.length}.`);
    p.drawText(pie, { x: MARGEN, y: MARGEN - 24, size: 8, font: h.normal, color: SUAVE });
  });
  return pdf.save();
}
