import { centroDaCelula } from './favo.js';
import { caminhoHex } from './desenho.js';
import { chave } from '../sim/hex.js';

// A colmeia conta a própria história em volta do favo. Três sinais, um para
// cada coisa que o jogador conquista, porque número em HUD não dá orgulho:
//
//   moldura de cera  ← células compradas (o favo cresceu)
//   contas na borda  ← anos sobrevividos (a colônia durou)
//   flores em volta  ← melhorias de campo (o apiário melhorou)
//
// Tudo derivado do estado e do índice, sem sorteio: enfeite que muda de lugar
// a cada quadro vira ruído, não memória.

const MAX_CONTAS = 9;      // o jogo acaba no Ano 9
const MAX_FLORES = 12;     // acima disso vira jardim, não sinal
const PIPS_POR_FLOR = 2;

const VIZINHOS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];

// Quanto de cada enfeite o estado pede. Separado do desenho pra poder ser
// testado: é a regra ("uma flor a cada duas melhorias"), não o traço.
export function contarOrnamentos(estado) {
  const pips = (estado.campos ?? []).reduce(
    (n, campo) => n + Object.values(campo.upgrades ?? {}).reduce((s, v) => s + v, 0), 0,
  );
  return {
    compradas: estado.celulasCompradas ?? 0,
    anos: Math.min(MAX_CONTAS, estado.historico?.length ?? 0),
    pips,
    flores: Math.min(MAX_FLORES, Math.floor(pips / PIPS_POR_FLOR)),
  };
}

export function desenharOrnamentos(ctx, estado, pal, cx, cy, tam) {
  // Os enfeites têm piso em pixels de tela em vez de acompanhar o hexágono.
  // Escalando só por `tam`, eles sumiam (1,5 px) exatamente quando havia mais
  // o que mostrar — o favo grande encolhe a célula até o mínimo.
  const k = Math.max(0.55, tam / 84);
  const celulas = Object.values(estado.celulas);
  if (!celulas.length) return;

  const { compradas, anos, flores } = contarOrnamentos(estado);

  desenharMoldura(ctx, estado, celulas, pal, cx, cy, tam, compradas);
  if (!anos && !flores) return;

  // As bordas são a moldura de verdade do favo: pendurar os enfeites nelas faz
  // o conjunto crescer junto com a colmeia. Um círculo circunscrito, que foi a
  // primeira tentativa, ficava solto no fundo — o favo não é redondo.
  const borda = celulasDaBorda(estado, celulas, cx, cy, tam);
  desenharContas(ctx, pal, borda, cx, cy, tam, k, anos);
  desenharFlores(ctx, pal, borda, cx, cy, tam, k, flores);
}

// Moldura de cera: a mesma silhueta unificada que o favo usa para a sombra,
// só que um pouco maior e desenhada por baixo. Some no favo inicial e engrossa
// conforme o jogador compra célula.
function desenharMoldura(ctx, estado, celulas, pal, cx, cy, tam, compradas) {
  if (compradas <= 0) return;
  const forca = Math.min(1, compradas / 18);

  ctx.save();
  ctx.beginPath();
  for (const c of celulas) {
    const { x, y } = centroDaCelula(c, cx, cy, tam);
    caminhoHex(ctx, x, y, tam * 1.02 + Math.max(4, tam * 0.2 * forca));
  }
  ctx.fillStyle = pal.css('aro', 0.45 + 0.4 * forca);
  ctx.fill();
  ctx.restore();
}

// Célula de borda: a que não tem os seis vizinhos no favo. Devolvidas em ordem
// angular, para os enfeites darem a volta em vez de pular de um lado a outro.
function celulasDaBorda(estado, celulas, cx, cy, tam) {
  const borda = [];
  for (const c of celulas) {
    const cercada = VIZINHOS.every(([dq, dr]) => estado.celulas[chave(c.q + dq, c.r + dr)]);
    if (cercada) continue;
    const p = centroDaCelula(c, cx, cy, tam);
    // Ângulo medido a partir do topo, no sentido do relógio: as contas de ano
    // começam em cima e dão a volta, como mostrador. Cru, o `atan2` começava
    // pela esquerda e os cinco primeiros anos ficavam todos de um lado só.
    const bruto = Math.atan2(p.y - cy, p.x - cx) + Math.PI / 2;
    borda.push({ x: p.x, y: p.y, ang: (bruto + Math.PI * 2) % (Math.PI * 2) });
  }
  borda.sort((a, b) => a.ang - b.ang);
  return borda;
}

// Uma conta de cera por ano sobrevivido, encostada na borda do favo.
function desenharContas(ctx, pal, borda, cx, cy, tam, k, anos) {
  if (anos <= 0 || !borda.length) return;

  ctx.save();
  for (let i = 0; i < anos; i++) {
    const p = borda[Math.floor((i / MAX_CONTAS) * borda.length) % borda.length];
    const { x, y } = paraFora(p, cx, cy, tam * 1.06 + 4);
    ctx.beginPath();
    const r = Math.max(5, 6 * k);
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = pal.css('cheia', 0.95);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = pal.css('escuro', 0.4);
    ctx.lineWidth = 1.6 * k;
    ctx.stroke();
  }
  ctx.restore();
}

// Uma flor a cada duas melhorias. Ficam mais afastadas que as contas e entram
// meio passo depois delas, pra as duas coisas não empilharem no mesmo ponto.
function desenharFlores(ctx, pal, borda, cx, cy, tam, k, flores) {
  if (flores <= 0 || !borda.length) return;

  ctx.save();
  for (let i = 0; i < flores; i++) {
    // Flores não são medidor: espalham por toda a volta, meio passo depois das
    // contas, em vez de encherem o mostrador junto com elas.
    const p = borda[Math.floor(((i + 0.5) / flores) * borda.length) % borda.length];
    const { x, y } = paraFora(p, cx, cy, tam * 1.55 + 6);
    flor(ctx, pal, x, y, Math.max(7, 8 * k));
  }
  ctx.restore();
}

// Empurra um ponto para fora do centro do favo, na direção em que ele já está.
function paraFora(p, cx, cy, distancia) {
  const dx = p.x - cx;
  const dy = p.y - cy;
  const d = Math.hypot(dx, dy) || 1;
  return { x: p.x + (dx / d) * distancia, y: p.y + (dy / d) * distancia };
}

function flor(ctx, pal, x, y, raio) {
  for (let p = 0; p < 5; p++) {
    const ang = (p / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(ang) * raio * 0.62, y + Math.sin(ang) * raio * 0.62, raio * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = pal.css('hud', 0.8);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x, y, raio * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = pal.css('cheia', 0.95);
  ctx.fill();
}
