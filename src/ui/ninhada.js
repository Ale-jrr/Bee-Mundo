import { retanguloArredondado, pilula, rotulo, numero } from '../render/desenho.js';
import { zona } from './zonas.js';
import { medidas } from './layout.js';
import { NINHADA } from '../sim/economia.js';
import { geometriaFavo, centroDaCelula } from '../render/favo.js';
import { totalNoPote } from '../sim/acoes.js';

// Balão de alimentar a ninhada: aparece ao tocar num ovo. Cada pote de mel
// adianta um pedaço da eclosão, então esperar é grátis e ter pressa custa —
// e o mel gasto aqui é mel que não vai pra RAX.

const OPCOES = [1, 5];

export function desenharNinhada(ctx, estado, pal, L, A, ui = {}) {
  const celula = ui.ovoSelecionado && estado.celulas[ui.ovoSelecionado];
  if (!celula || celula.estado !== 'ovo') return;

  const m = medidas(L, A);
  const g = geometriaFavo(estado, L, A);
  const p = centroDaCelula(celula, g.cx, g.cy, g.tam);

  const l = Math.min(216, L - m.margem * 2);
  const a = 148;
  const ovos = celula.ovos ?? [{ id: 1, cura: celula.cura }];
  const selecionado = ovos.find(o => o.id === ui.ovoIndividual) ?? ovos[0];
  // Acima da célula quando cabe; abaixo quando o ovo está no topo do favo.
  const acima = p.y - g.tam - a - 12 > m.margem + m.barra;
  const x = Math.min(Math.max(m.margem, p.x - l / 2), L - m.margem - l);
  const y = Math.max(m.margem, Math.min(A - a - m.margem, acima ? p.y - g.tam - a - 12 : p.y + g.tam + 12));

  ctx.save();
  ctx.shadowColor = pal.css('sombra', 0.3);
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;
  retanguloArredondado(ctx, x, y, l, a, 18);
  ctx.fillStyle = pal.css('hud', 0.98);
  ctx.fill();
  ctx.restore();
  zona('ninhada:cartao', x, y, l, a);

  rotulo(ctx, `ovo ${selecionado.id}`, x + 16, y + 20, {
    tamanho: 10, cor: pal.css('suave'), espaco: 2.2,
  });
  numero(ctx, `${Math.round(selecionado.cura * 100)}%`, x + l - 16, y + 20, {
    tamanho: 14, cor: pal.css('tinta'), alinhar: 'right',
  });

  // Barra de eclosão
  pilula(ctx, x + 16, y + 32, l - 32, 8);
  ctx.fillStyle = pal.css('escuro', 0.16);
  ctx.fill();
  if (selecionado.cura > 0) {
    pilula(ctx, x + 16, y + 32, Math.max(8, (l - 32) * selecionado.cura), 8);
    ctx.fillStyle = pal.css('cheia');
    ctx.fill();
  }

  ovos.forEach((ovo, i) => {
    const largura = (l - 32) / ovos.length;
    const bx = x + 16 + i * largura;
    pilula(ctx, bx, y + 48, largura - 4, 30);
    ctx.fillStyle = ovo.id === selecionado.id ? pal.css('cheia') : pal.css('escuro', 0.12); ctx.fill();
    rotulo(ctx, `${ovo.id}: ${Math.floor(ovo.cura*100)}%`, bx+(largura-4)/2, y+63, { tamanho:9, cor:pal.css('tinta'), alinhar:'center', espaco:0 });
    zona('ninhada:selecionar', bx, y+48, largura-4, 30, { id:ovo.id });
  });
  const mel = Object.values(estado.pote).reduce((n,v)=>n+Math.floor(v),0);
  const largura = (l - 32 - 8) / OPCOES.length;
  OPCOES.forEach((n, i) => {
    const bx = x + 16 + i * (largura + 8);
    const by = y + 88;
    const pode = mel >= 1;
    pilula(ctx, bx, by, largura, 38);
    ctx.fillStyle = pode ? pal.css('cheia') : pal.css('escuro', 0.12);
    ctx.fill();
    rotulo(ctx, n === 1 ? 'dar 1 mel' : `dar ${n} mel`, bx + largura / 2, by + 19, {
      tamanho: 10, cor: pode ? pal.css('tinta') : pal.css('suave'),
      espaco: 1.6, alinhar: 'center',
    });
    if (pode) zona('ninhada:alimentar', bx, by, largura, 38, { chave: ui.ovoSelecionado, potes: n, ovo: selecionado.id });
  });

  const adianto = Math.round(NINHADA.avancoPorMel * 100);
  rotulo(ctx, mel > 0 ? `${mel} no pote · 1 mel = ${adianto}%` : 'pote vazio', x + l / 2, y + a - 12, {
    tamanho: 9, cor: pal.css('suave'), espaco: 1.4, alinhar: 'center',
  });
}
