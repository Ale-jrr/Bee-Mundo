import { pilula, retanguloArredondado, rotulo, numero, barra, FONTE } from '../render/desenho.js';
import { SEGUNDOS_POR_ESTACAO } from '../sim/estacoes.js';
import { CLIMA, BOOSTS, metaDoAno } from '../sim/economia.js';
import { zona } from './zonas.js';
import { medidas, colunas, areaDoPote } from './layout.js';

export function desenharHud(ctx, estado, pal, t, L, A, ui = {}) {
  const m = medidas(L, A);
  desenharBarraSuperior(ctx, estado, pal, t, m);
  desenharClima(ctx, estado, pal, m);
  desenharPote(ctx, estado, pal, m);
  desenharAcoes(ctx, estado, pal, m);
  if (ui.painel === 'boosts') desenharBoosts(ctx, estado, pal, m);
}

// A barra flui das duas bordas para o meio: o bloco da esquerda e o da direita
// reservam o que precisam, e a faixa de estações fica com a sobra. Se a sobra
// for pequena demais, a faixa some em vez de invadir os vizinhos.
function desenharBarraSuperior(ctx, estado, pal, t, m) {
  const { L, esc, margem, barra: a, compacto } = m;
  const y = margem;

  ctx.save();
  ctx.shadowColor = pal.css('sombra', 0.18);
  ctx.shadowBlur = 18 * esc;
  ctx.shadowOffsetY = 4 * esc;
  pilula(ctx, margem, y, L - margem * 2, a);
  ctx.fillStyle = pal.css('hud', 0.62);
  ctx.fill();
  ctx.restore();

  const interno = Math.round(8 * esc);
  const altura = a - interno * 2;
  let esquerda = margem + interno;

  // Moedas
  const lMoeda = Math.round((compacto ? 104 : 148) * esc);
  pilula(ctx, esquerda, y + interno, lMoeda, altura);
  ctx.fillStyle = pal.css('cheia');
  ctx.fill();
  ctx.beginPath();
  ctx.arc(esquerda + altura / 2, y + a / 2, altura * 0.36, 0, Math.PI * 2);
  ctx.fillStyle = pal.css('aro');
  ctx.fill();
  numero(ctx, String(Math.floor(estado.moedas)), esquerda + altura * 0.95, y + a / 2, {
    tamanho: m.numero, cor: pal.css('tinta'),
  });
  zona('moedas', esquerda, y, lMoeda, a);
  esquerda += lMoeda + Math.round(10 * esc);

  // Meta do ano
  const meta = metaDoAno(estado.ano);
  const bateu = estado.vendidoNoAno >= meta;
  const lMeta = Math.round((compacto ? 108 : 168) * esc);
  pilula(ctx, esquerda, y + interno, lMeta, altura);
  ctx.fillStyle = bateu ? '#2f6b4f' : '#3a4a3e';
  ctx.fill();
  rotulo(ctx, bateu ? 'pronto' : `${Math.floor(estado.vendidoNoAno)}/${meta}`,
    esquerda + lMeta / 2, y + a / 2,
    { tamanho: m.rotulo, cor: '#e8f2e6', espaco: compacto ? 1.6 : 3, alinhar: 'center' });
  zona('meta', esquerda, y, lMeta, a);
  esquerda += lMeta;

  // Bloco da direita, montado de fora para dentro.
  let direita = L - margem - interno;

  const lMenu = Math.max(40, Math.round(46 * esc));
  ctx.strokeStyle = pal.css('tinta', 0.6);
  ctx.lineWidth = 3.2 * esc;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(direita - lMenu + 6 * esc, y + a / 2 - 8 * esc + i * 8 * esc);
    ctx.lineTo(direita - 6 * esc, y + a / 2 - 8 * esc + i * 8 * esc);
    ctx.stroke();
  }
  zona('menu', direita - lMenu, y, lMenu, a);
  direita -= lMenu + Math.round(6 * esc);

  // Nível: barra completa quando cabe, só o distintivo quando aperta.
  const lNivel = m.compacto ? altura : Math.round(200 * esc);
  pilula(ctx, direita - lNivel, y + interno, lNivel, altura);
  ctx.fillStyle = pal.css('hud', 0.9);
  ctx.fill();
  if (!m.compacto) {
    ctx.save();
    pilula(ctx, direita - lNivel + 2, y + interno + 2, lNivel - 4, altura - 4);
    ctx.clip();
    ctx.fillStyle = pal.css('cheia');
    ctx.fillRect(direita - lNivel, y + interno, (lNivel - 4) * ((estado.xp % 100) / 100), altura);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(direita - lNivel + altura / 2, y + a / 2, altura * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = pal.css('aro');
  ctx.fill();
  numero(ctx, String(estado.nivel), direita - lNivel + altura / 2, y + a / 2, {
    tamanho: Math.max(12, m.numero - 5), cor: pal.css('tinta'), alinhar: 'center',
  });
  direita -= lNivel + Math.round(8 * esc);

  // Pausa e avanço são dois alvos quando cada metade ainda dá um alvo tocável.
  // Quando não dá — celular, e também tablet em retrato — viram um só que cicla
  // pausado → normal → rápido. A decisão é pela largura resultante, não pelo
  // modo do layout: em 768 px o modo largo produzia metades de 31 px.
  const lVelocCheio = Math.round(100 * esc);
  const unico = compacto || lVelocCheio / 2 < 40;
  const lVeloc = unico ? Math.max(46, altura) : lVelocCheio;
  pilula(ctx, direita - lVeloc, y + interno, lVeloc, altura);
  ctx.fillStyle = pal.css('hud', 0.85);
  ctx.fill();

  const bl = 4 * esc, bh = 16 * esc;
  if (unico) {
    const meio = direita - lVeloc / 2;
    ctx.fillStyle = pal.css('tinta');
    if (estado.velocidade === 0) {
      seta(ctx, meio - 2 * esc, y + a / 2, esc * 1.2);
    } else if (estado.velocidade > 1) {
      seta(ctx, meio - 5 * esc, y + a / 2, esc);
      seta(ctx, meio + 5 * esc, y + a / 2, esc);
    } else {
      ctx.fillRect(meio - 6 * esc, y + a / 2 - bh / 2, bl, bh);
      ctx.fillRect(meio + 2 * esc, y + a / 2 - bh / 2, bl, bh);
    }
    zona('velocidade', direita - lVeloc, y, lVeloc, a);
  } else {
    const meio = direita - lVeloc / 2;
    ctx.fillStyle = pal.css('tinta', estado.velocidade === 0 ? 1 : 0.45);
    ctx.fillRect(meio - lVeloc / 4 - bl, y + a / 2 - bh / 2, bl, bh);
    ctx.fillRect(meio - lVeloc / 4 + 2 * esc, y + a / 2 - bh / 2, bl, bh);
    ctx.fillStyle = pal.css('tinta', estado.velocidade > 1 ? 1 : 0.45);
    seta(ctx, meio + lVeloc / 5 - 5 * esc, y + a / 2, esc);
    seta(ctx, meio + lVeloc / 5 + 5 * esc, y + a / 2, esc);
    zona('pausa', direita - lVeloc, y, lVeloc / 2, a);
    zona('rapido', direita - lVeloc / 2, y, lVeloc / 2, a);
  }
  direita -= lVeloc + Math.round(10 * esc);

  // O calendário nunca desaparece: em telas estreitas ganha uma linha própria.
  const sobra = direita - esquerda - Math.round(20 * esc);
  const separado = sobra < 260;
  m.faixaEstacaoExtra = separado ? 50 : 0;
  const fl = separado ? L - margem * 2 : Math.min(360, sobra);
  const fx = separado ? margem : esquerda + (direita - esquerda - fl) / 2;
  const fy = separado ? y + a + 5 : y + 3;
  const fa = separado ? 44 : a - 6;
  pilula(ctx, fx, fy, fl, fa);
  ctx.fillStyle = pal.css('hud', 0.85); ctx.fill();
  const restante = Math.ceil(t.restamSegundos);
  const passou = Math.min(SEGUNDOS_POR_ESTACAO, Math.floor(t.progresso * SEGUNDOS_POR_ESTACAO));
  const tempo = `${Math.floor(restante / 60)}:${String(restante % 60).padStart(2, '0')}`;
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = pal.css('tinta'); ctx.font = `700 ${compacto ? 13 : 14}px ${FONTE}`;
  ctx.fillText(`${t.estacao.nome} · faltam ${tempo}`, fx + fl / 2, fy + fa * 0.32, fl - 16);
  const ritmo = estado.velocidade === 0 ? 'pausado' : `${estado.velocidade}×`;
  ctx.font = `400 10px ${FONTE}`;
  ctx.fillText(`${passou}/${SEGUNDOS_POR_ESTACAO}s · próxima: ${t.proxima.nome} · ${ritmo}`, fx + fl / 2, fy + fa * 0.7, fl - 16);
  ctx.restore();
  zona('estacao', fx, fy, fl, fa);

}

function seta(ctx, x, y, esc) {
  ctx.beginPath();
  ctx.moveTo(x, y - 8 * esc);
  ctx.lineTo(x + 8 * esc, y);
  ctx.lineTo(x, y + 8 * esc);
  ctx.closePath();
  ctx.fill();
}

const MEDIDORES = [
  { chave: 'temperatura', unidade: '°C', casas: 1, curto: 'temp' },
  { chave: 'co2', unidade: 'ppm', casas: 0, curto: 'co₂' },
  { chave: 'umidade', unidade: '%', casas: 0, curto: 'umid' },
];

function desenharClima(ctx, estado, pal, m) {
  return m.compacto ? climaEmPilulas(ctx, estado, pal, m) : climaEmPainel(ctx, estado, pal, m);
}

// Telas largas: painel com barras e faixa ideal visível.
function climaEmPainel(ctx, estado, pal, m) {
  const { esc, margem } = m;
  const x = margem + 10 * esc;
  const y = margem + m.barra + 22 * esc + (m.faixaEstacaoExtra ?? 0);
  const l = Math.min(Math.round(350 * esc), m.L * 0.42);
  const a = Math.round(148 * esc);

  ctx.save();
  ctx.shadowColor = pal.css('sombra', 0.14);
  ctx.shadowBlur = 16 * esc;
  ctx.shadowOffsetY = 4 * esc;
  retanguloArredondado(ctx, x, y, l, a, 22 * esc);
  ctx.fillStyle = pal.css('hud', 0.5);
  ctx.fill();
  ctx.restore();

  rotulo(ctx, 'clima da colmeia', x + 22 * esc, y + 26 * esc, {
    tamanho: m.rotulo, cor: pal.css('suave'), espaco: 2.4,
  });

  MEDIDORES.forEach((med, i) => {
    const by = y + (52 + i * 34) * esc;
    const cfg = CLIMA[med.chave];
    const v = estado.clima[med.chave];
    ctx.beginPath();
    ctx.arc(x + 28 * esc, by + 8 * esc, 7 * esc, 0, Math.PI * 2);
    ctx.strokeStyle = pal.css('suave');
    ctx.lineWidth = 2;
    ctx.stroke();
    const lb = l - 172 * esc;
    barra(ctx, x + 48 * esc, by, lb, 15 * esc,
      (v - cfg.min) / (cfg.max - cfg.min), pal.css('escuro', 0.35), pal.css('cheia'));
    numero(ctx, `${v.toFixed(med.casas)} ${med.unidade}`, x + l - 22 * esc, by + 8 * esc, {
      tamanho: Math.max(12, 16 * esc), cor: pal.css('tinta'), alinhar: 'right',
    });
  });
  zona('clima', x, y, l, a);
}

// Telas estreitas: três pílulas em linha, sem barras. Cabe em 360 px.
function climaEmPilulas(ctx, estado, pal, m) {
  const { esc, margem, L } = m;
  const y = margem + m.barra + 8 * esc + (m.faixaEstacaoExtra ?? 0);
  const a = Math.max(m.toque * 0.78, Math.round(30 * esc));
  const espaco = 6 * esc;
  const largura = colunas(L - margem * 2, 3, espaco, 60);
  if (!largura) return;

  MEDIDORES.forEach((med, i) => {
    const x = margem + i * (largura + espaco);
    const v = estado.clima[med.chave];
    const cfg = CLIMA[med.chave];
    const fora = v < cfg.ideal[0] || v > cfg.ideal[1];

    pilula(ctx, x, y, largura, a);
    ctx.fillStyle = pal.css('hud', 0.62);
    ctx.fill();
    if (fora) {
      // Sem espaço pra barra, o aviso vira um traço na borda de baixo.
      pilula(ctx, x + largura * 0.2, y + a - 3 * esc, largura * 0.6, 3 * esc);
      ctx.fillStyle = '#b8484a';
      ctx.fill();
    }
    rotulo(ctx, med.curto, x + 10 * esc, y + a / 2, {
      tamanho: Math.max(8, 9 * esc), cor: pal.css('suave'), espaco: 1.2,
    });
    numero(ctx, v.toFixed(med.casas), x + largura - 10 * esc, y + a / 2, {
      tamanho: Math.max(11, 14 * esc), cor: pal.css('tinta'), alinhar: 'right',
    });
  });
  zona('clima', margem, y, L - margem * 2, a);
}

function desenharPote(ctx, estado, pal, m) {
  const { esc } = m;
  const { x, y, l, a } = areaDoPote(m);
  const total = Object.values(estado.pote).reduce((s, v) => s + v, 0);

  retanguloArredondado(ctx, x + l * 0.11, y + a * 0.12, l * 0.78, a * 0.8, 14 * esc);
  ctx.fillStyle = pal.css('hud', 0.9);
  ctx.fill();
  retanguloArredondado(ctx, x + l * 0.06, y, l * 0.88, a * 0.17, 8 * esc);
  ctx.fillStyle = '#8a6a3a';
  ctx.fill();

  const cheio = Math.min(1, total / 12);
  ctx.save();
  retanguloArredondado(ctx, x + l * 0.11, y + a * 0.12, l * 0.78, a * 0.8, 14 * esc);
  ctx.clip();
  ctx.fillStyle = pal.css('cheia', 0.95);
  ctx.fillRect(x + l * 0.11, y + a * 0.92 - a * 0.8 * cheio, l * 0.78, a * 0.8 * cheio);
  ctx.restore();

  rotulo(ctx, 'honey', x + l / 2, y + a * 0.42, {
    tamanho: Math.max(8, 11 * esc), cor: pal.css('suave'), espaco: 1.8, alinhar: 'center',
  });
  numero(ctx, total.toFixed(2).replace('.', ','), x + l / 2, y + a * 0.72, {
    tamanho: Math.max(15, 24 * esc), cor: pal.css('tinta'), alinhar: 'center',
  });
  zona('pote', x, y, l, a);
}

const ACOES = [
  { id: 'boosts', glifo: '⚡' },
  { id: 'mercado', glifo: '↗' },
  { id: 'campos', glifo: '✿' },
];

function desenharAcoes(ctx, estado, pal, m) {
  const { acao: a, margem, L, A, esc } = m;
  const espaco = Math.round(10 * esc);
  const y = A - a - margem;

  ACOES.forEach((item, i) => {
    const x = L - margem - (ACOES.length - i) * (a + espaco) + espaco;
    retanguloArredondado(ctx, x, y, a, a, m.raio);
    ctx.fillStyle = i === 0 ? pal.css('hud', 0.55) : pal.css('cheia');
    ctx.fill();
    ctx.save();
    ctx.font = `700 ${Math.round(a * 0.42)}px ${FONTE}`;
    ctx.fillStyle = i === 0 ? pal.css('cheia') : pal.css('escuro');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.glifo, x + a / 2, y + a / 2 + 2);
    ctx.restore();
    zona(item.id, x, y, a, a);
  });
}

