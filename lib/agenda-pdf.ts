import { PDFDocument, StandardFonts } from "pdf-lib";
import { Hoja, MARGEN, SUAVE, escribible } from "./escrito-denuncia";
import { FECHA_CATALOGO, LEY, SITIO, fechaLegible } from "./ley";
import { INFORMATIVO, type FichaSimple } from "./simplificacion";

// Propuesta ciudadana de Agenda de Simplificación y Digitalización (art. 21 de la Ley Nacional para Eliminar Trámites Burocráticos).
export type DatosAgenda = { fichas: FichaSimple[]; votos: Map<string, number>; cumplenArt54: number };

const n = (x: number) => x.toLocaleString("es-MX");

export function accionesDe(f: FichaSimple) {
  return [
    ...(INFORMATIVO.test(f.nombre) && f.exigidoPor
      ? [`Dejar de exigirlo en los ${f.exigidoPor} trámites que lo piden: el Ayuntamiento consulta sus propios registros (art. 19, fr. I).`]
      : []),
    ...(f.copias ? [`Dejar de pedir ${f.copias} ${f.copias === 1 ? "copia simple" : "copias simples"} (art. 19, fr. IV).`] : []),
    ...(f.municipales ? [`Consultar internamente ${f.municipales === 1 ? "el documento" : `los ${f.municipales} documentos`} que emite el propio Ayuntamiento (art. 19, fr. I).`] : []),
    ...(f.formatoSinPublicar ? ["Publicar el formato de solicitud (art. 19, fr. XV)."] : []),
    ...(f.sinPlazo ? ["Registrar el plazo de respuesta (art. 54, fr. IX)."] : []),
    ...(f.presencial ? ["Permitir iniciarlo en línea (art. 51)."] : []),
  ];
}

export function totalesAgenda(fichas: FichaSimple[]) {
  const constancia = fichas.find((f) => f.clave === "HMO-00033");
  return {
    tramites: fichas.length,
    requisitos: fichas.reduce((s, f) => s + f.requisitos, 0),
    copias: fichas.reduce((s, f) => s + f.copias, 0),
    conCopias: fichas.filter((f) => f.copias).length,
    municipales: fichas.reduce((s, f) => s + f.municipales, 0),
    conMunicipales: fichas.filter((f) => f.municipales).length,
    formatos: fichas.filter((f) => f.formatoSinPublicar).length,
    presenciales: fichas.filter((f) => f.presencial).length,
    sinPlazo: fichas.filter((f) => f.sinPlazo).length,
    constanciaExigida: constancia?.exigidoPor ?? 0,
  };
}

