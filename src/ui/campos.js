import { retanguloArredondado, pilula, rotulo, numero, larguraRotulo, FONTE } from '../render/desenho.js';
import { zona, definirRecorte } from './zonas.js';
import { UPGRADES, VARIEDADES, custoUpgrade } from '../sim/economia.js';
import { statsComFlorada } from '../sim/floradas.js';
import { TALENTOS, elenco } from '../sim/talentos.js';
import { medidas, colunas } from './layout.js';

// Painel de campos. Duas turmas dividem os mesmos slots — néctar traz a
// matéria-prima, pólen permite transformá-la — então subir uma obriga a
// descer a outra. É a decisão central da tela.

const ALTURA_TRAVADO = 56;
const ESPACO = 14;

// Em tela larga o cartão usa duas colunas (turmas à esquerda, melhorias à
// direita). Em tela estreita tudo empilha e o cartão fica mais alto.
function alturaCartao(m) {
  return m.compacto ? 424 : 236;
}

export function desenharCampos(ctx, estado, pal, t, L, A, ui = {}) {
  ctx.fillStyle = 'rgba(30, 22, 10, 0.55)';
  ctx.fillRect(0, 0, L, A);
  zona('campos:fundo', 0, 0, L, A);

  const m = medidas(L, A);
  const x = m.margem, y = m.margem, l = L - m.margem * 2, a = A - m.margem * 2;
  retanguloArredondado(ctx, x, y, l, a, 28);
  ctx.fillStyle = pal.css('hud', 0.98);
  ctx.fill();
  zona('campos:cartao', x, y, l, a);

  desenharCabecalho(ctx, estado, pal, x, y, l, m);
  if (t.estacao.id === 'inverno') rotulo(ctx, 'inverno: coleta suspensa', x + l / 2, y + (m.compacto ? 54 : 70), { tamanho: 10, cor: '#b8484a', alinhar: 'center', espaco: 1 });

  if (t.estacao.id === 'outono') {
    ctx.save();
    ctx.font = `600 ${m.compacto ? 10 : 12}px ${FONTE}`;
    ctx.fillStyle = '#b8484a';
    ctx.textAlign = 'center';
    ctx.fillText('Use − para recolher: fora da colmeia no inverno, elas morrem.', x + l / 2, y + (m.compacto ? 54 : 70), l - 32);
    ctx.restore();
  }

  const abertos = estado.campos.filter((c) => estado.nivel >= c.nivelMin);
  const travados = estado.campos.filter((c) => estado.nivel < c.nivelMin);
  const alturaC = alturaCartao(m);
  const total = abertos.length * (alturaC + ESPACO)
    + travados.length * (ALTURA_TRAVADO + ESPACO);

  const topo = m.compacto ? 66 : 84;
  const area = { x: x + 14, y: y + topo, l: l - 28, a: a - topo - 16 };
  ui.rolagemMax = Math.max(0, total - area.a);
  const rolagem = Math.min(ui.rolagemCampos ?? 0, ui.rolagemMax);

  ctx.save();
  retanguloArredondado(ctx, area.x, area.y, area.l, area.a, 12);
  ctx.clip();
  definirRecorte(area);

  let cursor = area.y - rolagem;
  for (const campo of abertos) {
    desenharCampo(ctx, estado, pal, campo, area.x, cursor, area.l, m);
    cursor += alturaC + ESPACO;
  }
  for (const campo of travados) {
    desenharTravado(ctx, pal, campo, area.x, cursor, area.l);
    cursor += ALTURA_TRAVADO + ESPACO;
  }

  definirRecorte(null);
  ctx.restore();

  if (ui.rolagemMax > 0) desenharTrilho(ctx, pal, area, rolagem, ui.rolagemMax, total);

  const fx = x + l - 40, fy = y + 16;
  ctx.strokeStyle = pal.css('suave');
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(fx, fy); ctx.lineTo(fx + 16, fy + 16);
  ctx.moveTo(fx + 16, fy); ctx.lineTo(fx, fy + 16);
  ctx.stroke();
  zona('campos:fechar', fx - 14, fy - 14, 44, 44);
}

function desenharTrilho(ctx, pal, area, rolagem, maximo, total) {
  const tx = area.x + area.l + 6;
  pilula(ctx, tx, area.y, 5, area.a);
  ctx.fillStyle = pal.css('escuro', 0.1);
  ctx.fill();
  const alturaPolegar = Math.max(40, area.a * (area.a / total));
  const pos = area.y + (area.a - alturaPolegar) * (rolagem / maximo);
  pilula(ctx, tx, pos, 5, alturaPolegar);
  ctx.fillStyle = pal.css('suave', 0.6);
  ctx.fill();
}