// Fileira de boosts, logo acima dos botões de ação. Ocupa a largura toda e
// divide igualmente — com cinco boosts é o bloco que mais aperta em celular.
function desenharBoosts(ctx, estado, pal, m) {
  const { esc, margem, L, A, acao } = m;
  const itens = Object.entries(BOOSTS);
  const espaco = Math.round(6 * esc);
  const faixa = L - margem * 2;
  const l = colunas(faixa, itens.length, espaco, 54);
  if (!l) return;

  const a = Math.round((m.compacto ? 74 : 96) * esc);
  const y = A - acao - margem - a - Math.round(10 * esc);

  itens.forEach(([id, boost], i) => {
    const x = margem + i * (l + espaco);
    const podePagar = estado.moedas >= boost.custo;
    retanguloArredondado(ctx, x, y, l, a, m.raio * 0.9);
    ctx.fillStyle = pal.css('hud', podePagar ? 0.95 : 0.45);
    ctx.fill();

    const lp = Math.min(l - 12 * esc, 64 * esc);
    pilula(ctx, x + (l - lp) / 2, y + 8 * esc, lp, 22 * esc);
    ctx.fillStyle = pal.css('cheia');
    ctx.fill();
    numero(ctx, String(boost.custo), x + l / 2, y + 19 * esc, {
      tamanho: Math.max(11, 14 * esc), cor: pal.css('tinta'), alinhar: 'center',
    });

    // O nome quebra em até três linhas, dimensionadas pela largura disponível.
    const linhas = quebrar(ctx, boost.nome, l - 8 * esc, Math.max(8, 9.5 * esc));
    linhas.slice(0, 3).forEach((linha, k) => {
      rotulo(ctx, linha, x + l / 2, y + (40 + k * 13) * esc, {
        tamanho: Math.max(8, 9.5 * esc), cor: pal.css(podePagar ? 'tinta' : 'suave'),
        espaco: 1, alinhar: 'center',
      });
    });
    zona('boost:comprar', x, y, l, a, { id });
  });
}

function quebrar(ctx, texto, largura, tamanho) {
  ctx.save();
  ctx.font = `700 ${tamanho}px ${FONTE}`;
  const linhas = [];
  let atual = '';
  for (const palavra of texto.split(' ')) {
    const teste = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(teste.toUpperCase()).width > largura && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = teste;
    }
  }
  if (atual) linhas.push(atual);
  ctx.restore();
  return linhas;
}
