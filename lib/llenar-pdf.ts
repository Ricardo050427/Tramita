import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { valorDe, type Formato, type Respuestas } from "./llenado";

const TINTA = rgb(0.04, 0.04, 0.12);
const TAMANO = 10;
const TAMANO_MINIMO = 5.5;
const MARGEN = 3;

// La fuente estándar del PDF solo admite el alfabeto occidental; un emoji rompería el documento.
const escribible = (texto: string) =>
  texto
    .normalize("NFC")
    .replace(/[^\x20-\x7E -ÿ]/g, "")
    .trim();

const HOY = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Hermosillo", day: "2-digit", month: "2-digit", year: "numeric" });

/** Escribe las respuestas sobre la hoja 1 del formato oficial. Todo ocurre en el dispositivo. */
export async function rellenarPdf(original: ArrayBuffer | Uint8Array, formato: Formato, r: Respuestas) {
  const pdf = await PDFDocument.load(original, { ignoreEncryption: true });
  const [fuente, fuerte] = await Promise.all([pdf.embedFont(StandardFonts.Helvetica), pdf.embedFont(StandardFonts.HelveticaBold)]);
  const pagina = pdf.getPage(0);
  const { width, height } = pagina.getSize();
  const k = width / 1000;
  const recortados: string[] = [];

  for (const campo of formato.textos) {
    let texto = escribible(valorDe(campo.p, r));
    if (!texto) continue;
    const ancho = (campo.x1 - campo.x0) * k - MARGEN * 2;
    let size = TAMANO;
    while (size > TAMANO_MINIMO && fuente.widthOfTextAtSize(texto, size) > ancho) size -= 0.25;
    if (fuente.widthOfTextAtSize(texto, size) > ancho) {
      recortados.push(campo.p);
      while (texto && fuente.widthOfTextAtSize(texto, size) > ancho) texto = texto.slice(0, -1);
    }
    pagina.drawText(texto, { x: campo.x0 * k + MARGEN, y: height - campo.y * k + 4, size, font: fuente, color: TINTA });
  }

  for (const marca of formato.marcas) {
    if (r[marca.p] !== marca.valor) continue;
    const size = 9;
    pagina.drawText("X", { x: marca.x * k - fuerte.widthOfTextAtSize("X", size) / 2, y: height - marca.y * k - 3.2, size, font: fuerte, color: TINTA });
  }

  if (formato.fecha) {
    pagina.drawText(HOY.format(new Date()), { x: formato.fecha.x * k, y: height - formato.fecha.y * k + 3, size: TAMANO, font: fuente, color: TINTA });
  }

  return { bytes: await pdf.save(), recortados };
}
