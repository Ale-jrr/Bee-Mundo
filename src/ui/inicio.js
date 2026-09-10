import { retanguloArredondado, pilula, rotulo, numero, caminhoHex, FONTE } from '../render/desenho.js';
import { zona } from './zonas.js';
import { medidas } from './layout.js';
import { desenharChips, alturaDosChips } from './desafios.js';
import { DESAFIO_PADRAO } from '../sim/desafios.js';
import { relogio } from '../sim/estacoes.js';
import { ler as lerConquistas } from '../core/conquistas.js';
import { mudo } from '../render/som.js';
import { META } from '../sim/economia.js';

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

  const pad = Math.max(18, Math.round(26 * m.esc));
  const hBotao = Math.max(m.toque, Math.round(48 * m.esc));
  const gap = Math.max(10, Math.round(12 * m.esc));

  const l = Math.min(420, L - m.margem * 2);
  const a = pad + Math.round(96 * m.esc)              // marca
    + (podeContinuar ? hBotao + gap : 0)
    + hBotao + gap
    + hBotao + gap                                   // tutorial
    + Math.round(22 * m.esc) + alturaDosChips()       // desafios
    + gap + Math.round(34 * m.esc)                    // som
    + Math.round(26 * m.esc) + pad;                   // rodapé
  const x = (L - l) / 2;
  const y = Math.max(m.margem, (A - a) / 2);

  retanguloArredondado(ctx, x, y, l, a, 30);
  ctx.fillStyle = pal.css('hud', 0.98);
  ctx.fill();
  zona('inicio:cartao', x, y, l, a);

  let cursor = y + pad;
  cursor = desenharMarca(ctx, pal, m, x, cursor, l);

  if (podeContinuar) {
    const t = relogio(estado.decorrido);
    pilula(ctx, x + pad, cursor, l - pad * 2, hBotao);
    ctx.fillStyle = pal.css('cheia');
    ctx.fill();
    rotulo(ctx, 'continuar', x + l / 2, cursor + hBotao * 0.36, {
      tamanho: Math.max(11, 13 * m.esc), cor: pal.css('tinta'), espaco: 2.4, alinhar: 'center',
    });
    rotulo(ctx, `ano ${estado.ano} · ${t.estacao.nome.toLowerCase()} · ${estado.abelhas.length} abelhas`,
      x + l / 2, cursor + hBotao * 0.74, {
        tamanho: Math.max(8, 9 * m.esc), cor: pal.css('tinta'), espaco: 1.2, alinhar: 'center',
      });
    zona('inicio:continuar', x + pad, cursor, l - pad * 2, hBotao);
    cursor += hBotao + gap;
  }

  pilula(ctx, x + pad, cursor, l - pad * 2, hBotao);
  ctx.fillStyle = podeContinuar ? pal.css('escuro', 0.1) : pal.css('cheia');
  ctx.fill();
  rotulo(ctx, podeContinuar ? 'novo jogo (apaga o atual)' : 'começar',
    x + l / 2, cursor + hBotao / 2, {
      tamanho: Math.max(11, 13 * m.esc), cor: pal.css('tinta'), espaco: 2.4, alinhar: 'center',
    });
  zona('inicio:novo', x + pad, cursor, l - pad * 2, hBotao);
  cursor += hBotao + gap;

  // O tutorial vem logo abaixo de começar: quem chega sem saber precisa
  // encontrá-lo antes de decidir qualquer outra coisa.
  pilula(ctx, x + pad, cursor, l - pad * 2, hBotao);
  ctx.fillStyle = pal.css('escuro', 0.08);
  ctx.fill();
  rotulo(ctx, 'tutorial · aprender jogando', x + l / 2, cursor + hBotao / 2, {
    tamanho: Math.max(10, 12 * m.esc), cor: pal.css('tinta'), espaco: 2, alinhar: 'center',
  });
  zona('inicio:tutorial', x + pad, cursor, l - pad * 2, hBotao);
  cursor += hBotao + gap;

  rotulo(ctx, 'desafio da próxima partida', x + pad, cursor + Math.round(10 * m.esc), {
    tamanho: Math.max(9, 10 * m.esc), cor: pal.css('suave'), espaco: 2.2,
  });
  cursor += Math.round(22 * m.esc);
  cursor += desenharChips(ctx, pal, x + pad, cursor, l - pad * 2,
    ui.desafioEscolhido ?? DESAFIO_PADRAO, 'inicio:desafio');
  cursor += gap;

  const hSom = Math.round(34 * m.esc);
  pilula(ctx, x + pad, cursor, l - pad * 2, hSom);
  ctx.fillStyle = pal.css('escuro', 0.08);
  ctx.fill();
  rotulo(ctx, mudo() ? 'som: desligado' : 'som: ligado', x + l / 2, cursor + hSom / 2, {
    tamanho: Math.max(9, 10 * m.esc), cor: pal.css('tinta'), espaco: 2, alinhar: 'center',
  });
  zona('inicio:som', x + pad, cursor, l - pad * 2, hSom);
  cursor += hSom + Math.round(6 * m.esc);

  // Rodapé: o que a colmeia já provou. Sem isso, quem perde no Ano 6 não tem
  // nenhum registro de ter chegado lá.
  const marca = conquistas.venceu
    ? `colmeia vencedora · sobreviveu aos ${META.anoFinal} anos`
    : conquistas.melhorAno > 1
      ? `melhor até agora: ano ${conquistas.melhorAno} de ${META.anoFinal}`
      : `sobreviva a ${META.anoFinal} anos`;
  rotulo(ctx, marca, x + l / 2, cursor + Math.round(14 * m.esc), {
    tamanho: Math.max(8, 9 * m.esc), cor: pal.css('suave'), espaco: 1.6, alinhar: 'center',
  });
}

// Marca do jogo: três hexágonos e o nome. Devolve onde o conteúdo continua.
function desenharMarca(ctx, pal, m, x, y, l) {
  const r = Math.round(20 * m.esc);
  const cx = x + l / 2;
  const cy = y + r + Math.round(6 * m.esc);

  const favo = [[0, 0], [-1.74, -1], [1.74, -1]];
  favo.forEach(([dx, dy], i) => {
    ctx.beginPath();
    caminhoHex(ctx, cx + dx * r, cy + dy * r, r * 0.92);
    ctx.fillStyle = i === 0 ? pal.css('cheia') : pal.css('aro');
    ctx.fill();
  });

  ctx.save();
  ctx.font = `700 ${Math.round(38 * m.esc)}px ${FONTE}`;
  ctx.fillStyle = pal.css('tinta');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('COLMEIA', cx, cy + r * 2.4, l - 40);
  ctx.restore();

  rotulo(ctx, 'um apiário em nove anos', cx, cy + r * 3.4, {
    tamanho: Math.max(8, 10 * m.esc), cor: pal.css('suave'), espaco: 2.4, alinhar: 'center',
  });

  return y + Math.round(96 * m.esc);
}
