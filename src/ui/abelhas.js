import { retanguloArredondado, pilula, rotulo, numero, larguraRotulo, FONTE } from '../render/desenho.js';
import { zona } from './zonas.js';
import { medidas } from './layout.js';
import { TALENTOS, censo } from '../sim/talentos.js';

// Painel do elenco. A colônia já era um elenco por dentro — cada operária
// nasce com um pendor que muda o que ela faz melhor — mas o jogador só via um
// número na barra de cima ("12 abelhas") e uma linha perdida no painel de
// campos. Aqui ele vê **quem** tem e **onde** cada uma está.
//
// É o painel que faz perder uma abelha para a vespa doer: não morreu "uma
// abelha", morreu uma das suas três batedoras.

const ONDE = [
  ['colmeia', 'na colmeia', 'curando o favo e cuidando da ninhada'],
  ['campo', 'no campo', 'em viagem ou coletando'],
  ['guarda', 'na guarda', 'defendendo a entrada'],
  ['alugada', 'alugadas', 'trabalhando fora por moedas'],
];

const ORDEM = ['coleta', 'producao', 'defesa', 'comum'];

export function desenharAbelhas(ctx, estado, pal, L, A) {
  const c = censo(estado);
  const m = medidas(L, A);
  const { esc } = m;

  ctx.fillStyle = 'rgba(30, 22, 10, 0.55)';
  ctx.fillRect(0, 0, L, A);
  zona('abelhas:fundo', 0, 0, L, A);

  const pad = Math.max(18, Math.round(26 * esc));
  const hCabecalho = Math.round(50 * esc);
  const hLinha = Math.max(40, Math.round(52 * esc));
  const hOnde = Math.max(28, Math.round(34 * esc));
  const hSecao = Math.max(20, Math.round(26 * esc));
  const gapSecao = Math.max(12, Math.round(18 * esc));
  const hFechar = Math.max(m.toque, Math.round(46 * esc));
  const tamRotulo = Math.max(9, 10 * esc);
  const espRotulo = 1.8;

  const l = Math.min(460, L - m.margem * 2);
  // Altura contada bloco a bloco, incluindo o botão de fechar: antes ele era
  // desenhado solto no canto e caía em cima da última linha da lista.
  const a = Math.min(A - m.margem * 2,
    pad + hCabecalho
    + hSecao + ORDEM.length * hLinha
    + gapSecao + hSecao + ONDE.length * hOnde
    + gapSecao + hFechar + pad);
  const x = (L - l) / 2;
  const y = (A - a) / 2;

  retanguloArredondado(ctx, x, y, l, a, 28);
  ctx.fillStyle = pal.css('hud', 0.98);
  ctx.fill();
  zona('abelhas:cartao', x, y, l, a);

  let cursor = y + pad;
  rotulo(ctx, 'abelhas', x + pad, cursor + Math.round(8 * esc), {
    tamanho: Math.max(11, 13 * esc), cor: pal.css('suave'), espaco: 3,
  });
  rotulo(ctx, c.rainha ? `${c.operarias} operárias · 1 rainha` : `${c.operarias} operárias · sem rainha`,
    x + l - pad, cursor + Math.round(8 * esc), {
      tamanho: Math.max(9, 10 * esc), cor: pal.css('tinta'), espaco: 1.4, alinhar: 'right',
    });
  cursor += hCabecalho;

  rotulo(ctx, 'o que sabem fazer', x + pad, cursor, {
    tamanho: Math.max(8, 9 * esc), cor: pal.css('suave'), espaco: 2.2,
  });
  cursor += hSecao;

  for (const id of ORDEM) {
    const regra = TALENTOS[id];
    const quantas = c.talentos[id] ?? 0;

    ctx.save();
    ctx.globalAlpha = quantas === 0 ? 0.38 : 1;

    // Bolinha da cor do pendor: é como a abelha aparece no favo, então a
    // mesma cor liga a linha daqui à abelha que anda lá fora.
    ctx.beginPath();
    ctx.arc(x + pad + Math.round(9 * esc), cursor + hLinha * 0.38,
      Math.max(6, 8 * esc), 0, Math.PI * 2);
    ctx.fillStyle = regra?.cor ?? pal.css('suave');
    ctx.fill();

    const xTexto = x + pad + Math.round(30 * esc);
    rotulo(ctx, regra?.nome ?? 'sem pendor', xTexto, cursor + hLinha * 0.32, {
      tamanho: Math.max(10, 12 * esc), cor: pal.css('tinta'), espaco: 1.8,
    });
    frase(ctx, pal, regra?.resumo ?? 'Faz de tudo, sem se destacar em nada.',
      xTexto, cursor + hLinha * 0.68, l - pad * 2 - Math.round(70 * esc), esc);

    numero(ctx, String(quantas), x + l - pad, cursor + hLinha * 0.44, {
      tamanho: Math.max(15, 20 * esc), cor: pal.css('tinta'), alinhar: 'right',
    });
    ctx.restore();
    cursor += hLinha;
  }

  cursor += gapSecao;
  rotulo(ctx, 'onde estão agora', x + pad, cursor, {
    tamanho: Math.max(8, 9 * esc), cor: pal.css('suave'), espaco: 2.2,
  });
  cursor += hSecao;

  // A coluna da explicação começa depois do rótulo mais largo desta lista, e
  // não num offset chutado: "na colmeia" em caixa alta com espaçamento passa
  // de qualquer palpite, e a explicação entrava por cima dele.
  const colunaExplica = Math.max(...ONDE.map(
    ([, nome]) => larguraRotulo(ctx, nome, tamRotulo, espRotulo),
  )) + Math.round(16 * esc);

  for (const [id, nome, explica] of ONDE) {
    const quantas = c.onde[id] ?? 0;
    ctx.save();
    ctx.globalAlpha = quantas === 0 ? 0.38 : 1;
    rotulo(ctx, nome, x + pad, cursor + hOnde / 2, {
      tamanho: tamRotulo, cor: pal.css('tinta'), espaco: espRotulo,
    });
    frase(ctx, pal, explica, x + pad + colunaExplica, cursor + hOnde / 2,
      l - pad * 2 - colunaExplica - Math.round(34 * esc), esc);
    numero(ctx, String(quantas), x + l - pad, cursor + hOnde / 2, {
      tamanho: Math.max(12, 15 * esc), cor: pal.css('tinta'), alinhar: 'right',
    });
    ctx.restore();
    cursor += hOnde;
  }

  cursor += gapSecao;
  pilula(ctx, x + pad, cursor, l - pad * 2, hFechar);
  ctx.fillStyle = pal.css('escuro', 0.08);
  ctx.fill();
  rotulo(ctx, 'fechar', x + l / 2, cursor + hFechar / 2, {
    tamanho: Math.max(10, 12 * esc), cor: pal.css('tinta'), espaco: 2.4, alinhar: 'center',
  });
  zona('abelhas:fechar', x + pad, cursor, l - pad * 2, hFechar);
}

// Linha de explicação em caixa baixa. `maxWidth` do fillText condensa em vez
// de vazar, que é o que uma tela estreita precisa.
function frase(ctx, pal, texto, x, y, largura, esc) {
  ctx.save();
  ctx.font = `400 ${Math.max(9, Math.round(11 * esc))}px ${FONTE}`;
  ctx.fillStyle = pal.css('suave');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, x, y, Math.max(20, largura));
  ctx.restore();
}
