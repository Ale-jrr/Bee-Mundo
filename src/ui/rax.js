import { reservaInverno } from '../sim/alimento.js';
import { retanguloArredondado, pilula, rotulo, numero, FONTE } from '../render/desenho.js';
import { zona } from './zonas.js';
import { VARIEDADES, metaDoAno, MISTURA } from '../sim/economia.js';
import { medidas } from './layout.js';
import { precoDeVenda } from '../sim/acoes.js';

// Bolsa Real de Apicultura. O preço já vem com o viés da estação embutido,
// então o painel mostra ao jogador exatamente o número que ele vai receber.
export function desenharRax(ctx, estado, pal, t, L, A) {
  ctx.fillStyle = 'rgba(30, 22, 10, 0.55)';
  ctx.fillRect(0, 0, L, A);
  zona('rax:fundo', 0, 0, L, A);

  const m = medidas(L, A);
  const alturaLinha = m.compacto ? 92 : 74;
  const l = Math.min(760, L - m.margem * 2);
  const linhas = Object.keys(VARIEDADES).length;
  // Uma faixa a mais no cartão para o botão de misturar.
  const a = Math.min(A - m.margem * 2, (m.compacto ? 168 : 198) + linhas * alturaLinha);
  const x = (L - l) / 2;
  const y = (A - a) / 2;

  retanguloArredondado(ctx, x, y, l, a, 28);
  ctx.fillStyle = pal.css('hud', 0.98);
  ctx.fill();
  zona('rax:cartao', x, y, l, a);

  const meta = metaDoAno(estado.ano, estado);
  rotulo(ctx, m.compacto ? 'rax' : 'bolsa real de apicultura', x + 24, y + 32, {
    tamanho: m.rotulo, cor: pal.css('suave'), espaco: 2.6,
  });
  rotulo(ctx, `ano ${estado.ano} · ${Math.floor(estado.vendidoNoAno)} de ${meta}`, x + l - 48, y + 32, {
    tamanho: m.rotulo, cor: pal.css('tinta'), espaco: 2, alinhar: 'right',
  });

  // Barra de progresso da meta anual, atravessando o topo do cartão.
  const bx = x + 24, bl = l - 48;
  pilula(ctx, bx, y + 50, bl, 10);
  ctx.fillStyle = pal.css('escuro', 0.18);
  ctx.fill();
  const f = Math.min(1, estado.vendidoNoAno / meta);
  if (f > 0) {
    pilula(ctx, bx, y + 50, Math.max(10, bl * f), 10);
    ctx.fillStyle = f >= 1 ? '#3f8a63' : pal.css('cheia');
    ctx.fill();
  }

  Object.entries(VARIEDADES).forEach(([id, v], i) => {
    const topo = y + (m.compacto ? 74 : 90) + i * alturaLinha;
    desenharLinha(ctx, estado, pal, t, id, v, x + 24, topo, l - 48, m);
  });

  // Botão de misturar, abaixo das linhas: a mistura é uma operação sobre o
  // vidro, então mora na tela do vidro.
  const podeMisturar = MISTURA.entrada.every((v) => Math.floor(estado.pote[v] ?? 0) >= 1);
  const my = y + (m.compacto ? 74 : 90) + Object.keys(VARIEDADES).length * alturaLinha + 4;
  const ma = Math.max(m.toque * 0.8, 36);
  if (my + ma < y + a - 46) {
    pilula(ctx, x + 24, my, l - 48, ma);
    ctx.fillStyle = podeMisturar ? pal.css('cheia') : pal.css('escuro', 0.1);
    ctx.fill();
    rotulo(ctx, podeMisturar
      ? `misturar 1 de cada → 1 ${VARIEDADES[MISTURA.saida].nome}`
      : 'misturar precisa de 1 de cada variedade',
    x + l / 2, my + ma / 2, {
      tamanho: 10, cor: podeMisturar ? pal.css('tinta') : pal.css('suave'),
      espaco: 1.6, alinhar: 'center',
    });
    if (podeMisturar) zona('rax:misturar', x + 24, my, l - 48, ma);
  }

  const reserva = reservaInverno(estado);
  ctx.save();
  ctx.font = `600 ${m.compacto ? 11 : 14}px ${FONTE}`;
  ctx.fillStyle = reserva.total < reserva.necessario ? '#b8484a' : pal.css('tinta');
  ctx.textAlign = 'center';
  ctx.fillText(`Reserva: ${reserva.total.toFixed(2)} / ~${reserva.necessario} potes para o inverno`, x + l / 2, y + a - 26, l - 32);
  ctx.font = `400 ${m.compacto ? 10 : 12}px ${FONTE}`;
  ctx.fillText(reserva.inverno ? 'Sem coleta. Sem mel, as operárias ficam lentas.' : 'No inverno não há coleta. Guarde mel para alimentar as operárias.', x + l / 2, y + a - 10, l - 32);
  ctx.restore();

  // Fechar
  const fx = x + l - 40, fy = y + 16;
  ctx.strokeStyle = pal.css('suave');
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(fx, fy); ctx.lineTo(fx + 16, fy + 16);
  ctx.moveTo(fx + 16, fy); ctx.lineTo(fx, fy + 16);
  ctx.stroke();
  zona('rax:fechar', fx - 14, fy - 14, 44, 44);
}

