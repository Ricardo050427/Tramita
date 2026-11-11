import { normalizar } from "./buscar";
import { FUNDAMENTOS } from "./ley";
import { esDelMunicipio, nombreRequisito, pideCopia } from "./observatorio";
import { estimarCosto } from "./plan";
import type { Tramite } from "./tipos";
import type { Elemento, Hallazgo, ResultadoVerificacion, TipoElemento } from "./veredictos";

const pesos = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const INFORMAL = /propina|agiliz|gestor|sin recibo|mordida|cooperacion|refresco|para el cafe|apoyo voluntario|por fuera|en efectivo a/;
const FORMATO = /formato|formulario|solicitud|hoja/;

const NUMEROS: Record<string, number> = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, diez: 10, quince: 15, veinte: 20, treinta: 30 };

function diasDe(texto: string): number | null {
  const m = /(\d+|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|diez|quince|veinte|treinta)\s*(dias?|semanas?|mes(?:es)?|anos?)\b/.exec(normalizar(texto));
  if (!m) return null;
  const n = NUMEROS[m[1]] ?? Number(m[1]);
  return m[2].startsWith("sem") ? n * 7 : m[2].startsWith("mes") ? n * 30 : m[2].startsWith("ano") ? n * 365 : n;
}

function evaluarPago(t: Tramite, e: Elemento): Hallazgo {
  const dicho = normalizar(e.dicho);
  if (e.informal || INFORMAL.test(dicho)) {
    return {
      dicho: e.dicho,
      veredicto: "cobro",
      detalle: "Ningún pago se le da en mano a una persona. Los derechos se pagan en caja o en línea, siempre con recibo oficial. La orientación y la recepción de tu trámite son gratuitas.",
      fundamentos: [FUNDAMENTOS.gratuidad, FUNDAMENTOS.monto],
      reporte: "dinero",
    };
  }
  if (FORMATO.test(dicho) && t.documentos?.some((d) => d.tipo === "solicitud")) {
    return {
      dicho: e.dicho,
      veredicto: "cobro",
      detalle: "El formato oficial de este trámite es público: lo descargas gratis desde su ficha en Tramita. La ficha no publica un cobro por el formato.",
      fundamentos: [FUNDAMENTOS.monto, FUNDAMENTOS.ningunaCondicion],
    };
  }
  const rango = estimarCosto(t);
  const publicado = rango ? (rango.min === rango.max ? pesos(rango.max) : `de ${pesos(rango.min)} a ${pesos(rango.max)}`) : "";
  if (rango && rango.max === 0) {
    return {
      dicho: e.dicho,
      veredicto: "cobro",
      detalle: `La ficha oficial dice que este trámite no tiene costo${e.monto ? `, y te pidieron ${pesos(e.monto)}` : ""}. Si el cobro es por otro trámite, pide que te digan cuál y que te den su orden de pago.`,
      fundamentos: [FUNDAMENTOS.monto, FUNDAMENTOS.ningunaCondicion],
    };
  }
  if (rango && e.monto) {
    if (e.monto > rango.max * 1.05 + 5) {
      return {
        dicho: e.dicho,
        veredicto: "cobro",
        detalle: `Te pidieron ${pesos(e.monto)} y la ficha publica ${publicado}. Pide el desglose por escrito y paga solo con recibo oficial.`,
        fundamentos: [FUNDAMENTOS.monto, FUNDAMENTOS.ningunaCondicion],
      };
    }
    return { dicho: e.dicho, veredicto: "oficial", detalle: `Coincide con el costo publicado: ${publicado}. Pide tu recibo oficial.`, fundamentos: [FUNDAMENTOS.monto] };
  }
  return {
    dicho: e.dicho,
    veredicto: "revisar",
    detalle: rango
      ? `La ficha publica ${publicado}. Si te cobran más, pide el desglose y tu recibo oficial.`
      : `El costo depende de tu caso: «${t.costo.replace(/\s+/g, " ").slice(0, 160)}». Pide tu orden de pago oficial y paga solo con recibo.`,
    fundamentos: [FUNDAMENTOS.monto],
  };
}

