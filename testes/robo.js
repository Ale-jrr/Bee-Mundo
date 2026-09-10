import { novoJogo, celulasArray } from '../src/core/estado.js';
import { passo } from '../src/sim/tick.js';
import { relogio } from '../src/sim/estacoes.js';
import { ovosDaCelula } from '../src/core/ovos.js';
import {
  colher, vender, alocar, recolherTodas, comprarCelula, comprarUpgrade,
  alimentarNinhada, escolherPendor, coroarRainha, misturar, celulasMaduras,
  totalNoPote, precoDeVenda,
} from '../src/sim/acoes.js';
import { escolherBencao } from '../src/sim/bencaos.js';
import { vedarEntrada, FORMIGAS } from '../src/sim/formigas.js';
import { pressaoDoEnxame } from '../src/sim/enxame.js';
import { podeCoroar, emInterregno, vigorDaRainha, RAINHA } from '../src/sim/rainha.js';
import { censo } from '../src/sim/talentos.js';
import { AVISO_INVERNO } from '../src/sim/inverno.js';
import { VESPAS } from '../src/sim/predadores.js';
import {
  VARIEDADES, MISTURA, UPGRADES, NINHADA, META,
  metaDoAno, vagasDoCampo, custoUpgrade, precoDaCelula,
} from '../src/sim/economia.js';

// Jogador-robô.
//
// Existe porque medir balanço com sonda escrita na hora deu errado quatro
// vezes seguidas, cada vez de um jeito diferente:
//
//   1. colheu e nunca vendeu → derrota no Ano 1 congelou `passo`, e eu li
//      isso como "seis minutos sem mel";
//   2. mexeu em `ano` sem mexer em `decorrido` → o jogo viu ano novo, conferiu
//      a meta, decretou derrota, e tudo veio zerado;
//   3. ignorou `estado.escolha` → a bênção da primavera pausou o jogo e o
//      relógio parou no Ano 2 para sempre;
//   4. alimentou a ninhada antes de vender → gastou o mel todo, as abelhas
//      ficaram com fome e a colônia encolheu.
//
// A lição comum é que a sonda descartável mente de um jeito novo a cada vez, e
// eu não tenho como saber qual número é do jogo e qual é meu. Este arquivo é a
// resposta: um jogador só, versionado, com testes que provam que ele não faz
// nenhuma das quatro besteiras acima.
//
// Ele não joga bem — joga **de forma competente e previsível**, que é o que
// uma régua precisa ser.

export const PADRAO = {
  // Fração das operárias que vai a campo. O resto fica dentro curando: com
  // todas fora, o néctar empilha e nada vira mel (ver `alocar`).
  fracaoNoCampo: 0.62,
  // Uma coletora de pólen sustenta cerca de quatro de néctar (ver SILO).
  nectarPorPolen: 4,
  // Potes que nunca são vendidos: é o que as abelhas comem.
  reserva: 4,
  reservaInverno: 14,
  // Só alimenta a ninhada com esta folga acima da reserva.
  folgaNinhada: 6,
  // Alvo de operárias, que cresce com o ano.
  coloniaBase: 8,
  coloniaPorAno: 3,
  // Moedas que ficam em caixa antes de comprar melhoria.
  caixaMinima: 120,
  // Quanto o Posto Avançado (que abre vaga) vale acima das melhorias que só
  // aumentam o rendimento de uma vaga que já existe.
  pesoDoPosto: 3,
  // Vende até ter esta folga sobre a meta antes de guardar mel para criar.
  folgaDaMeta: 1.15,
  // Encomenda guardiã enquanto a colmeia tiver menos que isto.
  guardiasDesejadas: (ano) => (ano >= 7 ? 3 : ano >= 4 ? 2 : 1),
  segundosPorDecisao: 0.5,
  // Teto de segurança: 12 minutos de jogo é mais que os 9 anos de 36 min?
  // Não — nove anos são 2160 s. Este teto existe só para o laço nunca ficar
  // preso se o jogo travar.
  tetoSegundos: 60 * 60,
};

