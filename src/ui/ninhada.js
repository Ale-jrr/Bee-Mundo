import { retanguloArredondado, pilula, rotulo, numero, FONTE } from '../render/desenho.js';
import { zona } from './zonas.js';
import { medidas } from './layout.js';
import { NINHADA } from '../sim/economia.js';
import { TALENTOS } from '../sim/talentos.js';
import { geometriaFavo, centroDaCelula } from '../render/favo.js';

// Balão de alimentar a ninhada: aparece ao tocar num ovo. Cada pote de mel
// adianta um pedaço da eclosão, então esperar é grátis e ter pressa custa —
// e o mel gasto aqui é mel que não vai pra RAX.
//
// Aqui também se **encomenda o pendor** do ovo. O sorteio de nascimento
// continua sendo o padrão; isto é a saída pra quando ele não deu o que a
// colmeia precisa — tipicamente uma guardiã antes de a vespa chegar.

const OPCOES = [1, 5];
const PENDORES = ['coleta', 'producao', 'defesa'];

export function desenharNinhada(ctx, estado, pal, L, A, ui = {}) {
  const celula = ui.ovoSelecionado && estado.celulas[ui.ovoSelecionado];
  if (!celula || celula.estado !== 'ovo') return;

  const m = medidas(L, A);
  const g = geometriaFavo(estado, L, A, ui.camera);
  const p = centroDaCelula(celula, g.cx, g.cy, g.tam);

  const l = Math.min(252, L - m.margem * 2);
  const a = 232;
  const ovos = celula.ovos ?? [{ id: 1, cura: celula.cura }];
  const selecionado = ovos.find((o) => o.id === ui.ovoIndividual) ?? ovos[0];
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
    ctx.fillStyle = ovo.id === selecionado.id ? pal.css('cheia') : pal.css('escuro', 0.12);
    ctx.fill();
    // Ponto da cor do pendor encomendado: dá pra ver qual ovo já tem dono
    // sem precisar selecionar um por um.
    if (ovo.pendor && TALENTOS[ovo.pendor]) {
      ctx.beginPath();
      ctx.arc(bx + 8, y + 55, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = TALENTOS[ovo.pendor].cor;
      ctx.fill();
    }
    rotulo(ctx, `${ovo.id}: ${Math.floor(ovo.cura * 100)}%`, bx + (largura - 4) / 2, y + 63, {
      tamanho: 9, cor: pal.css('tinta'), alinhar: 'center', espaco: 0,
    });
    zona('ninhada:selecionar', bx, y + 48, largura - 4, 30, { id: ovo.id });
  });

  const mel = Object.values(estado.pote).reduce((n, v) => n + Math.floor(v), 0);
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

  // ------------------------------------------------------------- pendor
  const jaTem = selecionado.pendor && TALENTOS[selecionado.pendor];
  rotulo(ctx, jaTem ? `vai nascer ${TALENTOS[selecionado.pendor].nome}` : `pendor · ${NINHADA.custoPendor} mel`,
    x + 16, y + 142, {
      tamanho: 9, cor: jaTem ? TALENTOS[selecionado.pendor].cor : pal.css('suave'), espaco: 1.8,
    });

  const podePagar = mel >= NINHADA.custoPendor;
  const lp = (l - 32 - 12) / PENDORES.length;
  PENDORES.forEach((id, i) => {
    const bx = x + 16 + i * (lp + 6);
    const by = y + 156;
    const escolhido = selecionado.pendor === id;
    const ativo = podePagar && !escolhido;

    pilula(ctx, bx, by, lp, 44);
    ctx.fillStyle = escolhido ? TALENTOS[id].cor
      : podePagar ? pal.css('escuro', 0.1) : pal.css('escuro', 0.05);
    ctx.fill();

    if (!escolhido) {
      ctx.beginPath();
      ctx.arc(bx + lp / 2, by + 13, 4, 0, Math.PI * 2);
      ctx.fillStyle = TALENTOS[id].cor;
      ctx.globalAlpha = podePagar ? 1 : 0.4;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.save();
    ctx.font = `700 9px ${FONTE}`;
    ctx.fillStyle = escolhido ? '#fff3d0' : podePagar ? pal.css('tinta') : pal.css('suave');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(TALENTOS[id].nome, bx + lp / 2, by + (escolhido ? 22 : 31), lp - 6);
    ctx.restore();

    if (ativo) zona('ninhada:pendor', bx, by, lp, 44, { chave: ui.ovoSelecionado, pendor: id, ovo: selecionado.id });
  });

  const adianto = Math.round(NINHADA.avancoPorMel * 100);
  rotulo(ctx, mel > 0 ? `${mel} no pote · 1 mel = ${adianto}%` : 'pote vazio', x + l / 2, y + a - 12, {
    tamanho: 9, cor: pal.css('suave'), espaco: 1.4, alinhar: 'center',
  });
}