function evaluarTiempo(t: Tramite, e: Elemento): Hallazgo {
  const plazo = t.plazo.replace(/\s+/g, " ").trim();
  if (!plazo || /^indefinido/i.test(plazo)) {
    return {
      dicho: e.dicho,
      veredicto: "revisar",
      detalle: "La ficha no publica un plazo de respuesta para este trámite, aunque la ley pide registrarlo. Pide que te den una fecha por escrito.",
      fundamentos: [FUNDAMENTOS.plazo],
    };
  }
  const corto = plazo.split(/\s(?=el plazo|a partir|articulo|artículo)/i)[0];
  const dicho = diasDe(e.dicho);
  const oficial = diasDe(plazo);
  // Los plazos oficiales suelen ser hábiles: se comparan con margen para no acusar de más.
  if (dicho && oficial && dicho > Math.ceil(oficial * 1.45) + 2) {
    return {
      dicho: e.dicho,
      veredicto: "plazo",
      detalle: `La ficha oficial publica un plazo de respuesta de ${corto}. Pregunta por qué tardaría más y pide la fecha por escrito.`,
      fundamentos: [FUNDAMENTOS.plazo],
    };
  }
  if (!dicho) {
    return { dicho: e.dicho, veredicto: "revisar", detalle: `La ficha oficial publica un plazo de respuesta de ${corto}. Pide que te den la fecha por escrito.`, fundamentos: [FUNDAMENTOS.plazo] };
  }
  return { dicho: e.dicho, veredicto: "oficial", detalle: `Va de acuerdo con el plazo de respuesta publicado: ${corto}.`, fundamentos: [FUNDAMENTOS.plazo] };
}

function evaluarDocumento(t: Tramite, e: Elemento): Hallazgo {
  if (!t.requisitos.length) {
    return {
      dicho: e.dicho,
      veredicto: "revisar",
      detalle: "Este trámite no publica requisitos en el catálogo, así que no se puede comparar. Pide la lista oficial por escrito.",
      fundamentos: [FUNDAMENTOS.requisitos],
    };
  }
  const r = t.requisitos[e.requisito];
  if (!r) {
    return {
      dicho: e.dicho,
      veredicto: "no_publicado",
      detalle: `No aparece entre los ${t.requisitos.length} requisitos publicados para este trámite. Pregunta con respeto en qué norma se basa y pide que te lo indiquen por escrito.`,
      fundamentos: [FUNDAMENTOS.soloPublicados, FUNDAMENTOS.ningunaCondicion],
    };
  }
  const dicho = normalizar(e.dicho);
  if ((e.copia || /\bcopia/.test(dicho)) && !/certificad/.test(dicho) && (pideCopia(r) || e.copia)) {
    return {
      dicho: e.dicho,
      veredicto: "simplificar",
      requisito: r.titulo,
      detalle: `Aparece en la ficha como «${nombreRequisito(r)}». Pero la ley pide dejar de solicitar copias simples: pregunta si aceptan el original para cotejo o la versión digital.`,
      fundamentos: [FUNDAMENTOS.copias, FUNDAMENTOS.digitales],
    };
  }
  if (esDelMunicipio(r)) {
    return {
      dicho: e.dicho,
      veredicto: "simplificar",
      requisito: r.titulo,
      detalle: `Aparece en la ficha como «${nombreRequisito(r)}». Lo expide el mismo Ayuntamiento, y la ley pide no solicitar documentos que la propia autoridad emite. Por ahora llévalo: la ficha todavía lo pide.`,
      fundamentos: [FUNDAMENTOS.propios],
    };
  }
  return { dicho: e.dicho, veredicto: "oficial", requisito: r.titulo, detalle: `Es el requisito «${nombreRequisito(r)}» de la ficha oficial.`, fundamentos: [] };
}

