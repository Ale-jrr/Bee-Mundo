import { retanguloArredondado, pilula, rotulo, caminhoHex, FONTE } from '../render/desenho.js';
import { zona } from './zonas.js';
import { medidas } from './layout.js';
import { desenharChips, alturaDosChips } from './desafios.js';
import {
  DESAFIO_PADRAO, DURACOES, DURACAO_PADRAO, DIFICULDADES, DIFICULDADE_PADRAO,
} from '../sim/desafios.js';
import { BIOMAS, BIOMA_PADRAO, ESPECIES } from '../sim/biomas.js';
import { relogio } from '../sim/estacoes.js';
import { ler as lerConquistas } from '../core/conquistas.js';
import { mudo } from '../render/som.js';

// Tela de início. Faz três coisas que nenhuma outra tela fazia:
//
//   1. deixa o jogador decidir entre continuar e recomeçar antes de o relógio
//      andar — antes o jogo já estava correndo quando a página abria;
//   2. mostra o desafio da próxima partida **antes** dela começar, que é o
//      único momento em que a escolha tem sentido;
//   3. dá o primeiro toque na tela, que é o que a política de autoplay do
//      navegador exige para o som poder existir.
//
// O favo continua desenhado atrás, parado: é a colmeia esperando.
export function desenharInicio(ctx, estado, pal, L, A, ui = {}) {
  const m = medidas(L, A);
  const conquistas = lerConquistas();
  const podeContinuar = Boolean(ui.temSave) && !estado.derrota && !estado.vitoria;

  ctx.fillStyle = 'rgba(30, 22, 10, 0.62)';
  ctx.fillRect(0, 0, L, A);
  zona('inicio:fundo', 0, 0, L, A);

  // O cartão se mede inteiro antes de desenhar qualquer coisa, e encolhe junto
  // se não couber na tela. Antes cada bloco calculava a própria altura por
  // conta: a marca reservava 96·esc e desenhava o subtítulo em 94·esc, com o
  // título ocupando até 93·esc — o nome do jogo saía por cima do subtítulo.
  // O título e o rodapé falam da duração escolhida, não de um nove fixo:
  // escolher "curta" e continuar lendo "nove anos" é a tela mentindo.
  const anos = DURACOES[ui.duracaoEscolhida ?? DURACAO_PADRAO]?.anos
    ?? DURACOES[DURACAO_PADRAO].anos;

  const cabe = A - m.margem * 2;
  let d = medir(m, m.esc, podeContinuar);
  if (d.a > cabe) d = medir(m, m.esc * (cabe / d.a), podeContinuar);

  const l = Math.min(420, L - m.margem * 2);
  const x = (L - l) / 2;
  const y = Math.max(m.margem, (A - d.a) / 2);

  retanguloArredondado(ctx, x, y, l, d.a, 30);
  ctx.fillStyle = pal.css('hud', 0.98);
  ctx.fill();
  zona('inicio:cartao', x, y, l, d.a);

  let cursor = desenharMarca(ctx, pal, { ...d, subtitulo: `um apiário em ${anos} anos` },
    x, y + d.pad, l) + d.gap + d.respiro;

  if (podeContinuar) {
    const t = relogio(estado.decorrido);
    pilula(ctx, x + d.pad, cursor, l - d.pad * 2, d.hBotao);
    ctx.fillStyle = pal.css('cheia');
    ctx.fill();
    rotulo(ctx, 'continuar', x + l / 2, cursor + d.hBotao * 0.36, {
      tamanho: Math.max(11, 13 * d.esc), cor: pal.css('tinta'), espaco: 2.4, alinhar: 'center',
    });
    rotulo(ctx, `ano ${estado.ano} · ${t.estacao.nome.toLowerCase()} · ${estado.abelhas.length} abelhas`,
      x + l / 2, cursor + d.hBotao * 0.74, {
        tamanho: Math.max(8, 9 * d.esc), cor: pal.css('tinta'), espaco: 1.2, alinhar: 'center',
      });
    zona('inicio:continuar', x + d.pad, cursor, l - d.pad * 2, d.hBotao);
    cursor += d.hBotao + d.gap;
  }

  pilula(ctx, x + d.pad, cursor, l - d.pad * 2, d.hBotao);
  ctx.fillStyle = podeContinuar ? pal.css('escuro', 0.1) : pal.css('cheia');
  ctx.fill();
  rotulo(ctx, podeContinuar ? 'novo jogo (apaga o atual)' : 'começar',
    x + l / 2, cursor + d.hBotao / 2, {
      tamanho: Math.max(11, 13 * d.esc), cor: pal.css('tinta'), espaco: 2.4, alinhar: 'center',
    });
  zona('inicio:novo', x + d.pad, cursor, l - d.pad * 2, d.hBotao);
  cursor += d.hBotao + d.gap;

  // O tutorial vem logo abaixo de começar: quem chega sem saber precisa
  // encontrá-lo antes de decidir qualquer outra coisa.
  pilula(ctx, x + d.pad, cursor, l - d.pad * 2, d.hBotao);
  ctx.fillStyle = pal.css('escuro', 0.08);
  ctx.fill();
  rotulo(ctx, 'tutorial · aprender jogando', x + l / 2, cursor + d.hBotao / 2, {
    tamanho: Math.max(10, 12 * d.esc), cor: pal.css('tinta'), espaco: 2, alinhar: 'center',
  });
  zona('inicio:tutorial', x + d.pad, cursor, l - d.pad * 2, d.hBotao);
  cursor += d.hBotao + d.gap + d.respiro;

  // O bioma vem primeiro: é o que muda o jogo de verdade — campos, clima e
  // espécie — e as outras escolhas se leem em cima dele. O rótulo mostra a
  // abelha junto, porque escolher caatinga é escolher jandaira.
  const biomaAtual = BIOMAS[ui.biomaEscolhido ?? BIOMA_PADRAO] ?? BIOMAS[BIOMA_PADRAO];
  rotulo(ctx, `bioma · ${ESPECIES[biomaAtual.especie]?.nome ?? ''}`, x + d.pad, cursor + d.hRotulo / 2, {
    tamanho: Math.max(9, 10 * d.esc), cor: pal.css('suave'), espaco: 2.2,
  });
  cursor += d.hRotulo + d.respiro;
  cursor += desenharChips(ctx, pal, x + d.pad, cursor, l - d.pad * 2,
    ui.biomaEscolhido ?? BIOMA_PADRAO, 'inicio:bioma',
    { tabela: BIOMAS, colunas: 2, altura: 46, travado: () => false });
  cursor += d.respiro;

  rotulo(ctx, 'duração', x + d.pad, cursor + d.hRotulo / 2, {
    tamanho: Math.max(9, 10 * d.esc), cor: pal.css('suave'), espaco: 2.2,
  });
  cursor += d.hRotulo + d.respiro;
  cursor += desenharChips(ctx, pal, x + d.pad, cursor, l - d.pad * 2,
    ui.duracaoEscolhida ?? DURACAO_PADRAO, 'inicio:duracao',
    { tabela: DURACOES, colunas: 3, altura: 34, travado: () => false });
  cursor += d.respiro;

  rotulo(ctx, 'dificuldade', x + d.pad, cursor + d.hRotulo / 2, {
    tamanho: Math.max(9, 10 * d.esc), cor: pal.css('suave'), espaco: 2.2,
  });
  cursor += d.hRotulo + d.respiro;
  cursor += desenharChips(ctx, pal, x + d.pad, cursor, l - d.pad * 2,
    ui.dificuldadeEscolhida ?? DIFICULDADE_PADRAO, 'inicio:dificuldade',
    { tabela: DIFICULDADES, colunas: 4, altura: 34, travado: () => false });
  cursor += d.respiro;

  rotulo(ctx, 'desafio da próxima partida', x + d.pad, cursor, {
    tamanho: Math.max(9, 10 * d.esc), cor: pal.css('suave'), espaco: 2.2,
  });
  cursor += d.hRotulo + d.respiro;
  cursor += desenharChips(ctx, pal, x + d.pad, cursor, l - d.pad * 2,
    ui.desafioEscolhido ?? DESAFIO_PADRAO, 'inicio:desafio');
  cursor += d.gap;

  pilula(ctx, x + d.pad, cursor, l - d.pad * 2, d.hSom);
  ctx.fillStyle = pal.css('escuro', 0.08);
  ctx.fill();
  rotulo(ctx, mudo() ? 'som: desligado' : 'som: ligado', x + l / 2, cursor + d.hSom / 2, {
    tamanho: Math.max(9, 10 * d.esc), cor: pal.css('tinta'), espaco: 2, alinhar: 'center',
  });
  zona('inicio:som', x + d.pad, cursor, l - d.pad * 2, d.hSom);
  cursor += d.hSom + d.gap;

  // Rodapé: o que a colmeia já provou. Sem isso, quem perde no Ano 6 não tem
  // nenhum registro de ter chegado lá.
  const marca = conquistas.venceu
    ? `colmeia vencedora · sobreviveu aos ${anos} anos`
    : conquistas.melhorAno > 1
      ? `melhor até agora: ano ${conquistas.melhorAno} de ${anos}`
      : `sobreviva a ${anos} anos`;
  rotulo(ctx, marca, x + l / 2, cursor + d.tamSub / 2, {
    tamanho: d.tamSub, cor: pal.css('suave'), espaco: 1.6, alinhar: 'center',
  });
}

