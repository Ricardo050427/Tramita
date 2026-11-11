// Examen de Sagui: 50 preguntas como las haría la gente, con el trámite correcto de cada una.
// Mide si el chat elige ese trámite y cuánto tarda. Guarda el resultado en data/examen.json.
// Uso: BASE=https://tramita-blond.vercel.app node scripts/examen.mjs
import { writeFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const PAUSA_MS = Number(process.env.PAUSA_MS ?? 8000); // respeta el límite del plan gratuito de Gemini
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// "fuera": no es un trámite del Ayuntamiento y no debe mostrar fichas ajenas.
const PREGUNTAS = [
  ["¿Cómo pago el predial?", ["HMO-00494"]],
  ["Quiero un descuento en el predial porque soy jubilado", ["HMO-00479"]],
  ["Debo varios años de predial, ¿puedo pagar en partes?", ["HMO-00318"]],
  ["Necesito la constancia de no adeudo municipal", ["HMO-00033"]],
  ["¿Cuánto cuesta el certificado de no adeudo del predial?", ["HMO-00035"]],
  ["Se fundió la lámpara de mi calle", ["HMO-00443"]],
  ["Me llegó muy caro el recibo del agua", ["HMO-00446", "HMO-00034", "HMO-00052"]],
  ["Quiero la tarifa social del agua", ["HMO-00061"]],
  ["¿Cómo contrato el agua para mi casa nueva?", ["HMO-00059"]],
  ["Quiero poner el recibo del agua a mi nombre", ["HMO-00058"]],
  ["No puedo pagar el agua, ¿me dan un convenio?", ["HMO-00060"]],
  ["Quiero abrir una taquería", ["HMO-00420"]],
  ["¿Cuánto cuesta la licencia de funcionamiento?", ["HMO-00420"]],
  ["Necesito renovar la licencia de mi negocio", ["HMO-00535"]],
  ["Quiero vender cerveza en mi tienda", ["HMO-00195"]],
  ["Quiero poner un letrero pintado en mi local", ["HMO-00495", "HMO-00230"]],
  ["Quiero vender elotes en la calle", ["HMO-00522", "HMO-00518"]],
  ["Quiero ampliar mi casa, hacer un cuarto", ["HMO-00186"]],
  ["Voy a levantar una barda de 2 metros", ["HMO-00220", "HMO-00533"]],
  ["Necesito el número oficial de mi terreno", ["HMO-00211"]],
  ["Ya terminé de construir, ¿qué trámite sigue?", ["HMO-00214"]],
  ["Quiero tumbar una casa vieja", ["HMO-00204"]],
  ["Hay un árbol en mi banqueta que quiero quitar", ["HMO-00525"]],
  ["Construí sin permiso un cuarto chico, ¿cómo lo regularizo?", ["HMO-00210", "HMO-00180"]],
  ["Quiero saber qué uso de suelo tiene un terreno", ["HMO-00529", "HMO-00227"]],
  ["Voy a comprar una casa, ¿cómo hago el traslado de dominio?", ["HMO-00512"]],
  ["Necesito el valor catastral de mi casa", ["HMO-00006", "HMO-00511"]],
  ["Quiero dividir mi terreno en dos", ["HMO-00484", "HMO-00358"]],
  ["Se llevaron mi carro al corralón", ["HMO-00286"]],
  ["Choqué y tránsito se llevó mi carro, ¿cómo hago convenio?", ["HMO-00267", "HMO-00286"]],
  ["Perdí las placas de mi carro", ["HMO-00128"], "o fuera"],
  ["Quiero vacunar a mi perro contra la rabia", ["HMO-00412"]],
  ["¿Dónde esterilizan gatos?", ["HMO-00413"]],
  ["Necesito el tarjetón de discapacidad para estacionarme", ["HMO-00464"]],
  ["Mi mamá necesita una silla de ruedas", ["HMO-00026"]],
  ["Busco guardería para mi hijo", ["HMO-00403", "HMO-00271"]],
  ["Mi hijo necesita una beca", ["HMO-00136"]],
  ["Quiero denunciar a un funcionario que me pidió dinero", ["HMO-00025", "HMO-00493"]],
  ["Un policía me trató mal, ¿dónde me quejo?", ["HMO-00232"]],
  ["Quiero pedir información pública del Ayuntamiento", ["HMO-00167"]],
  ["Se murió un familiar y no tenemos para el funeral", ["HMO-00275"]],
  ["Se me inundó la casa con la lluvia, ¿hay apoyo?", ["HMO-00276"]],
  ["Quiero hacer una fiesta en la calle de mi colonia", ["HMO-00519"]],
  ["Quiero rentar una cancha para un torneo", ["HMO-00481"]],
  ["Quiero ser proveedor del Ayuntamiento", ["HMO-00283"]],
  ["Necesito copia certificada de mi recibo de predial", ["HMO-00039"]],
  ["¿Cómo veo cuánto le debo al municipio?", ["HMO-00007"]],
  ["¿Cómo saco mi licencia de manejo?", ["HMO-00137"], "o fuera"],
  ["Quiero sacar mi pasaporte", [], "fuera"],
  ["Quiero registrar a mi perro", [], "fuera"],
];

async function preguntar(pregunta) {
  const inicio = Date.now();
  const res = await fetch(`${BASE}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pregunta }) });
  if (!res.ok || !res.body) return { error: `HTTP ${res.status}`, ms: Date.now() - inicio, claves: [], primeraMs: null };
  const lector = res.body.getReader();
  const decodificador = new TextDecoder();
  let resto = "";
  let claves = [];
  let primeraMs = null;
  let aviso = false;
  let resumen = "";
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    resto += decodificador.decode(value, { stream: true });
    const lineas = resto.split("\n");
    resto = lineas.pop();
    for (const l of lineas.filter(Boolean)) {
      const e = JSON.parse(l);
      if (e.t === "fichas" && !claves.length) claves = e.items.map((t) => t.clave);
      if ((e.t === "bloque" || e.t === "texto") && primeraMs === null) primeraMs = Date.now() - inicio;
      if (e.t === "bloque" && e.bloque.tipo === "resumen" && !resumen) resumen = e.bloque.d;
      if (e.t === "aviso") aviso = true;
    }
  }
  return { claves, ms: Date.now() - inicio, primeraMs, aviso, resumen: resumen.slice(0, 160) };
}

const resultados = [];
for (const [i, [pregunta, esperadas, modo]] of PREGUNTAS.entries()) {
  const r = await preguntar(pregunta).catch((e) => ({ error: e.message, claves: [], ms: 0, primeraMs: null }));
  const fuera = modo === "fuera" || (modo === "o fuera" && !r.claves.length);
  const primero = fuera ? !r.claves.length : esperadas.includes(r.claves[0]);
  const enLista = fuera ? !r.claves.length : r.claves.some((c) => esperadas.includes(c));
  resultados.push({ pregunta, esperadas, obtenidas: r.claves, primero, enLista, ms: r.ms, primeraMs: r.primeraMs, aviso: Boolean(r.aviso), error: r.error });
  console.log(`${String(i + 1).padStart(2)}. ${primero ? "✔" : enLista ? "~" : "✘"} ${(r.ms / 1000).toFixed(1)}s ${pregunta} → ${r.claves.join(",") || "(sin fichas)"}`);
  await espera(PAUSA_MS);
}

const tiempos = resultados.map((r) => r.primeraMs ?? r.ms).sort((a, b) => a - b);
const cuantil = (q) => tiempos[Math.min(tiempos.length - 1, Math.floor(q * tiempos.length))];
const examen = {
  fecha: new Date().toISOString(),
  base: BASE,
  total: resultados.length,
  primero: resultados.filter((r) => r.primero).length,
  enLista: resultados.filter((r) => r.enLista).length,
  medianaMs: cuantil(0.5),
  p90Ms: cuantil(0.9),
  avisos: resultados.filter((r) => r.aviso).length,
  resultados,
};
writeFileSync("data/examen.json", JSON.stringify(examen, null, 1) + "\n");
console.log(`\nPrimer trámite correcto: ${examen.primero}/${examen.total}. Entre los mostrados: ${examen.enLista}/${examen.total}. Mediana ${(examen.medianaMs / 1000).toFixed(1)} s, p90 ${(examen.p90Ms / 1000).toFixed(1)} s.`);
