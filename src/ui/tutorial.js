import { retanguloArredondado, pilula, rotulo, barra, FONTE } from '../render/desenho.js';
import { zona } from './zonas.js';
import { medidas } from './layout.js';
import { tutorialAtivo } from '../sim/tutorial.js';

const ALERTA = '#b8484a';

// Cartão do tutorial. Fica no rodapé e é desenhado **por último**, acima de
// qualquer painel: o passo costuma pedir justamente que o jogador abra um
// painel, então a instrução não pode sumir atrás dele.
//
// Não bloqueia o toque em nada além de si mesmo — o jogador precisa mexer no
// jogo para cumprir o passo.
export function desenharTutorial(ctx, estado, pal, L, A, ui = {}) {
  const passo = tutorialAtivo(estado);
  if (!passo) return;

  const m = medidas(L, A);
  const { esc } = m;
  const pad = Math.max(14, Math.round(18 * esc));
  const hTitulo = Math.max(16, Math.round(20 * esc));
  const hLinha = Math.max(15, Math.round(17 * esc));
  const hBotao = Math.max(m.toque * 0.78, Math.round(38 * esc));
  const gap = Math.max(8, Math.round(10 * esc));

  // Alerta do passo: o que deu errado agora, se deu. Entra no cálculo da
  // altura antes de qualquer desenho, senão o texto vaza do cartão.
  const alerta = (passo.alerta ? passo.alerta(estado) : null) ?? [];

  const l = Math.min(460, L - m.margem * 2);
  const a = pad + hTitulo + gap + passo.linhas.length * hLinha
    + (alerta.length ? gap + alerta.length * hLinha : 0)
    + gap + hBotao + pad;
  const x = Math.round((L - l) / 2);
  // Acima da fileira de ações, que é o que vários passos mandam tocar.
  const y = Math.round(A - m.margem - m.acao - gap - a);

  ctx.save();
  ctx.shadowColor = pal.css('sombra', 0.34);
  ctx.shadowBlur = 24 * esc;
  ctx.shadowOffsetY = 6 * esc;
  retanguloArredondado(ctx, x, y, l, a, Math.round(22 * esc));
  ctx.fillStyle = pal.css('hud', 0.98);
  ctx.fill();
  ctx.restore();
  zona('tutorial:cartao', x, y, l, a);

  let cursor = y + pad;
  rotulo(ctx, passo.titulo, x + pad, cursor + hTitulo / 2, {
    tamanho: m.rotulo, cor: pal.css('suave'), espaco: 2.6,
  });
  rotulo(ctx, `${passo.indice + 1} de ${passo.total}`, x + l - pad, cursor + hTitulo / 2, {
    tamanho: Math.max(8, 9 * esc), cor: pal.css('suave'), espaco: 1.4, alinhar: 'right',
  });
  cursor += hTitulo;

  // Barrinha de progresso do tutorial: dá a medida de quanto falta, que é o
  // que faz alguém aceitar seguir até o fim.
  barra(ctx, x + pad, cursor + Math.round(2 * esc), l - pad * 2, Math.max(4, Math.round(5 * esc)),
    (passo.indice + 1) / passo.total, pal.css('escuro', 0.14), pal.css('cheia'));
  cursor += gap;

  ctx.save();
  ctx.font = `400 ${Math.max(11, Math.round(13 * esc))}px ${FONTE}`;
  ctx.fillStyle = pal.css('tinta');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const linha of passo.linhas) {
    ctx.fillText(linha, x + pad, cursor + hLinha / 2, l - pad * 2);
    cursor += hLinha;
  }
  ctx.restore();

  if (alerta.length) {
    cursor += gap;
    ctx.save();
    ctx.font = `600 ${Math.max(11, Math.round(13 * esc))}px ${FONTE}`;
    ctx.fillStyle = ALERTA;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (const linha of alerta) {
      ctx.fillText(linha, x + pad, cursor + hLinha / 2, l - pad * 2);
      cursor += hLinha;
    }
    ctx.restore();
  }
  cursor += gap;

  if (passo.tipo === 'leitura') {
    pilula(ctx, x + pad, cursor, l - pad * 2, hBotao);
    ctx.fillStyle = pal.css('cheia');
    ctx.fill();
    rotulo(ctx, 'entendi', x + l / 2, cursor + hBotao / 2, {
      tamanho: Math.max(10, 12 * esc), cor: pal.css('tinta'), espaco: 2.4, alinhar: 'center',
    });
    zona('tutorial:entendi', x + pad, cursor, l - pad * 2, hBotao);
  } else {
    // Passo de ação não tem botão: ele se resolve quando o jogador faz o que
    // foi pedido. O que fica no lugar é a saída, para ninguém ficar preso.
    pilula(ctx, x + pad, cursor, l - pad * 2, hBotao);
    ctx.fillStyle = pal.css('escuro', 0.07);
    ctx.fill();
    rotulo(ctx, 'faça isso para continuar · pular tutorial', x + l / 2, cursor + hBotao / 2, {
      tamanho: Math.max(9, 10 * esc), cor: pal.css('suave'), espaco: 1.6, alinhar: 'center',
    });
    zona('tutorial:pular', x + pad, cursor, l - pad * 2, hBotao);
  }
}