// Todas as medidas do cartão em um lugar só, para a altura total e o desenho
// nunca discordarem. Recebe `esc` de fora porque o cartão se remede menor
// quando não cabe na tela.
function medir(m, esc, podeContinuar) {
  const pad = Math.max(16, Math.round(24 * esc));
  const gap = Math.max(13, Math.round(18 * esc));
  const respiro = Math.max(9, Math.round(12 * esc));
  // O alvo de toque pode encolher um pouco em tela baixa, mas não sumir.
  const hBotao = Math.max(Math.round(m.toque * 0.86), Math.round(50 * esc));
  const hSom = Math.max(28, Math.round(36 * esc));
  const rHex = Math.max(12, Math.round(20 * esc));
  const tamTitulo = Math.max(24, Math.round(38 * esc));
  const tamSub = Math.max(8, Math.round(10 * esc));
  const hRotulo = Math.max(10, Math.round(12 * esc));

  // Os três hexágonos ocupam 2,84 raios de altura: o de cima está um raio
  // acima do centro e cada um se estende 0,92 raio para fora.
  const hMarca = Math.round(rHex * 2.84) + respiro + Math.round(6 * esc)
    + tamTitulo + respiro + Math.round(4 * esc) + tamSub;

  const a = pad + hMarca + gap + respiro
    + (podeContinuar ? hBotao + gap : 0)
    + hBotao + gap                                  // começar / novo jogo
    + hBotao + gap + respiro                        // tutorial
    + (hRotulo + respiro + alturaDosChips(4, 2, 46) + respiro)   // bioma
    + (hRotulo + respiro + alturaDosChips(3, 3, 34) + respiro)   // duração
    + (hRotulo + respiro + alturaDosChips(4, 4, 34) + respiro)   // dificuldade
    + hRotulo + respiro + alturaDosChips() + gap    // desafios
    + hSom + gap
    + tamSub + pad;                                 // rodapé

  return { esc, pad, gap, respiro, hBotao, hSom, rHex, tamTitulo, tamSub, hRotulo, hMarca, a };
}