function desenharCabecalho(ctx, estado, pal, x, y, l, m) {
  const operarias = estado.abelhas.filter((a) => a.papel === 'operaria');
  const contagens = [
    ['na colmeia', 'casa', operarias.filter((a) => a.estado === 'colmeia').length],
    ['néctar', 'néc', operarias.filter((a) => a.campo && a.recurso === 'nectar').length],
    ['pólen', 'pól', operarias.filter((a) => a.campo && a.recurso === 'polen').length],
    ['alugada', 'alug', operarias.filter((a) => a.estado === 'alugada').length],
  ];

  // Elenco por talento, logo abaixo das contagens: é o que transforma
  // "tenho 12 abelhas" em "tenho 3 batedoras" na hora de escalar as turmas.
  const time = elenco(estado);
  const ty = y + (m.compacto ? 52 : 72);
  let tx = x + (m.compacto ? 14 : 34);
  for (const [id, regra] of Object.entries(TALENTOS)) {
    if (!time[id]) continue;
    ctx.beginPath();
    ctx.arc(tx + 5, ty, 5, 0, Math.PI * 2);
    ctx.fillStyle = regra.cor;
    ctx.fill();
    rotulo(ctx, `${time[id]} ${regra.nome.toLowerCase()}`, tx + 15, ty + 1, {
      tamanho: 9, cor: pal.css('suave'), espaco: 1.2,
    });
    tx += 15 + larguraRotulo(ctx, `${time[id]} ${regra.nome.toLowerCase()}`, 9, 1.2) + 16;
  }

  const cy = y + (m.compacto ? 30 : 44);
  const lMoeda = m.compacto ? 92 : 130;
  let cx = x + (m.compacto ? 14 : 34);
  for (const [nome, curto, n] of contagens) {
    numero(ctx, String(n), cx, cy, { tamanho: m.compacto ? 16 : 24, cor: pal.css('tinta') });
    const largura = rotulo(ctx, m.compacto ? curto : nome, cx + (m.compacto ? 14 : 22), cy + 2, {
      tamanho: m.compacto ? 9 : 11, cor: pal.css('suave'), espaco: 1.4,
    });
    cx += (m.compacto ? 14 : 22) + largura + (m.compacto ? 14 : 30);
  }

  // Nível da colmeia: é o que destrava campo, então mora ao lado das moedas.
  if (!m.compacto) {
    rotulo(ctx, `nível ${estado.nivel}`, x + l - lMoeda - 76, cy + 2, {
      tamanho: 11, cor: pal.css('suave'), espaco: 2, alinhar: 'right',
    });
  }

  const mx = x + l - lMoeda - (m.compacto ? 44 : 60);
  pilula(ctx, mx, cy - 20, lMoeda, 40);
  ctx.fillStyle = pal.css('cheia');
  ctx.fill();
  ctx.beginPath();
  ctx.arc(mx + 22, cy, 13, 0, Math.PI * 2);
  ctx.fillStyle = pal.css('aro');
  ctx.fill();
  numero(ctx, String(Math.floor(estado.moedas)), mx + 42, cy, {
    tamanho: m.compacto ? 16 : 20, cor: pal.css('tinta'),
  });
}

