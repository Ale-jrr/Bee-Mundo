// RNG semeado (mulberry32). Determinismo é requisito: o mesmo save
// reproduz a mesma economia, o que torna o balanceamento depurável.

export function criarRng(semente = 1) {
  let a = semente >>> 0;
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    entre: (min, max) => min + next() * (max - min),
    inteiro: (min, max) => Math.floor(min + next() * (max - min + 1)),
    escolher: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    // Estado exportável para o save.
    get semente() { return a; },
    set semente(v) { a = v >>> 0; },
  };
}

// Avança o RNG guardado dentro do próprio estado. Mantém a aleatoriedade
// serializável: salvar o jogo salva a posição exata da sequência, então um
// save recarregado continua a mesma economia em vez de sortear de novo.
export function sortear(estado) {
  const a = (estado.rngEstado + 0x6D2B79F5) >>> 0;
  estado.rngEstado = a;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
