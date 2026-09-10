import { pilula, rotulo } from '../render/desenho.js';
import { zona } from './zonas.js';

// Cartões que aparecem sozinhos — inverno, enxame, formigas, encomenda, vespa —
// não podem ser só fechados: a informação neles continua valendo enquanto o
// aviso durar. Então eles **minimizam**: viram uma pílula com o título e o
// número que importa, e um toque devolve o cartão inteiro.
//
// O estado de aberto/fechado vive na `ui`, não no jogo: é enquadramento, igual
// à câmera, e não deve ir para o save nem sobreviver a um recomeço.

export function estaMinimizado(ui, id) {
  return Boolean(ui?.minimizados?.[id]);
}

export function alternarMinimizado(ui, id) {
  if (!ui) return;
  ui.minimizados = { ...(ui.minimizados ?? {}) };
  ui.minimizados[id] = !ui.minimizados[id];
}

// Largura que o cartão precisa deixar livre no canto de cima à direita para o
// botão não cair em cima do número do título.
export function recuoDoBotao(m) {
  return Math.max(28, Math.round(30 * m.esc)) + Math.round(8 * m.esc);
}

// Botão de minimizar no canto superior direito do cartão. Um traço, não um X:
// o cartão não vai embora, encolhe.
export function botaoMinimizar(ctx, pal, m, x, y, l, id) {
  const lado = Math.max(28, Math.round(30 * m.esc));
  const bx = x + l - lado - Math.round(6 * m.esc);
  const by = y + Math.round(6 * m.esc);

  ctx.save();
  ctx.strokeStyle = pal.css('suave');
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx + lado * 0.3, by + lado / 2);
  ctx.lineTo(bx + lado * 0.7, by + lado / 2);
  ctx.stroke();
  ctx.restore();

  // A área tocável é maior que o traço: no dedo, 30 px de alvo é o mínimo.
  zona('cartao:alternar', bx - 4, by - 4, lado + 8, lado + 8, { id });
}

// A pílula que substitui o cartão minimizado. Devolve o rodapé dela, para a
// coluna continuar empilhando o que vem depois.
export function pilulaMinimizada(ctx, pal, m, x, y, l, id, texto, cor) {
  const a = Math.max(m.toque * 0.66, Math.round(30 * m.esc));

  ctx.save();
  ctx.shadowColor = pal.css('sombra', 0.16);
  ctx.shadowBlur = 10 * m.esc;
  ctx.shadowOffsetY = 2 * m.esc;
  pilula(ctx, x, y, l, a);
  ctx.fillStyle = pal.css('hud', 0.92);
  ctx.fill();
  ctx.restore();

  // Fita da cor do cartão na ponta esquerda: é o que deixa distinguir enxame
  // de formiga de encomenda sem ler.
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + a / 2, y + a / 2, a * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = cor;
  ctx.fill();
  ctx.restore();

  rotulo(ctx, texto, x + a, y + a / 2, {
    tamanho: Math.max(9, 10 * m.esc), cor: pal.css('tinta'), espaco: 1.4,
  });
  rotulo(ctx, '+', x + l - Math.round(14 * m.esc), y + a / 2, {
    tamanho: Math.max(12, 14 * m.esc), cor: pal.css('suave'), espaco: 1, alinhar: 'right',
  });

  zona('cartao:alternar', x, y, l, a, { id });
  return y + a;
}