function desenharCampo(ctx, estado, pal, campo, x, y, l, m) {
  const a = alturaCartao(m);
  const emFlor = (campo.florada ?? 0) > 0;
  retanguloArredondado(ctx, x, y, l, a, 22);
  ctx.fillStyle = emFlor ? pal.css('cheia', 0.18) : pal.css('escuro', 0.05);
  ctx.fill();
  // O cartão inteiro se acende na florada: os números da taxa e do néctar já
  // vêm multiplicados, e sem a moldura o jogador acharia que leu errado.
  if (emFlor) {
    retanguloArredondado(ctx, x, y, l, a, 22);
    ctx.strokeStyle = pal.css('cheia');
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  const p = m.compacto ? 14 : 24;
  miniatura(ctx, pal, x + p, y + 18, m.compacto ? 48 : 60);

  ctx.save();
  ctx.font = `700 ${m.compacto ? 16 : 20}px ${FONTE}`;
  ctx.fillStyle = pal.css('tinta');
  ctx.textBaseline = 'middle';
  const nomeX = x + p + (m.compacto ? 60 : 72);
  const faixaStatsL = m.compacto ? l - p * 2 : l * 0.62;
  const limiteNome = m.compacto
    ? l - p - nomeX + x
    : Math.max(60, (x + l - faixaStatsL - p) - nomeX - 10);
  ctx.fillText(campo.nome.toUpperCase(), nomeX, y + (m.compacto ? 34 : 40), limiteNome);
  ctx.restore();

  const variedade = VARIEDADES[campo.variedade];
  const vx = x + p + (m.compacto ? 66 : 79);
  const vy = y + (m.compacto ? 54 : 64);
  ctx.beginPath();
  ctx.arc(vx, vy, 6, 0, Math.PI * 2);
  ctx.fillStyle = variedade.cor;
  ctx.fill();
  rotulo(ctx, variedade.nome, vx + 13, vy + 1, { tamanho: 10, cor: pal.css('suave'), espaco: 1.6 });

  // Selo de florada na linha da variedade, que é a única livre do cabeçalho.
  // No canto direito ele batia na coluna de risco.
  if (emFlor) {
    const bx = vx + 13 + larguraRotulo(ctx, variedade.nome, 10, 1.6) + 12;
    const bl = 96;
    if (bx + bl < x + l - p) {
      pilula(ctx, bx, vy - 10, bl, 21);
      ctx.fillStyle = pal.css('cheia');
      ctx.fill();
      rotulo(ctx, `florada ${Math.ceil(campo.florada)}s`, bx + bl / 2, vy + 1, {
        tamanho: 9, cor: pal.css('tinta'), espaco: 1.4, alinhar: 'center',
      });
    }
  }

  // Em tela estreita as estatísticas viram uma faixa própria de largura total;
  // em tela larga ficam na metade direita do cabeçalho.
  const stats = statsComFlorada(campo);
  const valores = [
    [stats.taxa.toFixed(1), '/min', 'taxa de coleta'],
    [`${stats.viagem.toFixed(1)}s`, '', 'viagem'],
    [`${Math.floor(campo.nectar)}/${Math.round(stats.nectarMax)}`, '', 'néctar'],
    [`${Math.round(stats.risco * 100)}%`, '', 'risco'],
  ];
  const faixaStats = m.compacto ? l - p * 2 : l * 0.62;
  const larguraStat = faixaStats / 4;
  const statY = y + (m.compacto ? 88 : 38);
  const statX = m.compacto ? x + p : x + l - faixaStats - p;

  valores.forEach(([valor, sufixo, nome], i) => {
    const cx = statX + larguraStat * (i + 0.5);
    numero(ctx, valor, cx, statY, {
      tamanho: m.compacto ? 17 : 21, cor: pal.css('tinta'), alinhar: 'center',
    });
    if (sufixo && !m.compacto) {
      rotulo(ctx, sufixo, cx + 32, statY + 4, { tamanho: 9, cor: pal.css('suave'), espaco: 1.2 });
    }
    rotulo(ctx, nome, cx, statY + 22, {
      tamanho: 9, cor: pal.css('suave'), espaco: 1.4, alinhar: 'center',
    });
  });

  const turmaY = y + (m.compacto ? 130 : 88);
  desenharTurma(ctx, pal, campo, 'nectar', x + p, turmaY, l - p * 2, m);
  desenharTurma(ctx, pal, campo, 'polen', x + p, turmaY + 44, l - p * 2, m);

  const livres = campo.slots - campo.alocadas - campo.polenAlocadas;
  rotulo(ctx, livres === 1 ? '1 slot livre' : `${livres} slots livres`, x + p, turmaY + 94, {
    tamanho: 10, cor: pal.css('suave'), espaco: 1.8,
  });
  desenharSobre(ctx, pal, campo, x + p, turmaY + 116, l - p * 2);

  const melY = m.compacto ? turmaY + 166 : y + 90;
  const melX = m.compacto ? x + p : x + l * 0.38;
  const melL = m.compacto ? l - p * 2 : l * 0.62 - p;
  desenharMelhorias(ctx, estado, pal, campo, melX, melY, melL, m);
}

// Uma linha de turma: [-] ●●○○ [+] com o rótulo do recurso. O espaçamento dos
// slots se ajusta à largura, porque o Vale das Acácias tem seis.
function desenharTurma(ctx, pal, campo, tipo, x, y, largura, m) {
  const n = tipo === 'polen' ? campo.polenAlocadas : campo.alocadas;
  const a = 34;
  const texto = tipo === 'polen' ? 'pólen' : 'néctar';
  rotulo(ctx, texto, x, y + a / 2, { tamanho: 10, cor: pal.css('suave'), espaco: 1.6 });

  const botao = m.compacto ? 14 : 15;
  // Largura medida, nunca estimada — e a mesma para as duas linhas, senão os
  // slots de néctar e pólen não alinham entre si. A folga soma o raio do botão
  // mais um respiro: sem isso a borda do botão encosta na última letra.
  const lRotulo = Math.max(
    larguraRotulo(ctx, 'néctar', 10, 1.6),
    larguraRotulo(ctx, 'pólen', 10, 1.6),
  );
  const bx = x + lRotulo + botao + (m.compacto ? 10 : 16);
  const disponivel = Math.min(x + largura, bx + (m.compacto ? largura : 340)) - bx - botao * 4 - 20;
  const passo = Math.max(18, Math.min(30, disponivel / campo.slots));
  const raio = Math.max(7, Math.min(11, passo * 0.37));

  botaoRedondo(ctx, pal, bx, y + a / 2, '−', botao);
  zona('campo:alocar', bx - m.toque / 2, y + a / 2 - m.toque / 2, m.toque, m.toque, { campo: campo.id, tipo, delta: -1 });

  for (let i = 0; i < campo.slots; i++) {
    const cx = bx + botao + 12 + i * passo;
    ctx.beginPath();
    ctx.arc(cx, y + a / 2, raio, 0, Math.PI * 2);
    if (i < n) {
      ctx.fillStyle = tipo === 'polen' ? '#e0a52c' : pal.css('cheia');
      ctx.fill();
    } else {
      ctx.strokeStyle = pal.css('suave', 0.5);
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  const mx = bx + botao + 12 + campo.slots * passo;
  botaoRedondo(ctx, pal, mx, y + a / 2, '+', botao);
  zona('campo:alocar', mx - m.toque / 2, y + a / 2 - m.toque / 2, m.toque, m.toque, { campo: campo.id, tipo, delta: +1 });
}

function botaoRedondo(ctx, pal, x, y, glifo, raio = 15) {
  ctx.beginPath();
  ctx.arc(x, y, raio, 0, Math.PI * 2);
  ctx.fillStyle = pal.css('escuro', 0.82);
  ctx.fill();
  ctx.save();
  ctx.font = `700 20px ${FONTE}`;
  ctx.fillStyle = pal.css('hud');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glifo, x, y + 1);
  ctx.restore();
}

function desenharMelhorias(ctx, estado, pal, campo, x, y, l, m) {
  rotulo(ctx, 'melhorias', x, y, { tamanho: 10, cor: pal.css('suave'), espaco: 2.4 });


  const passoLinha = m.compacto ? 46 : 38;
  Object.entries(UPGRADES).forEach(([id, regra], i) => {
    const ly = y + 26 + i * passoLinha;
    const nivel = campo.upgrades[id] ?? 0;
    const noMaximo = nivel >= regra.max;
    const custo = custoUpgrade(id, nivel);
    const podePagar = !noMaximo && estado.moedas >= custo;

    ctx.save();
    const tamNome = m.compacto ? 12 : 13;
    ctx.font = `700 ${tamNome}px ${FONTE}`;
    ctx.fillStyle = pal.css('tinta');
    ctx.textBaseline = 'middle';
    // No compacto o nome fica na linha de cima e os pips na de baixo; no largo
    // os dois dividem a mesma linha, depois do nome medido.
    ctx.fillText(regra.nome, x, m.compacto ? ly - 12 : ly);
    const larguraNome = ctx.measureText(regra.nome).width;
    ctx.restore();

    const ix = x + larguraNome + 13;
    const iy = m.compacto ? ly - 12 : ly;
    ctx.save();
    ctx.beginPath(); ctx.arc(ix, iy, 7, 0, Math.PI * 2);
    ctx.strokeStyle = pal.css('suave'); ctx.lineWidth = 1; ctx.stroke();
    ctx.font = `700 10px ${FONTE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = pal.css('suave'); ctx.fillText('?', ix, iy + 0.5);
    ctx.restore();
    zona('melhorias:info', ix - 10, iy - 10, 20, 20, { upgrade: id });

    const bl = Math.min(98, l * 0.3);
    const px = m.compacto ? x + 4 : x + larguraNome + 32;
    const pipY = m.compacto ? ly + 10 : ly;
    const espacoPips = x + l - bl - 14 - px;
    const passoPip = Math.max(8, Math.min(16, espacoPips / regra.max));
    for (let k = 0; k < regra.max; k++) {
      ctx.beginPath();
      ctx.arc(px + k * passoPip, pipY, 4, 0, Math.PI * 2);
      ctx.fillStyle = k < nivel ? pal.css('cheia') : pal.css('suave', 0.35);
      ctx.fill();
    }

    const bx = x + l - bl;
    const ba = Math.max(m.toque * 0.75, 30);
    pilula(ctx, bx, ly - ba / 2, bl, ba);
    ctx.fillStyle = noMaximo ? pal.css('escuro', 0.1) : podePagar ? pal.css('cheia') : pal.css('escuro', 0.14);
    ctx.fill();

    if (noMaximo) {
      rotulo(ctx, 'máx', bx + bl / 2, ly, {
        tamanho: 10, cor: pal.css('suave'), espaco: 2, alinhar: 'center',
      });
    } else {
      ctx.beginPath();
      ctx.arc(bx + 19, ly, 8, 0, Math.PI * 2);
      ctx.fillStyle = podePagar ? pal.css('aro') : pal.css('suave', 0.5);
      ctx.fill();
      numero(ctx, String(custo), bx + 33, ly, {
        tamanho: 14, cor: podePagar ? pal.css('tinta') : pal.css('suave'),
      });
      zona('campo:upgrade', bx, ly - ba / 2, bl, ba, { campo: campo.id, upgrade: id });
    }
  });
}

// Prós e contras do campo, com os sinais + e − circulados como na referência.
function desenharSobre(ctx, pal, campo, x, y, largura) {
  if (!campo.sobre) return;
  [['+', campo.sobre.bom], ['−', campo.sobre.ruim]].forEach(([sinal, texto], i) => {
    const ly = y + i * 20;
    ctx.beginPath();
    ctx.arc(x + 7, ly, 7, 0, Math.PI * 2);
    ctx.fillStyle = sinal === '+' ? '#3f8a63' : '#b8484a';
    ctx.fill();
    ctx.save();
    ctx.font = `700 11px ${FONTE}`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sinal, x + 7, ly + 1);
    ctx.font = `400 12px ${FONTE}`;
    ctx.fillStyle = pal.css('suave');
    ctx.textAlign = 'left';
    ctx.fillText(texto, x + 22, ly + 1);
    ctx.restore();
  });
}

// Campo ainda travado: mostra só o nível que falta, como na referência.
function desenharTravado(ctx, pal, campo, x, y, l) {
  retanguloArredondado(ctx, x, y, l, ALTURA_TRAVADO, 18);
  ctx.fillStyle = pal.css('escuro', 0.72);
  ctx.fill();

  ctx.strokeStyle = pal.css('hud', 0.7);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x + 34, y + 24, 6, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = pal.css('hud', 0.7);
  ctx.fillRect(x + 27, y + 24, 14, 11);

  rotulo(ctx, `nível ${campo.nivelMin}`, x + 62, y + 28, {
    tamanho: 12, cor: pal.css('hud', 0.7), espaco: 2.4,
  });

  // Pips do que vem: um por melhoria, ainda sem revelar o campo.
  const px = x + l - 60;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.arc(px - k * 18, y + 28, 5, 0, Math.PI * 2);
    ctx.strokeStyle = pal.css('hud', 0.3);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// Miniatura do campo: duas copas sobre uma faixa de chão. Suficiente pra dar
// identidade ao cartão sem carregar imagem.
function miniatura(ctx, pal, x, y, tam) {
  ctx.save();
  retanguloArredondado(ctx, x, y, tam, tam, 16);
  ctx.clip();
  ctx.fillStyle = pal.css('parcial', 0.6);
  ctx.fillRect(x, y, tam, tam);
  ctx.fillStyle = pal.css('vazia', 0.55);
  ctx.fillRect(x, y + tam * 0.62, tam, tam * 0.38);
  ctx.fillStyle = pal.css('escuro', 0.35);
  ctx.beginPath();
  ctx.arc(x + tam * 0.34, y + tam * 0.48, tam * 0.19, 0, Math.PI * 2);
  ctx.arc(x + tam * 0.64, y + tam * 0.42, tam * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
