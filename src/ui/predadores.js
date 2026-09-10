import { retanguloArredondado, FONTE } from '../render/desenho.js';
import { zona } from './zonas.js';
import { medidas, areaDoClima } from './layout.js';
import { estaMinimizado, botaoMinimizar, pilulaMinimizada, recuoDoBotao } from './cartao.js';

const ALERTA = '#b8484a';

export function desenharPredador(ctx, estado, pal, L, A, ui = {}, topo = null) {
  if (!estado.ameaca) return null;

  const m = medidas(L, A);
  const clima = areaDoClima(m);
  const { esc } = m;
  const gap = Math.max(8, Math.round(10 * esc));
  const guardas = estado.abelhas.filter((b) => b.guarda).length;

  if (estaMinimizado(ui, 'vespa')) {
    return pilulaMinimizada(ctx, pal, m, clima.x, (topo ?? clima.y + clima.a) + gap,
      clima.l, 'vespa',
      `vespa ${Math.ceil(estado.ameaca.resta)}s · guardas ${guardas}/2`, ALERTA);
  }

  const pad = Math.max(12, Math.round(18 * esc));
  const hTitulo = Math.max(18, Math.round(24 * esc));
  const hTexto = Math.max(13, Math.round(15 * esc));
  const hBotao = Math.max(m.toque * 0.7, Math.round(34 * esc));

  const x = clima.x;
  const y = (topo ?? clima.y + clima.a) + gap;
  const l = clima.l;
  const a = pad + hTitulo + hTexto * 2 + gap + hBotao + pad;
  if (y + a > A - m.margem - Math.round(40 * esc)) return null;

  ctx.save();
  ctx.shadowColor = pal.css('sombra', 0.18);
  ctx.shadowBlur = 16 * esc;
  ctx.shadowOffsetY = 4 * esc;
  retanguloArredondado(ctx, x, y, l, a, Math.round(20 * esc));
  ctx.fillStyle = pal.css('hud', 0.95);
  ctx.fill();
  ctx.restore();
  zona('vespa:cartao', x, y, l, a);
  botaoMinimizar(ctx, pal, m, x, y, l, 'vespa');

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let cursor = y + pad;

  ctx.fillStyle = ALERTA;
  ctx.font = `700 ${Math.max(12, Math.round(14 * esc))}px ${FONTE}`;
  ctx.fillText('Vespa rondando', x + pad, cursor + hTitulo / 2,
    l - pad * 2 - recuoDoBotao(m));
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.ceil(estado.ameaca.resta)}s`,
    x + l - pad - recuoDoBotao(m), cursor + hTitulo / 2);
  ctx.textAlign = 'left';
  cursor += hTitulo;

  ctx.fillStyle = pal.css('suave');
  ctx.font = `400 ${Math.max(10, Math.round(12 * esc))}px ${FONTE}`;
  ctx.fillText('Duas guardiãs protegem as coletoras.', x + pad, cursor + hTexto / 2, l - pad * 2);
  cursor += hTexto;
  ctx.fillText('Recolha uma turma (−) para ter abelha livre.',
    x + pad, cursor + hTexto / 2, l - pad * 2);
  cursor += hTexto + gap;
  ctx.restore();

  const pronto = guardas >= 2;
  retanguloArredondado(ctx, x + pad, cursor, l - pad * 2, hBotao, Math.round(12 * esc));
  ctx.fillStyle = pronto ? '#a7c57e' : pal.css('cheia');
  ctx.fill();
  ctx.save();
  ctx.fillStyle = pal.css('tinta');
  ctx.font = `700 ${Math.max(10, Math.round(12 * esc))}px ${FONTE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pronto ? 'Defesa pronta · 2/2' : `Enviar guarda · ${guardas}/2`,
    x + l / 2, cursor + hBotao / 2);
  ctx.restore();
  if (!pronto) zona('vespa:guarda', x + pad, cursor, l - pad * 2, hBotao);

  return y + a;
}
