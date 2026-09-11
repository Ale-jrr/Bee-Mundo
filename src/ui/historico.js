import { retanguloArredondado, pilula, rotulo, numero, FONTE } from '../render/desenho.js';
import { zona, definirRecorte } from './zonas.js';
import { medidas } from './layout.js';
import { metaDoAno } from '../sim/economia.js';

// Histórico da colmeia. O estado já guardava um registro por ano encerrado —
// meta, vendido e se bateu — e a única coisa que lia isso eram as continhas de
// cera em volta do favo. Aqui ele vira o que sempre foi: a memória da partida,
// pro jogador ver se está ganhando folga ou perdendo terreno ano a ano.

const ALTURA_LINHA = 40;

export function desenharHistorico(ctx, estado, pal, L, A) {
  ctx.fillStyle = 'rgba(30, 22, 10, 0.55)';
  ctx.fillRect(0, 0, L, A);
  zona('historico:fundo', 0, 0, L, A);

  const m = medidas(L, A);
  const l = Math.min(460, L - m.margem * 2);
  const anos = estado.historico ?? [];
  const linhas = anos.length + 1;                 // + o ano em curso
  const a = Math.min(A - m.margem * 2, 150 + linhas * ALTURA_LINHA);
  const x = (L - l) / 2;
  const y = (A - a) / 2;

  retanguloArredondado(ctx, x, y, l, a, 28);
  ctx.fillStyle = pal.css('hud', 0.98);
  ctx.fill();
  zona('historico:cartao', x, y, l, a);

  rotulo(ctx, 'histórico', x + 26, y + 34, { tamanho: 13, cor: pal.css('suave'), espaco: 3 });
  rotulo(ctx, 'ano', x + 26, y + 66, { tamanho: 9, cor: pal.css('suave'), espaco: 1.6 });
  rotulo(ctx, 'meta', x + l * 0.5, y + 66, { tamanho: 9, cor: pal.css('suave'), espaco: 1.6, alinhar: 'right' });
  rotulo(ctx, 'vendido', x + l - 26, y + 66, { tamanho: 9, cor: pal.css('suave'), espaco: 1.6, alinhar: 'right' });

  const area = { x, y: y + 78, l, a: a - 78 - 52 };
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.l, area.a);
  ctx.clip();
  definirRecorte(area);

  let cursor = area.y + 6;
  for (const registro of anos) {
    linha(ctx, pal, x, cursor, l, registro.ano, registro.meta, registro.vendido, registro.bateu);
    cursor += ALTURA_LINHA;
  }
  // O ano em curso entra em cinza: é o único que ainda pode mudar, e é o que o
  // jogador quer comparar com os anteriores.
  linha(ctx, pal, x, cursor, l, estado.ano, metaDoAno(estado.ano, estado), estado.vendidoNoAno, null);

  definirRecorte(null);
  ctx.restore();

  const total = anos.reduce((soma, h) => soma + h.vendido, 0) + estado.vendidoNoAno;
  rotulo(ctx, `${Math.round(total)} vendidos desde o começo`, x + l / 2, y + a - 26, {
    tamanho: 10, cor: pal.css('suave'), espaco: 1.6, alinhar: 'center',
  });

  const fx = x + l - 40, fy = y + 16;
  ctx.strokeStyle = pal.css('suave');
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(fx, fy); ctx.lineTo(fx + 16, fy + 16);
  ctx.moveTo(fx + 16, fy); ctx.lineTo(fx, fy + 16);
  ctx.stroke();
  zona('historico:fechar', fx - 14, fy - 14, 44, 44);
}

// `bateu` nulo é o ano que ainda está correndo.
function linha(ctx, pal, x, y, l, ano, meta, vendido, bateu) {
  const emCurso = bateu === null;
  if (!emCurso) {
    pilula(ctx, x + 20, y, l - 40, ALTURA_LINHA - 6);
    ctx.fillStyle = bateu ? pal.css('cheia', 0.16) : 'rgba(184,72,74,0.16)';
    ctx.fill();
  }

  const meio = y + (ALTURA_LINHA - 6) / 2;
  rotulo(ctx, emCurso ? `ano ${ano} · agora` : `ano ${ano}`, x + 34, meio, {
    tamanho: 10, cor: emCurso ? pal.css('suave') : pal.css('tinta'), espaco: 1.6,
  });
  numero(ctx, String(Math.round(meta)), x + l * 0.5, meio, {
    tamanho: 13, cor: pal.css('suave'), alinhar: 'right',
  });
  numero(ctx, String(Math.round(vendido)), x + l - 34, meio, {
    tamanho: 14, cor: emCurso ? pal.css('tinta') : (bateu ? pal.css('tinta') : '#b8484a'),
    alinhar: 'right',
  });
}
