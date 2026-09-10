import { rotulo, numero, pilula } from '../render/desenho.js';
import { zona } from './zonas.js';
import { META } from '../sim/economia.js';

// Telas de fim de partida. Ficavam em rax.js, que é o mercado — aqui é o lugar
// delas, e agora são duas: a colmeia morre ou sobrevive ao ciclo inteiro.

export function desenharDerrota(ctx, estado, pal, L, A) {
  const esc = escala(L);
  ctx.fillStyle = 'rgba(28, 18, 8, 0.82)';
  ctx.fillRect(0, 0, L, A);

  const { ano, meta, vendido } = estado.derrota;
  rotulo(ctx, `a colmeia não sobreviveu ao ano ${ano}`, L / 2, A / 2 - 40 * esc, {
    tamanho: Math.max(11, 18 * esc), cor: '#f0e2b8', espaco: 3.5 * esc, alinhar: 'center',
  });
  numero(ctx, `${Math.floor(vendido)} de ${meta}`, L / 2, A / 2 + 10 * esc, {
    tamanho: Math.max(24, 42 * esc), cor: '#f5c518', alinhar: 'center',
  });
  rotulo(ctx, 'toque para recomeçar', L / 2, A / 2 + 62 * esc, {
    tamanho: Math.max(9, 12 * esc), cor: '#c9b78a', espaco: 2.6, alinhar: 'center',
  });
  zona('derrota:reiniciar', 0, 0, L, A);
}

export function desenharVitoria(ctx, estado, pal, L, A) {
  const esc = escala(L);
  ctx.fillStyle = 'rgba(24, 34, 22, 0.88)';
  ctx.fillRect(0, 0, L, A);

  const { total, abelhas } = estado.vitoria;

  // Um favo simples em volta do número, para a vitória não ser só texto.
  coroa(ctx, L / 2, A / 2 - 96 * esc, 26 * esc);

  rotulo(ctx, `a colmeia atravessou os ${META.anoFinal} anos`, L / 2, A / 2 - 44 * esc, {
    tamanho: Math.max(11, 18 * esc), cor: '#e8f2d8', espaco: 3.5 * esc, alinhar: 'center',
  });
  numero(ctx, String(total), L / 2, A / 2 + 12 * esc, {
    tamanho: Math.max(28, 52 * esc), cor: '#f5c518', alinhar: 'center',
  });
  rotulo(ctx, 'de mel vendido no total', L / 2, A / 2 + 54 * esc, {
    tamanho: Math.max(9, 11 * esc), cor: '#b9c9a4', espaco: 2.4, alinhar: 'center',
  });
  rotulo(ctx, `${abelhas} abelhas na colônia final`, L / 2, A / 2 + 80 * esc, {
    tamanho: Math.max(9, 11 * esc), cor: '#b9c9a4', espaco: 2.4, alinhar: 'center',
  });

  const bl = Math.min(240, L - 80), bx = (L - bl) / 2, by = A / 2 + 112 * esc;
  pilula(ctx, bx, by, bl, 44 * esc);
  ctx.fillStyle = '#f5c518';
  ctx.fill();
  rotulo(ctx, 'jogar de novo', bx + bl / 2, by + 22 * esc, {
    tamanho: Math.max(10, 12 * esc), cor: '#3b3222', espaco: 2.6, alinhar: 'center',
  });
  zona('vitoria:reiniciar', bx, by, bl, 44 * esc);
}

function escala(L) {
  return Math.max(0.6, Math.min(1, L / 1280));
}

function coroa(ctx, cx, cy, r) {
  ctx.save();
  ctx.fillStyle = '#f0b429';
  ctx.beginPath();
  ctx.moveTo(cx - r, cy + r * 0.6);
  ctx.lineTo(cx - r * 0.7, cy - r * 0.7);
  ctx.lineTo(cx - r * 0.28, cy + r * 0.1);
  ctx.lineTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.28, cy + r * 0.1);
  ctx.lineTo(cx + r * 0.7, cy - r * 0.7);
  ctx.lineTo(cx + r, cy + r * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