// Preferência entre bênçãos. Não é ótimo — é estável, que é o que importa
// para comparar duas versões do jogo entre si.
const PESO_BENCAO = {
  coleta: 10, oficio: 9, polen: 8, negocio: 7, viagem: 6, cera: 5,
  postura: 5, florada: 4, feromonio: 4, calor: 3, encomenda: 3,
  apetite: 2, agasalho: 2, passo: 2, guarda: 1,
};

// ---------------------------------------------------------------- decisões

function faltaParaOFimDoAno(t) {
  const ordem = ['primavera', 'verao', 'outono', 'inverno'];
  const restam = ordem.length - 1 - ordem.indexOf(t.estacao.id);
  return t.restamSegundos + restam * 60;
}

// Vender é o que conta para a meta; o resto do mel é comida e ninhada.
function vender_(estado, t, cfg) {
  if (cfg.misturar !== false) {
    // Um pote de cada variedade de campo vira florada, que paga 34 contra os
    // 29 das três somadas — e concentra valor em menos vendas.
    while (MISTURA.entrada.every((v) => Math.floor(estado.pote[v] ?? 0) >= 1)) {
      if (!misturar(estado).ok) break;
    }
  }

  const inverno = t.estacao.id === 'inverno';
  const reserva = inverno ? cfg.reservaInverno : cfg.reserva;
  let sobra = totalNoPote(estado) - reserva;
  if (sobra <= 0) return;

  const ordem = Object.keys(VARIEDADES)
    .sort((a, b) => precoDeVenda(estado, b, t.estacao) - precoDeVenda(estado, a, t.estacao));
  for (const variedade of ordem) {
    if (sobra <= 0) break;
    const tem = Math.floor(estado.pote[variedade] ?? 0);
    if (tem <= 0) continue;
    const n = Math.min(tem, sobra);
    if (vender(estado, variedade, t.estacao, n).ok) sobra -= n;
  }
}

// Campo mais rentável com vaga livre. Néctar por segundo, descontado o risco.
function melhorCampo(estado) {
  return estado.campos
    .filter((c) => estado.nivel >= c.nivelMin)
    .filter((c) => c.alocadas + c.polenAlocadas < vagasDoCampo(c))
    .map((c) => ({ c, valor: (c.taxa / Math.max(1, c.viagem)) * (1 - (c.risco ?? 0)) }))
    .sort((a, b) => b.valor - a.valor)[0]?.c ?? null;
}

function escalarCampos(estado, cfg) {
  const livres = estado.abelhas.filter(
    (a) => a.papel === 'operaria' && a.estado !== 'alugada' && !a.guarda,
  ).length;
  const teto = Math.max(1, Math.floor(livres * cfg.fracaoNoCampo));
  let usadas = estado.campos.reduce((n, c) => n + c.alocadas + c.polenAlocadas, 0);

  // Passou do teto (a colônia encolheu): tira do campo menos rentável.
  let guarda = 0;
  while (usadas > teto && guarda++ < 40) {
    const pior = estado.campos
      .filter((c) => c.alocadas + c.polenAlocadas > 0)
      .sort((a, b) => (a.taxa / Math.max(1, a.viagem)) - (b.taxa / Math.max(1, b.viagem)))[0];
    if (!pior) break;
    const tipo = pior.polenAlocadas > 0 && pior.alocadas === 0 ? 'polen' : 'nectar';
    if (!alocar(estado, pior.id, tipo, -1).ok) break;
    usadas--;
  }

  guarda = 0;
  while (usadas < teto && guarda++ < 40) {
    const campo = melhorCampo(estado);
    if (!campo) break;
    const nectar = estado.campos.reduce((n, c) => n + c.alocadas, 0);
    const polen = estado.campos.reduce((n, c) => n + c.polenAlocadas, 0);
    const tipo = polen * cfg.nectarPorPolen < nectar ? 'polen' : 'nectar';
    if (!alocar(estado, campo.id, tipo, 1).ok) {
      // A vaga era do outro recurso: tenta o oposto antes de desistir.
      if (!alocar(estado, campo.id, tipo === 'polen' ? 'nectar' : 'polen', 1).ok) break;
    }
    usadas++;
  }
}

