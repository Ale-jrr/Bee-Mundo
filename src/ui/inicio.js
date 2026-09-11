import { retanguloArredondado, pilula, rotulo, caminhoHex, FONTE } from '../render/desenho.js';
import { zona } from './zonas.js';
import { medidas } from './layout.js';
import { desenharChips, alturaDosChips } from './desafios.js';
import {
  DESAFIO_PADRAO, DURACOES, DURACAO_PADRAO, DIFICULDADES, DIFICULDADE_PADRAO,
} from '../sim/desafios.js';
import { BIOMAS, BIOMA_PADRAO } from '../sim/biomas.js';
import { desenharCardsDeBioma, alturaDosCards } from './biomas.js';
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
// ## Por que ela é uma página, e não um cartão
//
// A primeira versão era uma coluna de 420px no meio da tela. Com quatro eixos
// de escolha, essa coluna não tinha como caber em altura — e a saída de
// encolher tudo, e no limite trocar os cards de bioma por chips, deixou a tela
// pequena e sem graça: o problema nunca foi sobrar conteúdo, foi **sobrar
// largura sem uso**. Numa tela de 1500px, 1000 deles eram véu escuro.
//
// Então são dois arranjos:
//
//   * **página** (tela larga): duas colunas. A marca e os botões à esquerda, as
//     quatro escolhas à direita, tudo em tamanho grande. O cartão cresce até
//     preencher a tela em vez de se encolher pra caber nela.
//   * **coluna** (celular): a pilha de sempre, que já funcionava.
//
// E o fundo é vidro, não parede: o favo e as abelhas continuam visíveis atrás,
// porque a colmeia esperando é o melhor plano de fundo que o jogo tem.

// Largura máxima em cada arranjo. Em duas colunas pode ser larga — é a largura
// que paga a altura.
const LARGURA_PAGINA = 1060;
const LARGURA_COLUNA = 470;
// A partir daqui as duas colunas cabem sem apertar nenhuma das duas.
const LARGURA_EM_DUAS = 880;
const ALTURA_EM_DUAS = 430;
// Acima disso o texto fica grande sem ficar melhor e as pílulas viram blocos.
export const ESC_MAX = 1.3;

