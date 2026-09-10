import { paraPixel } from '../sim/hex.js';
import { caminhoHex, numero, FONTE } from './desenho.js';
import { CELULA, VARIEDADES, SILO, precoDaCelula } from '../sim/economia.js';

const TAM_MAX = 84;
const TAM_MIN = 22;
const RAIZ3 = Math.sqrt(3);

// Geometria do favo: centro e tamanho do hexágono, derivados do viewport e da
// extensão atual do favo. Fonte única — o desenho e o hit-test do toque leem
// daqui, então o favo cabe na tela em qualquer largura e encolhe ao crescer.
export function geometriaFavo(estado, L, A) {
  const celulas = Object.values(estado.celulas);
  let extX = 1, extY = 1;
  for (const c of celulas) {
    const p = paraPixel(c.q, c.r, 1);
    extX = Math.max(extX, Math.abs(p.x) + RAIZ3 / 2);
    extY = Math.max(extY, Math.abs(p.y) + 1);
  }

  const compacto = L < 820;
  // Em tela larga o painel de clima e os botões ocupam as laterais; em tela
  // estreita o favo pode usar quase toda a largura.
  const dispL = L * (compacto ? 0.94 : 0.60);
  const dispA = A * (compacto ? 0.52 : 0.62);
  const tam = Math.max(TAM_MIN, Math.min(TAM_MAX, dispL / (2 * extX), dispA / (2 * extY)));

  return { cx: L / 2, cy: A * (compacto ? 0.46 : 0.52), tam };
}

export function centroDaCelula(celula, cx, cy, tam) {
  const p = paraPixel(celula.q, celula.r, tam);
  return { x: cx + p.x, y: cy + p.y };
}

export function desenharFavo(ctx, estado, pal, cx, cy, tam) {
  const celulas = Object.values(estado.celulas);
  const k = tam / TAM_MAX;   // sombras e traços acompanham a escala do favo

  // A sombra longa é desenhada uma vez sobre a silhueta unificada do favo —
  // é isso que faz o conjunto parecer uma peça só, e não hexágonos soltos.
  ctx.save();
  ctx.shadowColor = pal.css('sombra', 0.28);
  ctx.shadowBlur = 70 * k;
  ctx.shadowOffsetX = 110 * k;
  ctx.shadowOffsetY = 85 * k;
  ctx.beginPath();
  for (const c of celulas) {
    const { x, y } = centroDaCelula(c, cx, cy, tam);
    caminhoHex(ctx, x, y, tam * 1.02);
  }
  ctx.fillStyle = pal.css('aro');
  ctx.fill();
  ctx.restore();

  for (const c of celulas) desenharCelula(ctx, c, estado, pal, cx, cy, tam);
}

