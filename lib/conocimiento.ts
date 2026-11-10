import crudo from "../data/conocimiento.json";
import { normalizar, SINONIMOS } from "./buscar";

export type Fragmento = { fuente: string; tipo: string; url: string; cita: string; texto: string };

const fragmentos = crudo as Fragmento[];

const VACIAS = new Set(
  "a al algo ante asi como con cual cuando cuanto de del desde donde e el en entre es esa ese esta este fue ha hace hacer hay la las le lo los mas me mi mis muy ni no nos o para pero por porque puede puedo que quien se sea si sin sobre son su sus te tengo tiene tu un una uno y ya yo".split(" "),
);

// Reduce plurales para que "recargos" encuentre "recargo".
const raiz = (p: string) => (p.length > 4 ? p.replace(/(es|s)$/, "") : p);
const tokens = (t: string) => normalizar(t).split(" ").filter((p) => p.length > 1 && !VACIAS.has(p)).map(raiz);

// Índice BM25 en memoria: se arma una sola vez al iniciar la función.
const K1 = 1.4;
const B = 0.72;
const longitudes: number[] = [];
const invertido = new Map<string, [number, number][]>();

fragmentos.forEach((f, i) => {
  const lista = [...tokens(f.texto), ...tokens(f.fuente), ...tokens(f.fuente)]; // el nombre de la fuente pesa más
  longitudes[i] = lista.length;
  const frecuencias = new Map<string, number>();
  for (const t of lista) frecuencias.set(t, (frecuencias.get(t) ?? 0) + 1);
  for (const [t, n] of frecuencias) {
    const posting = invertido.get(t);
    if (posting) posting.push([i, n]);
    else invertido.set(t, [[i, n]]);
  }
});
const promedio = longitudes.reduce((s, n) => s + n, 0) / (longitudes.length || 1);

// Puntaje mínimo para no pasar fragmentos que solo coinciden en una palabra común.
const PUNTAJE_MINIMO = 6;

export function buscarConocimiento(consulta: string, limite = 5): Fragmento[] {
  const propios = [...new Set(tokens(consulta))];
  const sinonimos = propios.flatMap((p) => (SINONIMOS[p] ?? []).map(raiz)).filter((p) => !propios.includes(p));
  const puntajes = new Map<number, number>();
  const cubiertas = new Map<number, number>();

  const sumar = (termino: string, peso: number, propio = false) => {
    const posting = invertido.get(termino);
    if (!posting) return;
    const idf = Math.log(1 + (fragmentos.length - posting.length + 0.5) / (posting.length + 0.5));
    for (const [i, n] of posting) {
      const parcial = idf * ((n * (K1 + 1)) / (n + K1 * (1 - B + (B * longitudes[i]) / promedio)));
      puntajes.set(i, (puntajes.get(i) ?? 0) + parcial * peso);
      if (propio) cubiertas.set(i, (cubiertas.get(i) ?? 0) + 1);
    }
  };
  propios.forEach((p) => sumar(p, 1, true));
  sinonimos.forEach((p) => sumar(p, 0.5));
  const coberturaMinima = Math.min(2, propios.length);

  const porFuente = new Map<string, number>();
  const salida: Fragmento[] = [];
  for (const [i, puntaje] of [...puntajes].sort((a, b) => b[1] - a[1])) {
    if (puntaje < PUNTAJE_MINIMO || salida.length >= limite) break;
    if ((cubiertas.get(i) ?? 0) < coberturaMinima) continue;
    const f = fragmentos[i];
    const usados = porFuente.get(f.fuente) ?? 0;
    if (usados >= 3) continue; // evita que una sola ley llene el contexto
    porFuente.set(f.fuente, usados + 1);
    salida.push(f);
  }
  return salida;
}