export async function generarAgenda({ fichas, votos, cumplenArt54 }: DatosAgenda) {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Propuesta ciudadana de Agenda de Simplificación y Digitalización de Hermosillo");
  pdf.setLanguage("es-MX");
  pdf.setCreator("Tramita");
  const h = new Hoja(pdf, await pdf.embedFont(StandardFonts.Helvetica), await pdf.embedFont(StandardFonts.HelveticaBold));
  const t = totalesAgenda(fichas);
  const prioritarios = [...fichas].sort((a, b) => b.puntos - a.puntos).slice(0, 15);
  const votados = [...votos].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const totalVotos = [...votos.values()].reduce((s, x) => s + x, 0);
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Hermosillo" });

  h.texto("Propuesta ciudadana de Agenda de Simplificación y Digitalización", { negrita: true, tam: 16, despues: 4 });
  h.texto("Municipio de Hermosillo, Sonora · Primer semestre de 2027", { negrita: true, despues: 8 });
  h.texto(
    `Elaborada el ${fechaLegible(hoy)} por Tramita, herramienta ciudadana independiente, con los datos públicos del Catálogo Municipal de Trámites y Servicios consultado el ${fechaLegible(FECHA_CATALOGO)}. Es una propuesta: la Agenda oficial la presenta el Enlace de Simplificación a la Autoridad Local.`,
    { color: SUAVE, despues: 6 },
  );
  h.regla();

  h.titulo("1. Fundamento");
  for (const p of [
    `${LEY}, artículo 3, fracción II: la Agenda de Simplificación y Digitalización es la «herramienta de planeación semestral que tiene por objeto fijar las metas de simplificación y digitalización».`,
    "Artículo 21: se notifica a la Autoridad Local «en los primeros quince días de los meses de enero y julio de cada año» y prioriza los trámites con mayor frecuencia de solicitud, los dirigidos a grupos en situación de vulnerabilidad, los de mayores costos burocráticos y los que se realizan de manera presencial.",
    "Artículo 22: la Agenda se somete a consulta pública «durante al menos veinte días».",
    "Artículo 19: obliga, entre otras medidas, a no solicitar documentos que los mismos Sujetos Obligados expidan (fr. I), a no solicitar copias simples (fr. IV) y a implementar formatos únicos de solicitud (fr. XV).",
  ])
    h.texto(p, { despues: 6 });

  h.titulo("2. Diagnóstico del catálogo municipal");
  for (const p of [
    `El catálogo publica ${n(t.tramites)} trámites con ${n(t.requisitos)} requisitos en total. ${n(cumplenArt54)} publican los 8 datos del artículo 54 que se pueden comprobar.`,
    `${n(t.conCopias)} trámites piden ${n(t.copias)} copias simples.`,
    `${n(t.conMunicipales)} trámites piden ${n(t.municipales)} documentos que emite el propio Ayuntamiento. La constancia de no adeudo municipal la exigen ${n(t.constanciaExigida)} trámites.`,
    `${n(t.formatos)} trámites piden llenar un formato que no está publicado; ${n(t.sinPlazo)} no publican su plazo de respuesta y ${n(t.presenciales)} solo pueden iniciarse en persona.`,
  ])
    h.texto(`• ${p}`, { sangria: 6, despues: 4 });

  h.titulo("3. Acciones generales propuestas");
  for (const p of [
    `A1. Dejar de pedir copias simples en todo el catálogo: ${n(t.copias)} copias menos en ${n(t.conCopias)} trámites (art. 19, fr. IV).`,
    `A2. Consultar internamente los documentos que emite el propio Ayuntamiento: ${n(t.municipales)} requisitos menos en ${n(t.conMunicipales)} trámites, empezando por la constancia de no adeudo (art. 19, fr. I).`,
    `A3. Publicar un formato único de solicitud en los ${n(t.formatos)} trámites que hoy no lo tienen (art. 19, fr. XV).`,
    `A4. Registrar el plazo de respuesta en los ${n(t.sinPlazo)} trámites que no lo publican (art. 54, fr. IX).`,
  ])
    h.texto(p, { despues: 6 });

  h.titulo("4. Trámites prioritarios con los criterios del artículo 21");
  h.tabla(
    ["Trámite", "Por qué y qué hacer"],
    prioritarios.map((f, i) => [`${i + 1}. ${f.nombre} (${f.clave}), ${f.dependencia}`, `${f.razones.join("; ")}. ${accionesDe(f).join(" ")}`]),
  );

  h.titulo("5. Consulta ciudadana (artículo 22)");
  h.texto(
    totalVotos
      ? `Desde el 11 de noviembre de 2026 la ciudadanía vota en ${SITIO.replace("https://", "")}/simplifica qué trámite simplificar primero. Votos registrados: ${n(totalVotos)}.`
      : `La consulta está abierta en ${SITIO.replace("https://", "")}/simplifica desde el 11 de noviembre de 2026. Todavía no hay votos registrados.`,
    { despues: 6 },
  );
  for (const [clave, cuantos] of votados) {
    const f = fichas.find((x) => x.clave === clave);
    if (f) h.texto(`• ${f.nombre}: ${n(cuantos)} ${cuantos === 1 ? "voto" : "votos"}.`, { sangria: 6, despues: 2 });
  }

  h.titulo("6. Calendario propuesto");
  for (const p of [
    "1 al 15 de enero de 2027: el Enlace de Simplificación notifica la Agenda a la Autoridad Local (art. 21).",
    "Enero y febrero de 2027: consulta pública de al menos 20 días (art. 22).",
    "Primer semestre de 2027: ejecución de las acciones A1 a A4 y de los trámites prioritarios.",
    "1 al 15 de julio de 2027: informe de avance y segunda Agenda; lo no cumplido pasa al semestre siguiente con prioridad (art. 22).",
  ])
    h.texto(`• ${p}`, { sangria: 6, despues: 4 });

  h.titulo("7. Cómo se calculó");
  h.texto(
    "Cada cifra sale de las fichas publicadas: requisitos que piden copia, requisitos cuyo documento emite el propio Ayuntamiento, formatos citados como requisito sin archivo público, plazo publicado y modalidad. La prioridad suma esos costos burocráticos, cuántos trámites exigen al trámite como requisito (frecuencia), si atiende a grupos vulnerables y si es solo presencial. El cálculo es abierto: github.com/Ricardo050427/Tramita.",
    { despues: 6 },
  );

  const paginas = pdf.getPages();
  paginas.forEach((p, i) =>
    p.drawText(escribible(`Propuesta ciudadana elaborada con Tramita (${SITIO.replace("https://", "")}). No es un documento oficial. Página ${i + 1} de ${paginas.length}.`), {
      x: MARGEN,
      y: MARGEN - 24,
      size: 8,
      font: h.normal,
      color: SUAVE,
    }),
  );
  return pdf.save();
}