function desenharCelula(ctx, celula, estado, pal, cx, cy, tam) {
  const { x, y } = centroDaCelula(celula, cx, cy, tam);
  const k = tam / TAM_MAX;

  if (celula.estado === 'travada') {
    ctx.beginPath();
    caminhoHex(ctx, x, y, tam * 0.94);
    ctx.fillStyle = pal.css('escuro', 0.28);
    ctx.fill();

    // Moeda + preço, pequeno: o número grande no favo é sempre o silo.
    const preco = String(precoDaCelula(estado.celulasCompradas));
    ctx.beginPath();
    ctx.arc(x - 16 * k, y, 9 * k, 0, Math.PI * 2);
    ctx.fillStyle = pal.css('cheia', 0.75);
    ctx.fill();
    numero(ctx, preco, x + 2 * k, y, { tamanho: Math.max(10, 19 * k), cor: pal.css('hud', 0.8) });
    return;
  }

  // Aro dourado: um hexágono maior por baixo do miolo.
  ctx.beginPath();
  caminhoHex(ctx, x, y, tam);
  ctx.fillStyle = pal.css('aro');
  ctx.fill();

  ctx.beginPath();
  caminhoHex(ctx, x, y, tam * 0.86);
  ctx.fillStyle = corDoMiolo(celula, pal);
  ctx.fill();

  // Néctar enchendo: preenchimento por altura, recortado no hexágono.
  if (celula.estado === 'nectar') {
    const f = celula.nectar / CELULA.capacidadeNectar;
    ctx.save();
    ctx.beginPath();
    caminhoHex(ctx, x, y, tam * 0.86);
    ctx.clip();
    ctx.fillStyle = pal.css('cheia', 0.9);
    ctx.fillRect(x - tam, y + tam - 2 * tam * f, tam * 2, 2 * tam * f);
    ctx.restore();
  }

  // Ovo: elipse clara que ganha opacidade conforme a eclosão avança, para o
  // jogador ver que a ninhada travou quando a temperatura sai da faixa.
  if (celula.estado === 'ovo') {
    // Um ovo desenhado por abelha a caminho: dá pra ver, sem número, quantas
    // vão nascer daquela ninhada.
    const quantos = celula.ovos?.length ?? Math.max(1, celula.ninhada ?? 1);
    ctx.save();

    ctx.fillStyle = '#f6f0dc';
    for (let i = 0; i < quantos; i++) {
      ctx.globalAlpha = 0.45 + 0.5 * (celula.ovos?.[i]?.cura ?? celula.cura);
      const a = -Math.PI / 2 + (i - (quantos - 1) / 2) * 0.9;
      const r = quantos === 1 ? 0 : tam * 0.22;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6,
        tam * 0.1, tam * 0.15, -0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Silo: célula guardando pólen. Existem vários, e cada um mostra seu próprio
  // estoque — o número no hexágono sobe e desce durante a partida.
  if (celula.estado === 'silo') {
    const f = Math.min(1, celula.polen / SILO.capacidadePorCelula);
    ctx.save();
    ctx.beginPath();
    caminhoHex(ctx, x, y, tam * 0.86);
    ctx.clip();
    ctx.fillStyle = pal.css('cheia', 0.85);
    ctx.fillRect(x - tam, y + tam - 2 * tam * f, tam * 2, 2 * tam * f);
    ctx.restore();
    numero(ctx, String(Math.floor(celula.polen)), x, y, {
      tamanho: Math.max(14, 32 * k), cor: pal.css('tinta', 0.75), alinhar: 'center',
    });
  }

  // Célula cheia de néctar já brilha: é a que a próxima operária com pólen vai
  // fechar, e o jogador vê que só falta alguém passar ali.
  if (celula.estado === 'nectar' && celula.nectar >= CELULA.capacidadeNectar - 0.001) {
    brilho(ctx, x, y, tam);
  }

  // Pronta pra colher: brilho de célula cheia mais um anel duplo que pulsa.
  // Duplo porque uma cor só não contrasta com as quatro variedades — creme
  // some na acácia, escuro some na flor silvestre.
  if (celula.estado === 'madura') {
    brilho(ctx, x, y, tam);
    const pulso = 0.55 + 0.45 * Math.sin(performance.now() / 300);
    ctx.save();
    ctx.beginPath();
    caminhoHex(ctx, x, y, tam * 0.86);
    ctx.strokeStyle = pal.css('escuro', 0.5);
    ctx.lineWidth = 7 * k;
    ctx.stroke();
    ctx.globalAlpha = pulso;
    ctx.beginPath();
    caminhoHex(ctx, x, y, tam * 0.86);
    ctx.strokeStyle = '#fff8dc';
    ctx.lineWidth = 3.5 * k;
    ctx.stroke();
    ctx.restore();

    // Quantos potes saem dessa célula — só aparece quando vale mais de um.
    const potes = celula.potes ?? 1;
    if (potes > 1) {
      numero(ctx, `${potes}`, x, y, {
        tamanho: Math.max(13, 26 * k), cor: 'rgba(60,42,16,0.85)', alinhar: 'center',
      });
    }
  }
}

// A célula conta a própria história pela cor: pálida quando começa a encher,
// puxando pra cor da variedade conforme o néctar sobe, cheia da cor quando o
// mel está pronto. Sem estado intermediário de cura, é esse degradê que mostra
// o quanto falta.
function corDoMiolo(celula, pal) {
  const variedade = VARIEDADES[celula.variedade]?.cor;
  switch (celula.estado) {
    case 'vazia':   return pal.css('vazia');
    case 'rainha':  return pal.css('vazia', 0.85);
    case 'ovo':     return pal.css('vazia', 0.9);
    case 'silo':    return pal.css('parcial', 0.75);
    case 'nectar': {
      const cheio = Math.min(1, celula.nectar / CELULA.capacidadeNectar);
      return variedade ? misturar(pal.parcial, variedade, 0.45 * cheio) : pal.css('parcial', 0.5);
    }
    case 'madura':  return variedade ?? pal.css('cheia');
    default:        return pal.css('vazia');
  }
}

function paraRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function misturar(rgbA, hexB, t) {
  const b = paraRgb(hexB);
  const c = rgbA.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// Brilho diagonal das células cheias, como nas telas de referência: é o que
// diz "isto está cheio" antes mesmo de a cor registrar.
function brilho(ctx, x, y, tam) {
  ctx.save();
  ctx.beginPath();
  caminhoHex(ctx, x, y, tam * 0.86);
  ctx.clip();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(x - tam * 0.3, y - tam * 0.3, tam * 0.46, tam * 0.13, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Abelha vetorial simples: corpo listrado, asas translúcidas, coroa se rainha.
export function desenharAbelha(ctx, x, y, escala, pal, rainha, progresso) {
  ctx.save();
  ctx.translate(x, y);
  const tamanho = escala * (rainha ? 1.3 : 1);
  ctx.scale(tamanho, tamanho);
  if (rainha) {
    ctx.beginPath(); ctx.ellipse(0, -3, 29, 32, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(102,57,139,0.25)'; ctx.fill();
    ctx.strokeStyle = '#ffe6a0'; ctx.lineWidth = 2; ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 13, -6, 11, 7, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#f2c31c';
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 17, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#2f2a22';
  for (const oy of [-14, -3, 8]) ctx.fillRect(-14, oy, 28, 5);
  ctx.restore();

  ctx.fillStyle = '#2f2a22';
  ctx.beginPath();
  ctx.ellipse(0, -14, 9, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  if (rainha) {
    // Coroa de três pontas, contornada para continuar visível em todas as estações.
    ctx.beginPath();
    ctx.moveTo(-12, -23); ctx.lineTo(-15, -36); ctx.lineTo(-6, -31);
    ctx.lineTo(0, -41); ctx.lineTo(6, -31); ctx.lineTo(15, -36);
    ctx.lineTo(12, -23); ctx.closePath();
    ctx.fillStyle = '#ffd24c'; ctx.fill();
    ctx.strokeStyle = '#56311a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -29, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#8b3baf'; ctx.fill();
  }
  ctx.restore();

  if (rainha) {
    // Texto em pixels de tela: permanece legível mesmo quando o favo diminui.
    ctx.save();
    const ly = y + 28 * tamanho;
    ctx.fillStyle = '#58376e';
    ctx.fillRect(x - 27, ly, 54, 16);
    ctx.font = '700 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff4d2'; ctx.fillText('RAINHA', x, ly + 8);
    ctx.restore();
  }
  if (progresso != null && progresso > 0) {
    const l = 44 * escala;
    ctx.fillStyle = pal.css('hud', 0.7);
    ctx.fillRect(x - l / 2, y - 34 * escala, l, 6 * escala);
    ctx.fillStyle = pal.css('cheia');
    ctx.fillRect(x - l / 2, y - 34 * escala, l * progresso, 6 * escala);
  }
}
