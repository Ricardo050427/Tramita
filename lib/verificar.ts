// Comprueba que toda cifra escrita por la IA exista en las fichas que recibió.
const NUMEROS = /\d+(?:[.,:]\d+)*/g;
const soloDigitos = (t: string) => t.replace(/\D/g, "");

export function crearVerificador(fuentes: string) {
  const tokens = new Set((fuentes.match(NUMEROS) ?? []).map(soloDigitos));
  const bloque = [...tokens].join(" ");
  const ceros = (t: string) => t.replace(/^0+(?=\d)/, "");
  const normalizados = new Set([...tokens].map(ceros));

  return function cifrasRespaldadas(linea: string) {
    return (linea.match(NUMEROS) ?? []).every((crudo) => {
      const token = soloDigitos(crudo);
      if (tokens.has(token) || normalizados.has(ceros(token))) return true;
      return token.length >= 3 && bloque.includes(token); // teléfonos escritos con otros espacios
    });
  };
}