// Marca do jogo: três hexágonos e o nome. Devolve onde o conteúdo continua.
function desenharMarca(ctx, pal, d, x, y, l) {
  const { rHex: r, tamTitulo, tamSub, respiro, esc } = d;
  const cx = x + l / 2;
  const cy = y + Math.round(r * 1.92);        // encosta o topo do agrupamento em y

  const favo = [[0, 0], [-1.74, -1], [1.74, -1]];
  favo.forEach(([dx, dy], i) => {
    ctx.beginPath();
    caminhoHex(ctx, cx + dx * r, cy + dy * r, r * 0.92);
    ctx.fillStyle = i === 0 ? pal.css('cheia') : pal.css('aro');
    ctx.fill();
  });

  const yTitulo = cy + Math.round(r * 0.92) + respiro + Math.round(6 * esc) + tamTitulo / 2;
  ctx.save();
  ctx.font = `700 ${tamTitulo}px ${FONTE}`;
  ctx.fillStyle = pal.css('tinta');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('COLMEIA', cx, yTitulo, l - d.pad * 2);
  ctx.restore();

  rotulo(ctx, d.subtitulo,
    cx, yTitulo + tamTitulo / 2 + respiro + Math.round(4 * esc) + tamSub / 2, {
      tamanho: tamSub, cor: pal.css('suave'), espaco: 2.4, alinhar: 'center',
    });

  return y + d.hMarca;
}
