import { retanguloArredondado, rotulo, numero, barra } from '../render/desenho.js';
import { zona } from './zonas.js';
import { medidas, areaDoClima } from './layout.js';
import { pressaoDoEnxame, ENXAME } from '../sim/enxame.js';
import {
  estaMinimizado, botaoMinimizar, pilulaMinimizada, recuoDoBotao,
} from './cartao.js';

const ALERTA = '#b8484a';

// Cartão do enxame. Aparece só durante os 30 s de preparação, na mesma coluna
// do clima — e diz a única coisa acionável: quantas células faltam comprar.
export function desenharEnxame(ctx, estado, pal, L, A, topo = null, ui = {}) {
  if (!estado.enxame) return null;

  const m = medidas(L, A);
  const clima = areaDoClima(m);
  const { esc } = m;
  const p = pressaoDoEnxame(estado);

  if (estaMinimizado(ui, 'enxame')) {
    return pilulaMinimizada(ctx, pal, m, clima.x,
      (topo ?? clima.y + clima.a) + Math.max(8, Math.round(10 * esc)), clima.l, 'enxame',
      `enxame ${Math.ceil(estado.enxame.resta)}s`, ALERTA);
  }

  const pad = Math.max(12, Math.round(18 * esc));
  const hTitulo = Math.max(18, Math.round(24 * esc));
  const hTexto = Math.max(13, Math.round(15 * esc));
  const hBarra = Math.max(6, Math.round(8 * esc));
  const gap = Math.max(8, Math.round(10 * esc));

  const x = clima.x;
  const y = (topo ?? clima.y + clima.a) + gap;
  const l = clima.l;
  const a = pad + hTitulo + hTexto + hBarra + gap + hTexto + pad;
  if (y + a > A - m.margem - Math.round(40 * esc)) return null;

  ctx.save();
  ctx.shadowColor = pal.css('sombra', 0.18);
  ctx.shadowBlur = 16 * esc;
  ctx.shadowOffsetY = 4 * esc;
  retanguloArredondado(ctx, x, y, l, a, Math.round(20 * esc));
  ctx.fillStyle = pal.css('hud', 0.95);
  ctx.fill();
  ctx.restore();
  zona('enxame:cartao', x, y, l, a);
  botaoMinimizar(ctx, pal, m, x, y, l, 'enxame');

  let cursor = y + pad;
  rotulo(ctx, 'enxame a caminho', x + pad, cursor + hTitulo / 2, {
    tamanho: m.rotulo, cor: ALERTA, espaco: 2.4,
  });
  numero(ctx, `${Math.ceil(estado.enxame.resta)}s`, x + l - pad - recuoDoBotao(m), cursor + hTitulo / 2, {
    tamanho: Math.max(13, 17 * esc), cor: ALERTA, alinhar: 'right',
  });
  cursor += hTitulo;

  rotulo(ctx, p.celulasQueFaltam === 1 ? 'compre 1 célula' : `compre ${p.celulasQueFaltam} células`,
    x + pad, cursor + hTexto / 2, {
      tamanho: Math.max(9, 10 * esc), cor: pal.css('tinta'), espaco: 1.6,
    });
  numero(ctx, `${p.operarias}/${p.limite}`, x + l - pad, cursor + hTexto / 2, {
    tamanho: Math.max(11, 13 * esc), cor: ALERTA, alinhar: 'right',
  });
  cursor += hTexto;

  // A barra é a contagem regressiva, não a lotação: é o tempo que o jogador
  // ainda tem pra decidir.
  barra(ctx, x + pad, cursor, l - pad * 2, hBarra,
    Math.max(0, estado.enxame.resta) / ENXAME.aviso,
    pal.css('escuro', 0.2), ALERTA);
  cursor += hBarra + gap;

  const vao = Math.floor(p.operarias * ENXAME.fracaoQueVai);
  const quantas = vao === 1 ? '1 abelha' : `${vao} abelhas`;
  rotulo(ctx, `ou deixe partir: ${quantas}, +${vao * ENXAME.moedasPorAbelha} moedas`,
    x + pad, cursor + hTexto / 2, {
      tamanho: Math.max(9, 10 * esc), cor: pal.css('suave'), espaco: 1.4,
    });

  return y + a;
}
