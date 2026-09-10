import { retanguloArredondado, pilula, rotulo, numero } from '../render/desenho.js';
import { zona } from './zonas.js';
import { medidas } from './layout.js';
import { relogio } from '../sim/estacoes.js';
import { DESAFIOS, DESAFIO_PADRAO, nomeDoDesafio } from '../sim/desafios.js';

// Menu. Pequeno de propósito: só o que o jogador precisa poder fazer fora do
// jogo — ver que o progresso está salvo e recomeçar.
export function desenharMenu(ctx, estado, pal, L, A, ui = {}) {
  ctx.fillStyle = 'rgba(30, 22, 10, 0.55)';
  ctx.fillRect(0, 0, L, A);
  zona('menu:fundo', 0, 0, L, A);

  const m = medidas(L, A);
  const l = Math.min(420, L - m.margem * 2);
  const ids = Object.keys(DESAFIOS);
  const alturaChip = 46;
  const linhasChip = Math.ceil(ids.length / 2);
  // O bloco de desafios cresce com o catálogo: acrescentar um quinto desafio
  // não pode empurrar o botão pra fora do cartão.
  const a = Math.min(A - m.margem * 2, 330 + linhasChip * (alturaChip + 8));
  const x = (L - l) / 2;
  const y = (A - a) / 2;

  retanguloArredondado(ctx, x, y, l, a, 28);
  ctx.fillStyle = pal.css('hud', 0.98);
  ctx.fill();
  zona('menu:cartao', x, y, l, a);

  rotulo(ctx, 'colmeia', x + 26, y + 34, { tamanho: 13, cor: pal.css('suave'), espaco: 3 });

  const t = relogio(estado.decorrido);
  const linhas = [
    ['ano', String(estado.ano)],
    ['estação', t.estacao.nome],
    ['abelhas', String(estado.abelhas.length)],
    ['desafio', nomeDoDesafio(estado)],
  ];
  linhas.forEach(([nome, valor], i) => {
    const ly = y + 76 + i * 30;
    rotulo(ctx, nome, x + 26, ly, { tamanho: 11, cor: pal.css('suave'), espaco: 1.8 });
    numero(ctx, valor, x + l - 26, ly, { tamanho: 16, cor: pal.css('tinta'), alinhar: 'right' });
  });

  rotulo(ctx, textoDoSave(ui), x + l / 2, y + 208, {
    tamanho: 10, cor: pal.css('suave'), espaco: 1.6, alinhar: 'center',
  });

  // Desafios: escolhidos antes de recomeçar, não no meio da partida. Trocar a
  // regra com o jogo em curso invalidaria o ano que o jogador já jogou.
  const escolhido = ui.desafioEscolhido ?? estado.desafio ?? DESAFIO_PADRAO;
  rotulo(ctx, 'próxima partida', x + 26, y + 240, {
    tamanho: 11, cor: pal.css('suave'), espaco: 2.2,
  });

  const chipL = (l - 52 - 8) / 2;
  ids.forEach((id, i) => {
    const cx = x + 26 + (i % 2) * (chipL + 8);
    const cy = y + 258 + Math.floor(i / 2) * (alturaChip + 8);
    const ativo = id === escolhido;
    pilula(ctx, cx, cy, chipL, alturaChip);
    ctx.fillStyle = ativo ? pal.css('cheia') : pal.css('escuro', 0.08);
    ctx.fill();
    rotulo(ctx, DESAFIOS[id].nome, cx + chipL / 2, cy + 17, {
      tamanho: 10, cor: ativo ? pal.css('tinta') : pal.css('suave'),
      espaco: 1.4, alinhar: 'center',
    });
    rotulo(ctx, DESAFIOS[id].resumo, cx + chipL / 2, cy + 32, {
      tamanho: 8, cor: ativo ? pal.css('tinta') : pal.css('suave'),
      espaco: 1, alinhar: 'center',
    });
    zona('menu:desafio', cx, cy, chipL, alturaChip, { id });
  });

  // Recomeçar apaga o save, então pede confirmação em dois toques em vez de
  // uma caixa de diálogo.
  const confirmando = ui.confirmandoNovoJogo;
  const bl = l - 52, bx = x + 26, by = y + a - 66;
  pilula(ctx, bx, by, bl, 44);
  ctx.fillStyle = confirmando ? '#b8484a' : pal.css('escuro', 0.1);
  ctx.fill();
  rotulo(ctx, confirmando ? 'apagar tudo e recomeçar?' : 'novo jogo', bx + bl / 2, by + 22, {
    tamanho: 11, cor: confirmando ? '#fff' : pal.css('tinta'), espaco: 2.2, alinhar: 'center',
  });
  zona('menu:novo', bx, by, bl, 44);

  const fx = x + l - 40, fy = y + 16;
  ctx.strokeStyle = pal.css('suave');
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(fx, fy); ctx.lineTo(fx + 16, fy + 16);
  ctx.moveTo(fx + 16, fy); ctx.lineTo(fx, fy + 16);
  ctx.stroke();
  zona('menu:fechar', fx - 14, fy - 14, 44, 44);
}

function textoDoSave(ui) {
  if (ui.saveFalhou) return 'não foi possível salvar neste navegador';
  if (!ui.salvoEm) return 'salvando automaticamente';
  const seg = Math.max(0, Math.round((Date.now() - ui.salvoEm) / 1000));
  if (seg < 5) return 'salvo agora';
  if (seg < 60) return `salvo há ${seg} s`;
  return `salvo há ${Math.round(seg / 60)} min`;
}
