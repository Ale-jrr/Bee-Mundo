// Primitivas de canvas compartilhadas. Nada aqui conhece o estado do jogo.

import { vertices } from '../sim/hex.js';

export function caminhoHex(ctx, cx, cy, tam) {
  const p = vertices(cx, cy, tam);
  ctx.moveTo(p[0].x, p[0].y);
  for (let i = 1; i < 6; i++) ctx.lineTo(p[i].x, p[i].y);
  ctx.closePath();
}

export function retanguloArredondado(ctx, x, y, l, a, r) {
  // Larguras negativas chegam aqui em viewports de tamanho zero (aba oculta,
  // primeiro quadro). Clampar aqui evita IndexSizeError em todo chamador.
  const raio = Math.max(0, Math.min(r, l / 2, a / 2));
  if (l <= 0 || a <= 0) { ctx.beginPath(); return; }
  ctx.beginPath();
  ctx.moveTo(x + raio, y);
  ctx.arcTo(x + l, y, x + l, y + a, raio);
  ctx.arcTo(x + l, y + a, x, y + a, raio);
  ctx.arcTo(x, y + a, x, y, raio);
  ctx.arcTo(x, y, x + l, y, raio);
  ctx.closePath();
}

export function pilula(ctx, x, y, l, a) {
  retanguloArredondado(ctx, x, y, l, a, a / 2);
}

// Rótulos do jogo são sempre CAIXA ALTA com espaçamento largo.
export function rotulo(ctx, texto, x, y, { tamanho = 12, cor = '#000', espaco = 2.2, alinhar = 'left' } = {}) {
  const s = texto.toUpperCase();
  ctx.save();
  ctx.font = `700 ${tamanho}px ${FONTE}`;
  ctx.fillStyle = cor;
  ctx.textBaseline = 'middle';
  const larguras = [...s].map((c) => ctx.measureText(c).width + espaco);
  const total = larguras.reduce((s2, w) => s2 + w, 0) - espaco;
  let cx = alinhar === 'center' ? x - total / 2 : alinhar === 'right' ? x - total : x;
  [...s].forEach((c, i) => { ctx.fillText(c, cx, y); cx += larguras[i]; });
  ctx.restore();
  return total;
}

// Largura que `rotulo` vai ocupar, para posicionar o que vem depois dele sem
// chutar. Chutar largura de texto em caixa alta com espaçamento foi a causa de
// duas sobreposições no layout compacto.
export function larguraRotulo(ctx, texto, tamanho = 12, espaco = 2.2) {
  ctx.save();
  ctx.font = `700 ${tamanho}px ${FONTE}`;
  const s = texto.toUpperCase();
  const total = [...s].reduce((soma, c) => soma + ctx.measureText(c).width + espaco, 0) - espaco;
  ctx.restore();
  return Math.max(0, total);
}

export function numero(ctx, texto, x, y, { tamanho = 22, cor = '#000', alinhar = 'left' } = {}) {
  ctx.save();
  ctx.font = `800 ${tamanho}px ${FONTE}`;
  ctx.fillStyle = cor;
  ctx.textAlign = alinhar;
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, x, y);
  ctx.restore();
}

export const FONTE = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

// Barra de medidor: trilho escuro, preenchimento claro, cantos totalmente redondos.
export function barra(ctx, x, y, l, a, fracao, corTrilho, corFrente) {
  pilula(ctx, x, y, l, a);
  ctx.fillStyle = corTrilho;
  ctx.fill();
  const w = Math.max(a, l * Math.min(1, Math.max(0, fracao)));
  pilula(ctx, x, y, w, a);
  ctx.fillStyle = corFrente;
  ctx.fill();
}
