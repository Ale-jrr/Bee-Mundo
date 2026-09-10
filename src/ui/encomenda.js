import { retanguloArredondado, rotulo, numero, barra } from '../render/desenho.js';
import { zona } from './zonas.js';
import { medidas, areaDoClima } from './layout.js';
import { encomendaAtiva, estacaoDoPrazo } from '../sim/encomendas.js';
import { VARIEDADES } from '../sim/economia.js';

const URGENTE = '#b8484a';

// Cartão da encomenda em curso. Fica na mesma coluna do clima e do inverno,
// empilhado abaixo deles: são os três avisos que o jogador precisa ver sem
// abrir nada, e a coluna da esquerda é a única que nunca disputa espaço com o
// favo.
export function desenharEncomenda(ctx, estado, pal, L, A, topo = null) {
  const pedido = encomendaAtiva(estado);
  if (!pedido) return null;

  const m = medidas(L, A);
  const clima = areaDoClima(m);
  const { esc } = m;

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

  const restam = Math.max(0, pedido.vence - estado.decorrido);
  const urgente = restam <= 20;

  ctx.save();
  ctx.shadowColor = pal.css('sombra', 0.18);
  ctx.shadowBlur = 16 * esc;
  ctx.shadowOffsetY = 4 * esc;
  retanguloArredondado(ctx, x, y, l, a, Math.round(20 * esc));
  ctx.fillStyle = pal.css('hud', 0.95);
  ctx.fill();
  ctx.restore();
  zona('encomenda:cartao', x, y, l, a);

  let cursor = y + pad;
  rotulo(ctx, 'encomenda', x + pad, cursor + hTitulo / 2, {
    tamanho: m.rotulo, cor: pal.css('suave'), espaco: 2.4,
  });
  // O prazo aparece como estação enquanto está longe e vira relógio no fim: o
  // jogador planeja por estação, mas corre por segundo.
  rotulo(ctx, urgente ? `${Math.ceil(restam)}s` : `até o ${estacaoDoPrazo(pedido).nome.toLowerCase()}`,
    x + l - pad, cursor + hTitulo / 2, {
      tamanho: Math.max(9, 11 * esc), cor: urgente ? URGENTE : pal.css('tinta'),
      espaco: 1.6, alinhar: 'right',
    });
  cursor += hTitulo;

  const variedade = VARIEDADES[pedido.variedade];
  ctx.beginPath();
  ctx.arc(x + pad + 5, cursor + hTexto / 2, 5, 0, Math.PI * 2);
  ctx.fillStyle = variedade.cor;
  ctx.fill();
  rotulo(ctx, variedade.nome, x + pad + 16, cursor + hTexto / 2, {
    tamanho: Math.max(9, 10 * esc), cor: pal.css('suave'), espaco: 1.4,
  });
  numero(ctx, `${Math.floor(pedido.entregue)}/${pedido.quantidade}`,
    x + l - pad, cursor + hTexto / 2, {
      tamanho: Math.max(11, 13 * esc), cor: pal.css('tinta'), alinhar: 'right',
    });
  cursor += hTexto;

  barra(ctx, x + pad, cursor, l - pad * 2, hBarra,
    Math.min(1, pedido.entregue / pedido.quantidade),
    pal.css('escuro', 0.2), urgente ? URGENTE : pal.css('cheia'));
  cursor += hBarra + gap;

  rotulo(ctx, `vender rende +${pedido.recompensa}`, x + pad, cursor + hTexto / 2, {
    tamanho: Math.max(9, 10 * esc), cor: pal.css('suave'), espaco: 1.4,
  });

  return y + a;
}