export function evaluar(t: Tramite, elementos: Elemento[], porIA: boolean): ResultadoVerificacion {
  const REPORTE = { no_publicado: "requisito", cobro: "cobro", plazo: "plazo" } as const;
  const hallazgos = elementos
    .map((e) => (e.tipo === "pago" ? evaluarPago(t, e) : e.tipo === "tiempo" ? evaluarTiempo(t, e) : evaluarDocumento(t, e)))
    .map((h) => (h.reporte || !(h.veredicto in REPORTE) ? h : { ...h, reporte: REPORTE[h.veredicto as keyof typeof REPORTE] }));
  const usados = new Set(elementos.filter((e) => e.tipo !== "pago" && e.tipo !== "tiempo").map((e) => e.requisito));
  return { hallazgos, faltantes: t.requisitos.filter((_, i) => !usados.has(i)).map(nombreRequisito), porIA };
}

// Sin IA: separa lo que escribió y busca cada parte entre los requisitos por palabras en común.
const EQUIVALENCIAS: Record<string, string> = {
  ine: "identificacion",
  credencial: "identificacion",
  elector: "identificacion",
  pasaporte: "identificacion",
  luz: "domicilio",
  cfe: "domicilio",
  recibo: "comprobante",
  rfc: "fiscal",
  acta: "acta",
  escrituras: "propiedad",
  escritura: "propiedad",
  foto: "fotografia",
  fotos: "fotografia",
};
// Palabras que aparecen en muchos requisitos: solas no bastan para decir que es el mismo documento.
const GENERICAS = new Set(["constancia", "carta", "documento", "oficio", "formato", "solicitud", "licencia", "comprobante", "certificado", "acta"]);
const VACIAS = new Set("con del las los por una unos para que copia copias original simple pidieron piden pide piden".split(" "));
const palabras = (t: string) =>
  normalizar(t)
    .split(" ")
    .filter((p) => p.length > 2 && !VACIAS.has(p))
    .map((p) => EQUIVALENCIAS[p] ?? p.replace(/(es|s)$/, ""));

export function separarSinIA(t: Tramite, texto: string, cobro?: number): Elemento[] {
  const partes = texto
    .split(/\n|;|,|\.\s|\s+y\s+|\s+tambien\s+/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 2)
    .slice(0, 12);
  const requisitos = t.requisitos.map((r) => ({ titulo: new Set(palabras(r.titulo)), detalle: new Set(palabras(r.detalle ?? "")) }));
  const elementos = partes.map((p): Elemento => {
    const n = normalizar(p);
    const monto = Number(/\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(?:pesos|\$|mxn)?/.exec(p)?.[1]?.replace(/,/g, "")) || 0;
    const tipo: TipoElemento = /cobr|pag|\$|pesos|cuota|propina|dinero/.test(n) ? "pago" : /\bdias?\b|semanas?|mes(es)?\b|regres|vuelva|volver/.test(n) ? "tiempo" : "documento";
    let mejor = -1;
    let puntos = 0;
    const propias = palabras(p);
    requisitos.forEach((r, i) => {
      // Coincidir con el título pesa más que coincidir con la descripción.
      // Si el título es solo "Constancia" o "Formato", su descripción hace de título.
      const tituloGenerico = r.titulo.size === 1 && [...r.titulo].every((x) => GENERICAS.has(x));
      const comunes = propias.reduce((s, x) => s + (r.titulo.has(x) ? (GENERICAS.has(x) ? 1 : 2) : r.detalle.has(x) && (tituloGenerico || !GENERICAS.has(x)) ? 1 : 0), 0);
      if (comunes > puntos) [mejor, puntos] = [i, comunes];
    });
    return { dicho: p.slice(0, 120), tipo, requisito: puntos >= 2 ? mejor : -1, copia: /\bcopia/.test(n) && !/certificad/.test(n), monto, informal: INFORMAL.test(n) };
  });
  if (cobro && !elementos.some((e) => e.tipo === "pago")) {
    elementos.push({ dicho: `Me cobraron ${pesos(cobro)}`, tipo: "pago", requisito: -1, copia: false, monto: cobro, informal: false });
  }
  return elementos;
}
