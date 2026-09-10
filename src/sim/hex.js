// Hexágonos pointy-top em coordenadas axiais (q, r).
// Vizinhos a leste/oeste ficam na mesma linha visual — foi assim que o favo
// de referência estava montado.

export const DIRECOES = [
  { q: +1, r:  0 }, // L
  { q: +1, r: -1 }, // NL
  { q:  0, r: -1 }, // NO
  { q: -1, r:  0 }, // O
  { q: -1, r: +1 }, // SO
  { q:  0, r: +1 }, // SL
];

export const chave = (q, r) => `${q},${r}`;

export function daChave(k) {
  const [q, r] = k.split(',').map(Number);
  return { q, r };
}

export function vizinhos(q, r) {
  return DIRECOES.map((d) => ({ q: q + d.q, r: r + d.r }));
}

export function distancia(a, b) {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
}

// Anel de raio n. Raio 0 devolve só o centro.
export function anel(centro, raio) {
  if (raio === 0) return [{ ...centro }];
  const saida = [];
  let atual = { q: centro.q + DIRECOES[4].q * raio, r: centro.r + DIRECOES[4].r * raio };
  for (let lado = 0; lado < 6; lado++) {
    for (let passo = 0; passo < raio; passo++) {
      saida.push({ ...atual });
      atual = { q: atual.q + DIRECOES[lado].q, r: atual.r + DIRECOES[lado].r };
    }
  }
  return saida;
}

// Disco preenchido: centro + todos os anéis até o raio.
export function espiral(centro, raio) {
  const saida = [];
  for (let i = 0; i <= raio; i++) saida.push(...anel(centro, i));
  return saida;
}

const RAIZ3 = Math.sqrt(3);

// Axial → pixel. `tam` é o raio do círculo circunscrito.
export function paraPixel(q, r, tam) {
  return {
    x: tam * RAIZ3 * (q + r / 2),
    y: tam * 1.5 * r,
  };
}

// Pixel → axial, com arredondamento em coordenadas cúbicas.
export function dePixel(x, y, tam) {
  const rf = (2 / 3) * (y / tam);
  const qf = (RAIZ3 / 3) * (x / tam) - (y / (3 * tam));
  return arredondar(qf, rf);
}

function arredondar(qf, rf) {
  const sf = -qf - rf;
  let q = Math.round(qf);
  let r = Math.round(rf);
  const s = Math.round(sf);
  const dq = Math.abs(q - qf);
  const dr = Math.abs(r - rf);
  const ds = Math.abs(s - sf);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  return { q, r };
}

// Vértices do hexágono pointy-top, começando no topo.
export function vertices(cx, cy, tam) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 90);
    pts.push({ x: cx + tam * Math.cos(a), y: cy + tam * Math.sin(a) });
  }
  return pts;
}