export function desenharInicio(ctx, estado, pal, L, A, ui = {}) {
  const m = medidas(L, A);
  const conquistas = lerConquistas();
  const podeContinuar = Boolean(ui.temSave) && !estado.derrota && !estado.vitoria;

  // O título e o rodapé falam da duração escolhida, não de um nove fixo:
  // escolher "curta" e continuar lendo "nove anos" é a tela mentindo.
  const anos = DURACOES[ui.duracaoEscolhida ?? DURACAO_PADRAO]?.anos
    ?? DURACOES[DURACAO_PADRAO].anos;

  const p = ajustarAoEspaco(m, A - m.margem * 2, podeContinuar);
  const d = p.d;
  const x = Math.round((L - p.l) / 2);
  const y = Math.round(Math.max(m.margem, (A - p.a) / 2));

  desenharVeu(ctx, L, A);
  zona('inicio:fundo', 0, 0, L, A);

  // Vidro, e não parede: `hud` a 0,82 deixa ver o favo e as abelhas andando
  // atrás sem o texto perder contraste. O véu em gradiente por baixo é o que
  // segura essa leitura — chapado a 0,62, como era antes, a colmeia sumia.
  retanguloArredondado(ctx, x, y, p.l, p.a, Math.round(30 * d.esc));
  ctx.fillStyle = pal.css('hud', 0.82);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = pal.css('cheia', 0.45);
  ctx.stroke();
  zona('inicio:cartao', x, y, p.l, p.a);

  const xEsq = x + d.pad;
  const xDir = xEsq + (p.duasColunas ? p.lEsq + p.entre : 0);

  if (p.duasColunas) {
    const meio = Math.round(xEsq + p.lEsq + p.entre / 2);
    ctx.beginPath();
    ctx.moveTo(meio, y + d.pad * 1.5);
    ctx.lineTo(meio, y + p.a - d.pad * 1.5);
    ctx.strokeStyle = pal.css('suave', 0.2);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // ------------------------------------------- marca e botões
  let c = desenharMarca(ctx, pal, { ...d, subtitulo: `um apiário em ${anos} anos` },
    xEsq, y + d.pad, p.lEsq) + d.gapGrande;

  if (podeContinuar) {
    const t = relogio(estado.decorrido);
    desenharBotao(ctx, pal, d, xEsq, c, p.lEsq, 'continuar',
      `ano ${estado.ano} · ${t.estacao.nome.toLowerCase()} · ${estado.abelhas.length} abelhas`,
      pal.css('cheia'), 'inicio:continuar');
    c += d.hBotao + d.gap;
  }

  desenharBotao(ctx, pal, d, xEsq, c, p.lEsq,
    podeContinuar ? 'novo jogo (apaga o atual)' : 'começar', null,
    podeContinuar ? pal.css('escuro', 0.1) : pal.css('cheia'), 'inicio:novo');
  c += d.hBotao + d.gap;

  // O tutorial vem logo abaixo de começar: quem chega sem saber precisa
  // encontrá-lo antes de decidir qualquer outra coisa.
  desenharBotao(ctx, pal, d, xEsq, c, p.lEsq, 'tutorial · aprender jogando', null,
    pal.css('escuro', 0.08), 'inicio:tutorial');
  c += d.hBotao;

  // ------------------------------------------- as quatro escolhas
  const fim = desenharEscolhas(ctx, pal, d, p, xDir,
    p.duasColunas ? y + d.pad : c + d.gapGrande, ui);

  // ------------------------------------------- som e rodapé
  // Em duas colunas eles ancoram no pé da coluna da marca, que é onde um menu
  // de verdade põe as opções e a assinatura.
  const lBaixo = p.duasColunas ? p.lEsq : p.lDir;
  const xBaixo = p.duasColunas ? xEsq : xDir;
  let r = p.duasColunas ? y + p.a - d.pad - d.tamSub - d.gap - d.hSom : fim + d.gap;

  pilula(ctx, xBaixo, r, lBaixo, d.hSom);
  ctx.fillStyle = pal.css('escuro', 0.08);
  ctx.fill();
  rotulo(ctx, mudo() ? 'som: desligado' : 'som: ligado', xBaixo + lBaixo / 2, r + d.hSom / 2, {
    tamanho: Math.max(9, Math.round(10 * d.esc)), cor: pal.css('tinta'),
    espaco: 2, alinhar: 'center',
  });
  zona('inicio:som', xBaixo, r, lBaixo, d.hSom);
  r += d.hSom + d.gap;

  // Rodapé: o que a colmeia já provou. Sem isso, quem perde no Ano 6 não tem
  // nenhum registro de ter chegado lá.
  const marca = conquistas.venceu
    ? `colmeia vencedora · sobreviveu aos ${anos} anos`
    : conquistas.melhorAno > 1
      ? `melhor até agora: ano ${conquistas.melhorAno} de ${anos}`
      : `sobreviva a ${anos} anos`;
  rotulo(ctx, marca, xBaixo + lBaixo / 2, r + d.tamSub / 2, {
    tamanho: d.tamSub, cor: pal.css('suave'), espaco: 1.6, alinhar: 'center',
  });
}

// Véu em gradiente: claro no meio, onde está o favo, e escuro nas bordas. É o
// que deixa a colmeia aparecer atrás do cartão sem o texto perder contraste —
// um cinza chapado ou escondia o jogo ou deixava o cartão ilegível.
function desenharVeu(ctx, L, A) {
  const g = ctx.createRadialGradient(L / 2, A * 0.45, Math.min(L, A) * 0.08,
    L / 2, A * 0.45, Math.max(L, A) * 0.8);
  g.addColorStop(0, 'rgba(28, 20, 8, 0.24)');
  g.addColorStop(1, 'rgba(28, 20, 8, 0.6)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, L, A);
}

function desenharBotao(ctx, pal, d, x, y, l, texto, sub, cor, zonaId) {
  pilula(ctx, x, y, l, d.hBotao);
  ctx.fillStyle = cor;
  ctx.fill();
  rotulo(ctx, texto, x + l / 2, y + (sub ? d.hBotao * 0.36 : d.hBotao / 2), {
    tamanho: Math.max(11, Math.round(13 * d.esc)), cor: pal.css('tinta'),
    espaco: 2.4, alinhar: 'center',
  });
  if (sub) {
    rotulo(ctx, sub, x + l / 2, y + d.hBotao * 0.74, {
      tamanho: Math.max(8, Math.round(9 * d.esc)), cor: pal.css('tinta'),
      espaco: 1.2, alinhar: 'center',
    });
  }
  zona(zonaId, x, y, l, d.hBotao);
}

// As quatro escolhas, na ordem em que importam. Devolve onde elas terminam.
function desenharEscolhas(ctx, pal, d, p, x, y, ui) {
  // O bioma vem primeiro: é o que muda o jogo de verdade — campos, clima e
  // espécie. Tem card próprio, com paisagem e características, porque duas
  // linhas de texto não davam conta de mostrar uma escolha desse tamanho.
  let c = desenharTitulo(ctx, pal, d, 'bioma', x, y);
  c += desenharCardsDeBioma(ctx, pal, x, c, p.lDir,
    ui.biomaEscolhido ?? BIOMA_PADRAO, 'inicio:bioma',
    { colunas: p.colunasBioma, altura: d.hCard });
  c += d.entreGrupos;

  c = desenharTitulo(ctx, pal, d, 'duração', x, c);
  c += desenharChips(ctx, pal, x, c, p.lDir, ui.duracaoEscolhida ?? DURACAO_PADRAO,
    'inicio:duracao', {
      tabela: DURACOES, colunas: 3, altura: d.hChipBaixo, esc: d.esc, travado: () => false,
    });
  c += d.entreGrupos;

  c = desenharTitulo(ctx, pal, d, 'dificuldade', x, c);
  c += desenharChips(ctx, pal, x, c, p.lDir, ui.dificuldadeEscolhida ?? DIFICULDADE_PADRAO,
    'inicio:dificuldade', {
      tabela: DIFICULDADES, colunas: 4, altura: d.hChipBaixo, esc: d.esc, travado: () => false,
    });
  c += d.entreGrupos;

  c = desenharTitulo(ctx, pal, d, 'desafio da próxima partida', x, c);
  c += desenharChips(ctx, pal, x, c, p.lDir, ui.desafioEscolhido ?? DESAFIO_PADRAO,
    'inicio:desafio', { altura: p.hDesafio, esc: d.esc });
  return c;
}

function desenharTitulo(ctx, pal, d, texto, x, y) {
  rotulo(ctx, texto, x, y + d.hRotulo / 2, {
    tamanho: Math.max(9, Math.round(10 * d.esc)), cor: pal.css('suave'), espaco: 2.2,
  });
  return y + d.hRotulo + d.respiro;
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
  ctx.fillText('COLMEIA', cx, yTitulo, l * 0.96);
  ctx.restore();

  rotulo(ctx, d.subtitulo,
    cx, yTitulo + tamTitulo / 2 + respiro + Math.round(4 * esc) + tamSub / 2, {
      tamanho: tamSub, cor: pal.css('suave'), espaco: 2.4, alinhar: 'center',
    });

  return y + d.hMarca;
}

// Escolhe o arranjo e a escala em que a tela usa o espaço que tem. Exportada
// porque isto já quebrou três vezes — título sobre subtítulo, cartão vazando
// por baixo, e o cartão encolhido a ponto de ficar feio — e só dá pra travar
// num teste se der pra chamar sem tela.
export function ajustarAoEspaco(m, cabe, podeContinuar) {
  let p = encaixar(m, cabe, podeContinuar, 2);
  // Não cabe nem no menor tamanho: põe os quatro biomas numa fileira, em pé. A
  // paisagem continua lá — era ela que a versão compacta antiga perdia, e é
  // metade do motivo de o card existir.
  if (p.a > cabe) p = encaixar(m, cabe, podeContinuar, 4);
  return p;
}


function encaixar(m, cabe, podeContinuar, colunasBioma) {
  let esc = m.esc;
  let p = plano(m, esc, podeContinuar, colunasBioma);

  // Encolhe iterando, e não num passo: as medidas têm piso (`Math.max`), então
  // a altura não é proporcional à escala e um único passo erra o alvo.
  for (let volta = 0; volta < 6 && p.a > cabe; volta++) {
    esc *= cabe / p.a;
    p = plano(m, esc, podeContinuar, colunasBioma);
  }

  // E cresce, que é a metade nova: sobrar 300px de altura e desenhar tudo
  // pequeno no meio foi exatamente a reclamação. Sobe até encostar no espaço
  // disponível ou no teto que a largura permite.
  for (let volta = 0; volta < 8; volta++) {
    if (p.a > cabe) break;
    const alvo = Math.min(esc * (cabe / p.a), tetoDaEscala(p));
    if (alvo <= esc + 0.005) break;
    const q = plano(m, alvo, podeContinuar, colunasBioma);
    if (q.a > cabe) break;
    esc = alvo;
    p = q;
  }
  return p;
}

// Até onde dá pra crescer sem o texto encostar na borda. O mais apertado da
// tela é o resumo do desafio, num chip de duas colunas: é ele que manda. Sem
// esse teto, tela muito alta e estreita crescia a fonte até o resumo sair.
function tetoDaEscala(p) {
  const chip = (p.lDir - 8) / 2;
  return Math.max(0.62, Math.min(ESC_MAX, chip / 140));
}

// Todas as medidas e os dois arranjos num lugar só, para a altura total e o
// desenho nunca discordarem. Recebe `esc` de fora porque o cartão se remede
// quando o espaço muda.
function plano(m, esc, podeContinuar, colunasBioma) {
  const d = medir(m, esc, podeContinuar);
  const duasColunas = m.L >= LARGURA_EM_DUAS && m.A >= ALTURA_EM_DUAS;
  const l = Math.min(duasColunas ? LARGURA_PAGINA : LARGURA_COLUNA, m.L - m.margem * 2);
  const interno = l - d.pad * 2;
  const entre = duasColunas ? Math.round(d.gap * 1.8) : 0;
  // A coluna da marca não passa de 400: botão largo demais vira barra, e o
  // nome do jogo já está grande o bastante no meio dela.
  const lEsq = duasColunas
    ? Math.round(Math.min(400, Math.max(250, interno * 0.36)))
    : interno;
  const lDir = duasColunas ? interno - lEsq - entre : interno;

  // No arranjo apertado o resumo do desafio sai junto com as características
  // do bioma: nele o que importa é o nome da opção continuar legível.
  const apertado = colunasBioma > 2;
  const hDesafio = apertado ? d.hChipBaixo : d.hChip;

  const grupo = (conteudo) => d.hRotulo + d.respiro + conteudo;
  const hEscolhas = grupo(alturaDosCards(4, colunasBioma, d.hCard)) + d.entreGrupos
    + grupo(alturaDosChips(3, 3, d.hChipBaixo)) + d.entreGrupos
    + grupo(alturaDosChips(4, 4, d.hChipBaixo)) + d.entreGrupos
    + grupo(alturaDosChips(4, 2, hDesafio));
  const hBaixo = d.hSom + d.gap + d.tamSub;
  const hMarcaEAcoes = d.hMarca + d.gapGrande + d.hAcoes;

  const a = duasColunas
    ? d.pad * 2 + Math.max(hMarcaEAcoes + d.gapGrande + hBaixo, hEscolhas)
    : d.pad * 2 + hMarcaEAcoes + d.gapGrande + hEscolhas + d.gap + hBaixo;

  return {
    d, esc, duasColunas, l, lEsq, lDir, entre, colunasBioma, hDesafio,
    hEscolhas, a,
    // Atalhos que os testes e o histórico leem direto do resultado.
    hBotao: d.hBotao, pad: d.pad, compacto: false,
  };
}

function medir(m, esc, podeContinuar) {
  const pad = Math.max(13, Math.round(24 * esc));
  const gap = Math.max(10, Math.round(18 * esc));
  const gapGrande = Math.round(gap * 1.5);
  const respiro = Math.max(6, Math.round(12 * esc));
  // O alvo de toque pode encolher um pouco em tela baixa, mas não sumir.
  const hBotao = Math.max(Math.round(m.toque * 0.86), Math.round(50 * esc));
  const hSom = Math.max(24, Math.round(36 * esc));
  const rHex = Math.max(12, Math.round(20 * esc));
  const tamTitulo = Math.max(20, Math.round(38 * esc));
  const tamSub = Math.max(8, Math.round(10 * esc));
  const hRotulo = Math.max(8, Math.round(12 * esc));
  // Chips e cards acompanham a escala. Enquanto tinham altura fixa, mudar a
  // escala quase não mudava o total — e o cartão passava da tela mesmo com o
  // ajuste ligado, que foi exatamente o bug.
  const hCard = Math.max(52, Math.round(84 * esc));
  const hChip = Math.max(28, Math.round(46 * esc));
  const hChipBaixo = Math.max(22, Math.round(34 * esc));

  // Os três hexágonos ocupam 2,84 raios de altura: o de cima está um raio
  // acima do centro e cada um se estende 0,92 raio para fora.
  const hMarca = Math.round(rHex * 2.84) + respiro + Math.round(6 * esc)
    + tamTitulo + respiro + Math.round(4 * esc) + tamSub;
  const hAcoes = (podeContinuar ? hBotao + gap : 0) + hBotao + gap + hBotao;

  return {
    esc, pad, gap, gapGrande, respiro, hBotao, hSom, rHex, tamTitulo, tamSub,
    hRotulo, hCard, hChip, hChipBaixo, entreGrupos: respiro, hMarca, hAcoes,
  };
}
