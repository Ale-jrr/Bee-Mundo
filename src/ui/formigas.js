import { retanguloArredondado, pilula, rotulo, numero, barra } from '../render/desenho.js';
import { zona } from './zonas.js';
import { medidas, areaDoClima } from './layout.js';
import { FORMIGAS } from '../sim/formigas.js';
import {
  estaMinimizado, botaoMinimizar, pilulaMinimizada, recuoDoBotao,
} from './cartao.js';

const ALERTA = '#7a4bb5';

// Cartão das formigas, na coluna da esquerda. Roxo em vez de vermelho: a vespa
// já usa o vermelho e o painel dela fica do outro lado da tela — cor e lugar
// diferentes deixam claro, de relance, qual das duas ameaças está em curso.
export function desenharFormigas(ctx, estado, pal, L, A, topo = null, ui = {}) {
  const praga = estado.formigas;
  if (!praga) return null;

  const m = medidas(L, A);
  const clima = areaDoClima(m);
  const { esc } = m;

  if (estaMinimizado(ui, 'formigas')) {
    return pilulaMinimizada(ctx, pal, m, clima.x,
      (topo ?? clima.y + clima.a) + Math.max(8, Math.round(10 * esc)), clima.l, 'formigas',
      `formigas ${Math.ceil(praga.resta)}s · -${praga.roubado.toFixed(1)}`, ALERTA);
  }

  const pad = Math.max(12, Math.round(18 * esc));
  const hTitulo = Math.max(18, Math.round(24 * esc));
  const hTexto = Math.max(13, Math.round(15 * esc));
  const hBarra = Math.max(6, Math.round(8 * esc));
  const hBotao = Math.max(m.toque * 0.7, Math.round(34 * esc));
  const gap = Math.max(8, Math.round(10 * esc));

  const x = clima.x;
  const y = (topo ?? clima.y + clima.a) + gap;
  const l = clima.l;
  const a = pad + hTitulo + hTexto + hBarra + gap + hBotao + pad;
  if (y + a > A - m.margem - Math.round(40 * esc)) return null;

  ctx.save();
  ctx.shadowColor = pal.css('sombra', 0.18);
  ctx.shadowBlur = 16 * esc;
  ctx.shadowOffsetY = 4 * esc;
  retanguloArredondado(ctx, x, y, l, a, Math.round(20 * esc));
  ctx.fillStyle = pal.css('hud', 0.95);
  ctx.fill();
  ctx.restore();
  zona('formigas:cartao', x, y, l, a);
  botaoMinimizar(ctx, pal, m, x, y, l, 'formigas');

  let cursor = y + pad;
  rotulo(ctx, 'formigas na entrada', x + pad, cursor + hTitulo / 2, {
    tamanho: m.rotulo, cor: ALERTA, espaco: 2.4,
  });
  numero(ctx, `${Math.ceil(praga.resta)}s`, x + l - pad - recuoDoBotao(m), cursor + hTitulo / 2, {
    tamanho: Math.max(13, 17 * esc), cor: ALERTA, alinhar: 'right',
  });
  cursor += hTitulo;

  rotulo(ctx, 'levando mel do vidro', x + pad, cursor + hTexto / 2, {
    tamanho: Math.max(9, 10 * esc), cor: pal.css('suave'), espaco: 1.4,
  });
  numero(ctx, `-${praga.roubado.toFixed(1)}`, x + l - pad, cursor + hTexto / 2, {
    tamanho: Math.max(11, 13 * esc), cor: ALERTA, alinhar: 'right',
  });
  cursor += hTexto;

  barra(ctx, x + pad, cursor, l - pad * 2, hBarra,
    Math.max(0, praga.resta) / FORMIGAS.duracao, pal.css('escuro', 0.2), ALERTA);
  cursor += hBarra + gap;

  const pode = estado.moedas >= FORMIGAS.custoVedar;
  pilula(ctx, x + pad, cursor, l - pad * 2, hBotao);
  ctx.fillStyle = pode ? pal.css('cheia') : pal.css('escuro', 0.12);
  ctx.fill();
  rotulo(ctx, `vedar a entrada · ${FORMIGAS.custoVedar}`, x + l / 2, cursor + hBotao / 2, {
    tamanho: Math.max(9, 10 * esc), cor: pode ? pal.css('tinta') : pal.css('suave'),
    espaco: 1.8, alinhar: 'center',
  });
  if (pode) zona('formigas:vedar', x + pad, cursor, l - pad * 2, hBotao);

  return y + a;
}
