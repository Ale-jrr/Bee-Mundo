// Uma paleta por estação, interpolada continuamente. É o coração da identidade
// visual: nenhum asset troca entre estações, só estes dez valores.

const CRUAS = {
  primavera: {
    fundo: '#b5cd7a', fundoFim: '#9cba5e', aro: '#dcae2c',
    cheia: '#f6d13c', parcial: '#f0e28f', vazia: '#7f8a63',
    sombra: '#4a5424', hud: '#faf4ce', tinta: '#5b4a1c', suave: '#8a7736',
    escuro: '#3b3222', particula: '#f6e6c8',
  },
  verao: {
    fundo: '#d6d382', fundoFim: '#c3c46d', aro: '#e0ae1e',
    cheia: '#f7cf2a', parcial: '#f3d97a', vazia: '#8c8c7e',
    sombra: '#57562a', hud: '#fbf3c9', tinta: '#5b4a1c', suave: '#8a7736',
    escuro: '#3b3222', particula: '#fff3c4',
  },
  outono: {
    fundo: '#dfa73c', fundoFim: '#cf912c', aro: '#d9a11f',
    cheia: '#eeba24', parcial: '#e8cf7c', vazia: '#8f8f52',
    sombra: '#6d4a12', hud: '#f8ecc2', tinta: '#5a3f14', suave: '#8a6b2c',
    escuro: '#3a2c16', particula: '#a03a1e',
  },
  inverno: {
    fundo: '#aab6bd', fundoFim: '#93a2ab', aro: '#c9ad63',
    cheia: '#e2c463', parcial: '#dcd6bd', vazia: '#78818a',
    sombra: '#3f4a52', hud: '#eef2f4', tinta: '#3f4a52', suave: '#6b7880',
    escuro: '#2a3238', particula: '#ffffff',
  },
};

const CHAVES = Object.keys(CRUAS.verao);

// Pré-converte para [r,g,b] uma única vez.
const RGB = {};
for (const [id, p] of Object.entries(CRUAS)) {
  RGB[id] = {};
  for (const k of CHAVES) RGB[id][k] = paraRgb(p[k]);
}

function paraRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const suavizar = (t) => t * t * (3 - 2 * t);

// Segura a identidade da estação no primeiro terço, depois transiciona.
export function paletaAtual(t) {
  const a = RGB[t.estacao.id];
  const b = RGB[t.proxima.id];
  const m = suavizar(Math.max(0, (t.progresso - 0.35) / 0.65));
  const saida = {};
  for (const k of CHAVES) {
    const [r1, g1, b1] = a[k];
    const [r2, g2, b2] = b[k];
    saida[k] = [
      Math.round(r1 + (r2 - r1) * m),
      Math.round(g1 + (g2 - g1) * m),
      Math.round(b1 + (b2 - b1) * m),
    ];
  }
  saida.css = (chave, alfa = 1) => {
    const [r, g, bb] = saida[chave];
    return alfa >= 1 ? `rgb(${r},${g},${bb})` : `rgba(${r},${g},${bb},${alfa})`;
  };
  return saida;
}

export function corDaEstacao(id, chave) {
  const [r, g, b] = RGB[id][chave];
  return `rgb(${r},${g},${b})`;
}
