import { retanguloArredondado, pilula, rotulo, numero } from '../render/desenho.js';
import { zona } from './zonas.js';
import { medidas, colunas } from './layout.js';
import { BENCAOS, nivelBencao, totalBencao, textoDaBencao } from '../sim/bencaos.js';

// Escolha da primavera: três cartas, uma decisão, jogo parado. É a única tela
// modal do jogo fora de vitória e derrota, e é modal justamente porque o
// jogador não pode "deixar pra depois" — a bênção vale o ano inteiro.
export function desenharEscolha(ctx, estado, pal, L, A) {
  const escolha = estado.escolha;
  if (!escolha || !escolha.opcoes?.length) return;

  const m = medidas(L, A);
  const { esc } = m;

  ctx.fillStyle = 'rgba(30, 22, 10, 0.62)';
  ctx.fillRect(0, 0, L, A);
  zona('bencao:fundo', 0, 0, L, A);

  const n = escolha.opcoes.length;
  const espaco = Math.round(14 * esc);
  const larguraCarta = colunas(Math.min(820, L - m.margem * 2), n, espaco, 150);
  // Em tela estreita as cartas empilham: três colunas de 100 px não dão alvo
  // de toque nem espaço pro texto do efeito.
  const empilhado = !larguraCarta;

  // A altura da carta larga vem somada, não de um total mágico: com 190*esc os
  // pips caíam debaixo do botão, que tem alvo mínimo de toque e não encolhe
  // junto com o texto.
  const pad = Math.max(12, Math.round(18 * esc));
  const hNome = Math.max(18, Math.round(26 * esc));
  const hResumo = Math.max(14, Math.round(20 * esc));
  const hPips = Math.max(12, Math.round(18 * esc));
  const hBotao = Math.max(m.toque, Math.round(40 * esc));

  const cl = empilhado ? Math.min(420, L - m.margem * 2) : larguraCarta;
  // A carta larga reserva duas linhas depois do resumo: os pips e, quando a
  // bênção já foi escolhida antes, quanto ela já rende.
  const ca = empilhado
    ? Math.max(m.toque + 24, Math.round(76 * esc))
    : pad + hNome + hResumo + hPips * 2 + pad + hBotao + pad;
  const total = empilhado ? n * ca + (n - 1) * espaco : ca;
  const topo = Math.round((A - total) / 2) + Math.round(18 * esc);

  rotulo(ctx, 'primavera · escolha o rumo do ano', L / 2, topo - Math.round(30 * esc), {
    tamanho: Math.max(11, 13 * esc), cor: '#fff3d0', espaco: 3, alinhar: 'center',
  });

  escolha.opcoes.forEach((oferta, i) => {
    // A oferta traz o valor sorteado junto: a mesma carta pode sair 9% numa
    // primavera e 15% na outra, e é o número que o jogador está comparando.
    const id = oferta.id ?? oferta;
    const regra = BENCAOS[id];
    if (!regra) return;
    const resumo = textoDaBencao(id, oferta.valor ?? regra.min);
    const jaTem = totalBencao(estado, id);
    const x = empilhado ? (L - cl) / 2 : (L - (cl * n + espaco * (n - 1))) / 2 + i * (cl + espaco);
    const y = empilhado ? topo + i * (ca + espaco) : topo;

    retanguloArredondado(ctx, x, y, cl, ca, Math.round(22 * esc));
    ctx.fillStyle = pal.css('hud', 0.98);
    ctx.fill();

    if (empilhado) {
      rotulo(ctx, regra.nome, x + pad, y + ca * 0.36, {
        tamanho: Math.max(11, 13 * esc), cor: pal.css('tinta'), espaco: 1.6,
      });
      rotulo(ctx, resumo, x + pad, y + ca * 0.68, {
        tamanho: Math.max(9, 10 * esc), cor: pal.css('suave'), espaco: 1.2,
      });
      desenharPips(ctx, pal, estado, id, x + cl - pad, y + ca * 0.36, esc, 'right');
    } else {
      let cursor = y + pad;
      rotulo(ctx, regra.nome, x + cl / 2, cursor + hNome / 2, {
        tamanho: Math.max(11, 14 * esc), cor: pal.css('tinta'), espaco: 1.8, alinhar: 'center',
      });
      cursor += hNome;
      rotulo(ctx, resumo, x + cl / 2, cursor + hResumo / 2, {
        tamanho: Math.max(9, 11 * esc), cor: pal.css('tinta'), espaco: 1.2, alinhar: 'center',
      });
      cursor += hResumo;
      // O que já foi acumulado nessa carta, pra repetir ser decisão informada.
      if (jaTem > 0) {
        rotulo(ctx, `já tem ${Math.round(jaTem * 100)}%`, x + cl / 2, cursor + hPips / 2, {
          tamanho: Math.max(8, 9 * esc), cor: pal.css('suave'), espaco: 1.2, alinhar: 'center',
        });
        cursor += hPips;
        desenharPips(ctx, pal, estado, id, x + cl / 2, cursor + hPips / 2, esc, 'center');
      } else {
        cursor += hPips;
        desenharPips(ctx, pal, estado, id, x + cl / 2, cursor - hPips / 2, esc, 'center');
      }
      cursor += hPips + pad;

      pilula(ctx, x + pad, cursor, cl - pad * 2, hBotao);
      ctx.fillStyle = pal.css('cheia');
      ctx.fill();
      rotulo(ctx, 'escolher', x + cl / 2, cursor + hBotao / 2, {
        tamanho: Math.max(9, 11 * esc), cor: pal.css('tinta'), espaco: 2, alinhar: 'center',
      });
    }

    // A carta inteira é o alvo: no empilhado não há botão separado, e no modo
    // largo clicar na carta é o que o jogador tenta antes de mirar no botão.
    zona('bencao:escolher', x, y, cl, ca, { id });
  });
}

// Pips do nível já conquistado, pra escolher repetido ser uma decisão
// informada em vez de descoberta depois.
function desenharPips(ctx, pal, estado, id, x, y, esc, alinhar) {
  const nivel = nivelBencao(estado, id);
  const max = BENCAOS[id].max_nivel;
  const r = Math.max(3, 4 * esc);
  const passo = r * 3;
  const largura = passo * (max - 1);
  const inicio = alinhar === 'center' ? x - largura / 2 : x - largura;

  for (let i = 0; i < max; i++) {
    ctx.beginPath();
    ctx.arc(inicio + i * passo, y, r, 0, Math.PI * 2);
    ctx.fillStyle = i < nivel ? pal.css('cheia') : pal.css('escuro', 0.18);
    ctx.fill();
  }
}