function criar(estado, t, cfg) {
  const c = censo(estado);
  const alvo = cfg.coloniaBase + estado.ano * cfg.coloniaPorAno;
  const reserva = t.estacao.id === 'inverno' ? cfg.reservaInverno : cfg.reserva;

  // Encomendar guardiã vem antes de acelerar: um ovo que já vai nascer não
  // adianta apressar se ele vai nascer inútil contra a vespa que vem.
  const querGuardias = cfg.guardiasDesejadas(estado.ano);
  if (c.talentos.defesa < querGuardias && totalNoPote(estado) >= reserva + NINHADA.custoPendor) {
    const ovo = celulasArray(estado)
      .filter((cel) => cel.estado === 'ovo')
      .find((cel) => ovosDaCelula(cel).some((o) => !o.pendor));
    if (ovo) {
      const alvoOvo = ovosDaCelula(ovo).find((o) => !o.pendor);
      escolherPendor(estado, ovo, 'defesa', alvoOvo.id);
    }
  }

  // Abelha nova produz o resto do ano — mas só se houver ano pela frente.
  if (c.operarias >= alvo) return;
  if (faltaParaOFimDoAno(t) < 60) return;
  if (totalNoPote(estado) <= reserva + cfg.folgaNinhada) return;
  for (const cel of celulasArray(estado)) {
    if (cel.estado !== 'ovo') continue;
    if (totalNoPote(estado) <= reserva + cfg.folgaNinhada) break;
    alimentarNinhada(estado, cel, 1);
  }
}

function investir(estado, cfg) {
  // Espaço primeiro: é o que segura o enxame e o que deixa o favo produzir.
  const pressao = pressaoDoEnxame(estado);
  const travada = celulasArray(estado).find((c) => c.estado === 'travada');
  const precoCelula = precoDaCelula(estado.celulasCompradas);
  if (travada && (pressao.apertado || estado.moedas > precoCelula + cfg.caixaMinima)) {
    comprarCelula(estado, travada);
  }

  // Melhorias, em **todos** os campos liberados. Concentrar num campo só
  // parece esperto e não é: `posto` é o único jeito de abrir vaga, e vaga é o
  // teto de tudo — uma colônia de 90 abelhas com 19 vagas tem 74 abelhas sem
  // trabalho no campo.
  const abertos = estado.campos.filter((c) => estado.nivel >= c.nivelMin);
  if (!abertos.length) return;

  const compras = [];
  for (const campo of abertos) {
    for (const id of Object.keys(UPGRADES)) {
      const nivel = campo.upgrades[id] ?? 0;
      if (nivel >= UPGRADES[id].max) continue;
      const custo = custoUpgrade(id, nivel);
      if (estado.moedas < custo + cfg.caixaMinima) continue;
      // Vaga vale mais que rendimento por vaga enquanto sobrar abelha em
      // casa sem fazer nada; depois disso, o inverso.
      const peso = id === 'posto' ? cfg.pesoDoPosto : 1;
      compras.push({ campo: campo.id, id, valor: (campo.taxa * peso) / custo });
    }
  }
  if (!compras.length) return;
  compras.sort((a, b) => b.valor - a.valor);
  comprarUpgrade(estado, compras[0].campo, compras[0].id);
}

// Trocar de rainha custa mel e uma janela sem postura. O inverno é a hora
// certa: a ninhada já está congelada, então o interregno sai de graça.
function cuidarDaRainha(estado, t, cfg) {
  if (emInterregno(estado) || !podeCoroar(estado)) return;
  if (vigorDaRainha(estado) > 0.7) return;
  if (totalNoPote(estado) < cfg.reservaInverno + RAINHA.custoMel) return;
  if (t.estacao.id !== 'inverno') return;
  coroarRainha(estado);
}

