import { pilula, retanguloArredondado, rotulo } from '../render/desenho.js';
import { zona } from './zonas.js';
import { medidas } from './layout.js';
import { ZOOM } from '../render/favo.js';

// Controles da vista. Dois botões de zoom encostados na borda direita e, quando
// a vista sai do lugar, o botão de centralizar no meio.
//
// Os botões existem em toda tela, não só no celular: no PC a roda do mouse faz
// o mesmo, mas nada na tela diria que dá pra aproximar se eles não estivessem
// aqui. É a mesma razão do botão de centralizar — o duplo clique é gesto de
// mouse e não existe no dedo.
export function desenharCamera(ctx, pal, L, A, ui = {}) {
  const camera = ui.camera;
  if (!camera || ui.painel) return;

  const m = medidas(L, A);
  desenharZoom(ctx, pal, m, camera);
  desenharCentralizar(ctx, pal, m, camera);
}

function desenharZoom(ctx, pal, m, camera) {
  const { L, A, esc, margem, acao } = m;
  const lado = Math.max(m.toque, Math.round(46 * esc));
  const gap = Math.round(8 * esc);
  const x = L - margem - lado;
  // Empilhados logo acima da fileira de ações, que é o canto que o polegar
  // alcança sem cobrir o favo.
  const base = A - margem - acao - gap;

  const zoom = camera.zoom ?? 1;
  const botoes = [
    { id: 'camera:mais', glifo: '+', y: base - lado * 2 - gap, pode: zoom < ZOOM.max - 0.001 },
    { id: 'camera:menos', glifo: '−', y: base - lado, pode: zoom > ZOOM.min + 0.001 },
  ];

  for (const b of botoes) {
    ctx.save();
    ctx.shadowColor = pal.css('sombra', 0.2);
    ctx.shadowBlur = 10 * esc;
    ctx.shadowOffsetY = 3 * esc;
    retanguloArredondado(ctx, x, b.y, lado, lado, Math.round(14 * esc));
    ctx.fillStyle = pal.css('hud', b.pode ? 0.95 : 0.5);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.font = `700 ${Math.round(lado * 0.5)}px sans-serif`;
    ctx.fillStyle = b.pode ? pal.css('tinta') : pal.css('suave', 0.6);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.glifo, x + lado / 2, b.y + lado / 2 + 1);
    ctx.restore();

    // A zona é registrada mesmo no limite: sem ela o toque atravessaria pro
    // favo que está atrás do botão.
    zona(b.id, x, b.y, lado, lado);
  }
}

function desenharCentralizar(ctx, pal, m, camera) {
  const movida = Math.abs(camera.x) >= 1 || Math.abs(camera.y) >= 1
    || Math.abs((camera.zoom ?? 1) - 1) >= 0.01;
  if (!movida) return;

  const { L, A, esc, margem, acao } = m;
  const l = Math.round(Math.max(118, 132 * esc));
  const a = Math.max(m.toque * 0.72, Math.round(34 * esc));
  const x = Math.round((L - l) / 2);
  const y = Math.round(A - margem - acao - Math.round(10 * esc) - a);

  ctx.save();
  ctx.shadowColor = pal.css('sombra', 0.22);
  ctx.shadowBlur = 12 * esc;
  ctx.shadowOffsetY = 3 * esc;
  pilula(ctx, x, y, l, a);
  ctx.fillStyle = pal.css('hud', 0.95);
  ctx.fill();
  ctx.restore();

  rotulo(ctx, 'centralizar', x + l / 2, y + a / 2, {
    tamanho: Math.max(9, 10 * esc), cor: pal.css('tinta'), espaco: 1.8, alinhar: 'center',
  });
  zona('camera:centrar', x, y, l, a);
}
