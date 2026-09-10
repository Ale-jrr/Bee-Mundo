import { retanguloArredondado, rotulo, larguraRotulo, FONTE } from '../render/desenho.js';
import { zona } from './zonas.js';
import { medidas } from './layout.js';
import { dicaAtiva } from '../sim/dicas.js';

// Cartão de dica. Fica no alto, centrado, logo abaixo do aviso.
//
// Dica de evento não pausa: a da florada explica uma coisa que está
// acontecendo agora, e parar a partida pra ler sobre ela seria contraditório.
// Dica de ação pausa — o jogador acabou de fazer algo pela primeira vez sem
// saber a regra, e o rodapé do cartão diz isso.
//
// Ela também é a única que continua visível com um painel aberto: escalar uma
// turma acontece **dentro** do painel de campos, e uma dica invisível com o
// relógio parado seria um travamento.
//
// Toque em qualquer lugar do cartão fecha. Não some sozinho por tempo: quem
// está lendo não deve perder a explicação no meio.
export function desenharDica(ctx, estado, pal, L, A, ui = {}) {
  const dica = dicaAtiva(estado);
  if (!dica) return;
  if (ui.painel && !dica.pausa) return;

  const m = medidas(L, A);
  const { esc } = m;
  const pad = Math.max(14, Math.round(20 * esc));
  const hTitulo = Math.max(16, Math.round(22 * esc));
  const hLinha = Math.max(15, Math.round(18 * esc));
  const hRodape = Math.max(14, Math.round(18 * esc));

  // O rodape e a linha mais larga do cartao, e a unica que nao passa por
  // maxWidth do fillText — medir e o que impede de cortar as duas pontas dele
  // em tela estreita, que foi o que aconteceu no retrato.
  const rodape = dica.pausa ? 'o jogo está parado · toque para continuar' : 'toque para fechar';
  let tamRodape = Math.max(9, 10 * esc);
  let espRodape = 1.8;
  const l = Math.min(
    Math.max(Math.round(400 * esc) + pad * 2,
      Math.ceil(larguraRotulo(ctx, rodape, tamRodape, espRodape)) + pad * 2),
    L - m.margem * 2,
  );
  const largo = larguraRotulo(ctx, rodape, tamRodape, espRodape);
  if (largo > l - pad * 2) {
    const f = (l - pad * 2) / largo;
    tamRodape = Math.max(7, tamRodape * f);
    espRodape *= f;
  }
  const a = pad + hTitulo + Math.round(6 * esc) + dica.linhas.length * hLinha
    + Math.round(6 * esc) + hRodape + pad;
  const x = Math.round((L - l) / 2);
  // Logo abaixo do aviso efêmero, que ocupa a faixa fixa dos 96 aos 136 px em
  // qualquer tela — encostado nele, o título da dica ficava por baixo. O
  // `max` protege caso a barra de cima cresça.
  const y = Math.max(146, m.margem + m.barra + Math.round(76 * esc));

  // Dica que pausa escurece o fundo: sem isso nada na tela conta que o
  // relógio parou, e o jogador fica tocando em botões que não respondem.
  if (dica.pausa) {
    ctx.fillStyle = 'rgba(30, 22, 10, 0.45)';
    ctx.fillRect(0, 0, L, A);
    zona('dica:fechar', 0, 0, L, A);
  }

  ctx.save();
  ctx.shadowColor = pal.css('sombra', 0.3);
  ctx.shadowBlur = 22 * esc;
  ctx.shadowOffsetY = 6 * esc;
  retanguloArredondado(ctx, x, y, l, a, Math.round(22 * esc));
  ctx.fillStyle = pal.css('hud', 0.98);
  ctx.fill();
  ctx.restore();

  // Fita da cor do mel na borda esquerda: marca o cartão como explicação, não
  // como mais um painel de número.
  ctx.save();
  retanguloArredondado(ctx, x, y, l, a, Math.round(22 * esc));
  ctx.clip();
  ctx.fillStyle = pal.css('cheia');
  ctx.fillRect(x, y, Math.max(4, Math.round(6 * esc)), a);
  ctx.restore();

  let cursor = y + pad;
  rotulo(ctx, dica.titulo, x + pad, cursor + hTitulo / 2, {
    tamanho: Math.max(11, 13 * esc), cor: pal.css('suave'), espaco: 3,
  });
  cursor += hTitulo + Math.round(6 * esc);

  ctx.save();
  ctx.font = `400 ${Math.max(11, Math.round(13 * esc))}px ${FONTE}`;
  ctx.fillStyle = pal.css('tinta');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const linha of dica.linhas) {
    ctx.fillText(linha, x + pad, cursor + hLinha / 2, l - pad * 2);
    cursor += hLinha;
  }
  ctx.restore();

  cursor += Math.round(6 * esc);
  rotulo(ctx, rodape, x + l / 2, cursor + hRodape / 2, {
    tamanho: tamRodape, cor: pal.css('suave'), espaco: espRodape, alinhar: 'center',
  });

  zona('dica:fechar', x, y, l, a);
}