function decidir(estado, cfg) {
  const t = relogio(estado.decorrido);

  for (const cel of celulasMaduras(estado)) colher(estado, cel);
  if (estado.formigas && estado.moedas >= FORMIGAS.custoVedar) vedarEntrada(estado);

  const recolhendo = t.estacao.id === 'inverno'
    || (t.estacao.id === 'outono' && t.restamSegundos <= AVISO_INVERNO);
  if (recolhendo) recolherTodas(estado);
  else escalarCampos(estado, cfg);

  vender_(estado, t, cfg);
  criar(estado, t, cfg);
  investir(estado, cfg);
  cuidarDaRainha(estado, t, cfg);
}

// ------------------------------------------------------------- a partida

export function jogarPartida(semente, opcoes = {}) {
  const cfg = { ...PADRAO, ...opcoes };
  const estado = novoJogo(semente, opcoes.desafio);
  const porAno = [];
  let ultimoAno = estado.ano;
  let escolhas = 0;
  const passos = Math.round(cfg.tetoSegundos * 30);

  for (let i = 0; i < passos; i++) {
    // A bênção da primavera **pausa o jogo** até alguém escolher. Ignorar isto
    // congelou uma medição inteira no Ano 2.
    if (estado.escolha) {
      const oferta = [...estado.escolha.opcoes]
        .sort((a, b) => (PESO_BENCAO[b.id ?? b] ?? 0) - (PESO_BENCAO[a.id ?? a] ?? 0))[0];
      escolherBencao(estado, oferta.id ?? oferta);
      escolhas++;
    }
    if (estado.derrota || estado.vitoria) break;

    passo(estado, 1 / 30);
    if (i % Math.round(cfg.segundosPorDecisao * 30) === 0) decidir(estado, cfg);

    if (estado.ano !== ultimoAno) ultimoAno = estado.ano;
  }

  for (const h of estado.historico) porAno.push({ ...h });

  return {
    semente,
    venceu: Boolean(estado.vitoria),
    perdeu: Boolean(estado.derrota),
    anoFinal: estado.ano,
    // Se não venceu nem perdeu, o laço estourou o teto — é bug do robô, não
    // resultado do jogo, e o relatório precisa dizer isso.
    inconclusivo: !estado.vitoria && !estado.derrota,
    operarias: estado.abelhas.filter((a) => a.papel === 'operaria').length,
    celulas: celulasArray(estado).filter((c) => c.estado !== 'travada').length,
    moedas: Math.round(estado.moedas),
    escolhas,
    porAno,
    estado,
  };
}

export function medirBalanco(sementes = [42, 7, 123, 2024, 99, 5], opcoes = {}) {
  const partidas = sementes.map((s) => jogarPartida(s, opcoes));
  const vitorias = partidas.filter((p) => p.venceu).length;
  const inconclusivas = partidas.filter((p) => p.inconclusivo).length;
  const anos = partidas.map((p) => p.anoFinal);

  // Folga sobre a meta, ano a ano: é o número que diz se o jogo aperta ou
  // afrouxa, muito antes de a vitória virar derrota.
  const folgaPorAno = {};
  for (const p of partidas) {
    for (const h of p.porAno) {
      (folgaPorAno[h.ano] ??= []).push(h.meta > 0 ? h.vendido / h.meta : null);
    }
  }
  const folga = Object.fromEntries(Object.entries(folgaPorAno).map(([ano, v]) => {
    const bons = v.filter((x) => typeof x === 'number');
    return [ano, bons.length ? +(bons.reduce((a, b) => a + b, 0) / bons.length).toFixed(2) : null];
  }));

  return {
    partidas: partidas.length,
    vitorias,
    inconclusivas,
    taxa: `${vitorias}/${partidas.length}`,
    anoMedio: +(anos.reduce((a, b) => a + b, 0) / anos.length).toFixed(1),
    piorAno: Math.min(...anos),
    folgaSobreAMeta: folga,
    detalhe: partidas.map((p) => ({
      semente: p.semente,
      fim: p.venceu ? 'venceu' : p.inconclusivo ? 'INCONCLUSIVO' : `perdeu no ano ${p.anoFinal}`,
      operarias: p.operarias,
      celulas: p.celulas,
    })),
  };
}