function desenharLinha(ctx, estado, pal, t, id, variedade, x, y, l, m) {
  const a = m.compacto ? 80 : 62;
  retanguloArredondado(ctx, x, y, l, a, 18);
  ctx.fillStyle = pal.css('escuro', 0.06);
  ctx.fill();

  const qtd = Math.floor(estado.pote[id] ?? 0);
  const preco = precoDeVenda(estado, id, t.estacao);
  const subindo = (estado.mercado[id] ?? 1) >= 1;

  ctx.beginPath();
  ctx.arc(x + 26, y + (m.compacto ? 26 : a / 2), 12, 0, Math.PI * 2);
  ctx.fillStyle = variedade.cor;
  ctx.fill();

  ctx.save();
  ctx.font = `700 ${m.compacto ? 15 : 17}px ${FONTE}`;
  ctx.fillStyle = pal.css('tinta');
  ctx.textBaseline = 'middle';
  ctx.fillText(variedade.nome, x + 48, y + (m.compacto ? 26 : a / 2));
  ctx.restore();

  // Seta de tendência: o jogador precisa ver se vale a pena segurar.
  const seta = (sx, sy) => {
    ctx.fillStyle = subindo ? '#3f8a63' : '#b8484a';
    ctx.beginPath();
    if (subindo) { ctx.moveTo(sx, sy - 6); ctx.lineTo(sx + 8, sy + 5); ctx.lineTo(sx - 8, sy + 5); }
    else { ctx.moveTo(sx, sy + 6); ctx.lineTo(sx + 8, sy - 5); ctx.lineTo(sx - 8, sy - 5); }
    ctx.closePath();
    ctx.fill();
  };

  const bl = Math.min(140, l * 0.38);
  const bx = x + l - bl - 12;

  if (m.compacto) {
    // Estreito: identidade em cima, números e botão embaixo.
    seta(x + 26, y + 56);
    numero(ctx, `x${(estado.pote[id] ?? 0).toFixed(2)}`, x + 48, y + 56, { tamanho: 14, cor: pal.css('suave') });
    numero(ctx, preco.toFixed(1), x + 100, y + 56, { tamanho: 16, cor: pal.css('tinta') });
    rotulo(ctx, 'por pote', x + 148, y + 57, { tamanho: 9, cor: pal.css('suave'), espaco: 1.2 });
  } else {
    numero(ctx, `x${(estado.pote[id] ?? 0).toFixed(2)}`, x + l * 0.42, y + a / 2, { tamanho: 17, cor: pal.css('suave'), alinhar: 'right' });
    seta(x + l * 0.47, y + a / 2);
    numero(ctx, preco.toFixed(1), x + l * 0.64, y + a / 2, { tamanho: 20, cor: pal.css('tinta'), alinhar: 'right' });
    rotulo(ctx, 'por pote', x + l * 0.655, y + a / 2, { tamanho: 10, cor: pal.css('suave'), espaco: 1.8 });
  }

  const by = m.compacto ? y + a - 40 : y + 12;
  const ba = m.compacto ? 32 : a - 24;
  pilula(ctx, bx, by, bl, ba);
  ctx.fillStyle = qtd > 0 ? pal.css('cheia') : pal.css('escuro', 0.12);
  ctx.fill();
  rotulo(ctx, qtd > 0 ? `vender 1 · ${preco.toFixed(0)}` : 'sem pote inteiro', bx + bl / 2, by + ba / 2, {
    tamanho: m.compacto ? 10 : 12, cor: qtd > 0 ? pal.css('tinta') : pal.css('suave'),
    espaco: 1.6, alinhar: 'center',
  });
  if (qtd > 0) zona('rax:vender', bx, by, bl, ba, { variedade: id });
}