// ------------------------------------------------------- testes do robô
//
// Não testam o jogo: testam que o **robô** não repete nenhum dos quatro erros
// que invalidaram as medições anteriores. Uma régua torta mede errado sempre.

export async function rodar() {
  const falhas = [];
  let total = 0;
  const ok = (nome, cond, extra = '') => {
    total++;
    if (!cond) falhas.push(extra ? `${nome}: ${extra}` : nome);
  };

  const curta = jogarPartida(42, { tetoSegundos: 700 });

  // Erro 1: colher e nunca vender.
  ok('o robo vende', curta.porAno.some((h) => h.vendido > 0),
    JSON.stringify(curta.porAno.map((h) => Math.round(h.vendido))));

  // Erro 2: mexer no relogio na mao. O robo nunca escreve `ano` nem
  // `decorrido` — quem anda com eles e o `passo`.
  const fonte = await (await fetch('/testes/robo.js')).text();
  const corpo = fonte.slice(0, fonte.indexOf('export async function rodar'));
  ok('o robo nao escreve em estado.ano', !/estado\.ano\s*=[^=]/.test(corpo));
  ok('o robo nao escreve em estado.decorrido', !/estado\.decorrido\s*=[^=]/.test(corpo));

  // Erro 3: ignorar a escolha da primavera. Se ela travasse, o jogo nao
  // passaria do Ano 2 — e o robo tem que ter escolhido pelo menos uma.
  ok('o robo resolve a bencao da primavera', curta.escolhas >= 1, `${curta.escolhas}`);
  ok('e o relogio anda mais de um ano', curta.anoFinal >= 2 || curta.venceu,
    `ano ${curta.anoFinal}`);

  // Erro 4: alimentar a ninhada antes de vender, e deixar a colonia com fome.
  ok('a colonia nao encolhe abaixo do inicio', curta.operarias >= 2, `${curta.operarias}`);

  // Regra do jogo que a sonda antiga violava: colmeia sem ninguem dentro nao
  // faz mel. O robo tem que deixar gente em casa.
  const meio = jogarPartida(7, { tetoSegundos: 200 }).estado;
  const emCasa = meio.abelhas.filter((a) => a.papel === 'operaria' && a.estado === 'colmeia').length;
  const operarias = meio.abelhas.filter((a) => a.papel === 'operaria').length;
  ok('o robo deixa abelha em casa pra curar', operarias === 0 || emCasa >= 1,
    `${emCasa} de ${operarias}`);

  // Determinismo: mesma semente, mesmo resultado. Sem isto nao da pra
  // comparar duas versoes do jogo.
  const a1 = jogarPartida(99, { tetoSegundos: 400 });
  const a2 = jogarPartida(99, { tetoSegundos: 400 });
  ok('a mesma semente da o mesmo resultado',
    a1.anoFinal === a2.anoFinal && a1.operarias === a2.operarias
    && a1.moedas === a2.moedas,
    `${a1.anoFinal}/${a1.operarias}/${a1.moedas} vs ${a2.anoFinal}/${a2.operarias}/${a2.moedas}`);

  // Sementes diferentes tem que dar partidas diferentes, senao o robo esta
  // ignorando o sorteio e medindo uma coisa so.
  const b1 = jogarPartida(1, { tetoSegundos: 400 });
  const b2 = jogarPartida(2, { tetoSegundos: 400 });
  ok('sementes diferentes dao partidas diferentes',
    b1.moedas !== b2.moedas || b1.operarias !== b2.operarias);

  // O laco tem que terminar por vitoria ou derrota, nunca por estouro de teto.
  const inteira = jogarPartida(42);
  ok('a partida inteira termina por si', !inteira.inconclusivo,
    `ano ${inteira.anoFinal}`);
  ok('e o robo joga os anos ate o fim ou perde tentando',
    inteira.venceu || inteira.perdeu);
  ok('o historico tem uma linha por ano jogado',
    inteira.porAno.length === (inteira.venceu ? META.anoFinal : inteira.anoFinal),
    `${inteira.porAno.length} linhas, ano ${inteira.anoFinal}`);

  return { total, falhas: falhas.length, detalhes: falhas };
}
