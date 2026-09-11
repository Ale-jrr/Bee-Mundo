// Testes das sete funcionalidades novas. Rode no console do navegador:
//   (await import('/testes/funcionalidades.js')).rodar()
//
// Não tocam em localStorage: dá pra rodar com uma partida real aberta.

import { novoJogo, celulasArray } from '../src/core/estado.js';
import { ovosDaCelula } from '../src/core/ovos.js';
import { passo } from '../src/sim/tick.js';
import * as A from '../src/sim/acoes.js';
import { previsaoInverno, AVISO_INVERNO } from '../src/sim/inverno.js';
import { SEGUNDOS_POR_ESTACAO, relogio } from '../src/sim/estacoes.js';
import { medidas, areaDoClima, areaDoPote, barraSuperior, BOTOES_DE_ACAO } from '../src/ui/layout.js';
import { contarOrnamentos } from '../src/render/ornamentos.js';
import {
  geometriaFavo, centroDaCelula, limitarCamera, limitarZoom, ZOOM,
} from '../src/render/favo.js';
import { dePixel } from '../src/sim/hex.js';
import { DICAS, mostrarDica, fecharDica, dicaAtiva, dicaPausada } from '../src/sim/dicas.js';
import { ritmoDoAr, limiteDeFome, AR } from '../src/sim/clima.js';
import { pressaoDoEnxame, ENXAME } from '../src/sim/enxame.js';
import { tempoAtivo, fatorDaColeta, fatorDaRebrota, TEMPO } from '../src/sim/tempo.js';
import { FORMIGAS, vedarEntrada, formigasAtacando } from '../src/sim/formigas.js';
import {
  RAINHA, vigorDaRainha, intervaloDePostura, emInterregno, idadeDaRainha,
} from '../src/sim/rainha.js';
import { ALUGUEL, MISTURA, vagasDoCampo, vagasDoFavo, VAGAS, UPGRADES, CAMPOS } from '../src/sim/economia.js';
import { SEGUNDOS_POR_ANO } from '../src/sim/estacoes.js';
import * as K from '../src/core/conquistas.js';
import { estaMinimizado, alternarMinimizado, recuoDoBotao } from '../src/ui/cartao.js';
import { avisosAtivos, avisosNovos, temUrgente } from '../src/sim/avisos.js';
import { desenharChips, alturaDosChips } from '../src/ui/desafios.js';
import { DESAFIOS } from '../src/sim/desafios.js';
import { EVENTOS, tentarEvento, segundosDesdeOUltimoEvento } from '../src/sim/eventos.js';
import {
  PASSOS, tutorialAtivo, comecarTutorial, pularTutorial, confirmarPasso, avancarTutorial,
} from '../src/sim/tutorial.js';
import * as S from '../src/core/save.js';
import {
  DESAFIO_PADRAO, regraDoDesafio, penalidadeDoInverno,
  DURACOES, DURACAO_PADRAO, DIFICULDADE_PADRAO, anosDaPartida,
} from '../src/sim/desafios.js';
import {
  TALENTOS, elenco, censo, fatorColeta, fatorProducao, fatorRisco, melhorPara,
} from '../src/sim/talentos.js';
import { campoEmFlorada, statsComFlorada, FLORADA } from '../src/sim/floradas.js';
import { encomendaAtiva } from '../src/sim/encomendas.js';
import {
  VARIEDADES, precoDaCelula, PRESENTE_DO_ANO, NINHADA, META, metaDoAno,
} from '../src/sim/economia.js';
import {
  BIOMAS, BIOMA_PADRAO, ESPECIES, especieDefende, deltaDoBioma, fatorDoBioma,
} from '../src/sim/biomas.js';
import { temperaturaAlvo } from '../src/sim/tick.js';
import { ajustarParaCaber } from '../src/ui/inicio.js';
import { defensoras, enviarGuarda } from '../src/sim/predadores.js';
import {
  BENCAOS, nivelBencao, totalBencao, bonusBencao, descontoBencao, fatorDoInverno,
  sortearBencaos, escolherBencao, textoDaBencao,
} from '../src/sim/bencaos.js';

// Um jogo parado no instante que interessa, sem esperar a partida chegar lá.
function em(segundos, semente = 42) {
  const s = novoJogo(semente);
  s.decorrido = segundos;
  return s;
}

const OUTONO = SEGUNDOS_POR_ESTACAO * 2;
const INVERNO = SEGUNDOS_POR_ESTACAO * 3;

export async function rodar() {
  let total = 0;
  const falhas = [];
  // Marcador auxiliar: usado dentro de laços, onde uma asserção por volta
  // inflaria a contagem sem dizer mais nada.
  let semValorForaDaFaixa = true;
  const ok2 = (condicao) => { if (!condicao) semValorForaDaFaixa = false; };
  const ok = (nome, condicao, detalhe) => {
    total++;
    if (!condicao) falhas.push(detalhe ? `${nome}: ${detalhe}` : nome);
  };

  // ------------------------------------------------ 1. preparar o inverno

  ok('sem painel na primavera', previsaoInverno(em(10)) === null);
  ok('sem painel no começo do outono', previsaoInverno(em(OUTONO + 5)) === null);
  ok('painel no fim do outono',
    previsaoInverno(em(INVERNO - AVISO_INVERNO + 1)) !== null);
  ok('painel durante o inverno', previsaoInverno(em(INVERNO + 30))?.inverno === true);
  ok('sem painel na primavera seguinte',
    previsaoInverno(em(SEGUNDOS_POR_ESTACAO * 4 + 10)) === null);

  // A previsão tem que enxergar quem está no campo e quanto falta de mel.
  const s = em(INVERNO - 20, 7);
  A.alocar(s, 'campainhas', 'nectar', 1);
  for (let i = 0; i < 30 * 6; i++) passo(s, 1 / 30);
  const p = previsaoInverno(s);
  ok('conta as coletoras fora', p.fora === 2, `fora ${p.fora}`);
  ok('estima a volta em segundos', p.voltaEm > 0 && p.voltaEm < 60, `${p.voltaEm}s`);

  const pobre = em(INVERNO - 20, 7);
  for (const v of Object.keys(pobre.pote)) pobre.pote[v] = 0;
  ok('acusa reserva insuficiente', previsaoInverno(pobre).falta > 0);
  const rico = em(INVERNO - 20, 7);
  for (const v of Object.keys(rico.pote)) rico.pote[v] = 99;
  ok('não acusa reserva cheia', previsaoInverno(rico).falta === 0);

  // Recolher: zera as turmas e traz voando quem estava no ar, em vez de
  // teletransportar — é isso que dá sentido ao "volta em Xs" do painel.
  const r = em(INVERNO - 20, 7);
  A.alocar(r, 'campainhas', 'nectar', 1);
  for (let i = 0; i < 30 * 6; i++) passo(r, 1 / 30);
  const noAr = r.abelhas.filter((a) => ['indo', 'coletando'].includes(a.estado)).length;
  const res = A.recolherTodas(r);
  ok('recolher devolve ok', res.ok === true);
  ok('recolher zera as turmas',
    r.campos.every((c) => c.alocadas === 0 && c.polenAlocadas === 0));
  ok('recolher põe as do ar pra voltar',
    r.abelhas.filter((a) => a.estado === 'voltando').length >= noAr);
  ok('recolher não teletransporta',
    r.abelhas.every((a) => a.estado !== 'indo' && a.estado !== 'coletando'));
  // Sem ninguém alocado nem no ar não há o que recolher. O jogo novo já vem
  // com uma coletora escalada, então o caso só existe zerando antes.
  const vazio = em(10);
  for (const campo of vazio.campos) { campo.alocadas = 0; campo.polenAlocadas = 0; }
  ok('recolher sem ninguém fora falha', A.recolherTodas(vazio).ok === false);
  ok('recolher com turma escalada funciona', A.recolherTodas(em(10)).ok === true);

  // As coletoras recolhidas chegam em casa sozinhas.
  for (let i = 0; i < 30 * 40; i++) passo(r, 1 / 30);
  ok('as recolhidas chegam em casa',
    r.abelhas.every((a) => a.estado === 'colmeia' || a.estado === 'rainha'),
    r.abelhas.map((a) => a.estado).join(','));

  // O painel se encaixa **abaixo** do clima em qualquer tela. A conta da faixa
  // de estações vive no layout justamente porque dois desenhos dependem dela;
  // quando morava dentro do HUD, o painel caía 50 px por cima do clima.
  for (const [L, A2] of [[1280, 720], [726, 702], [375, 812], [1920, 1080]]) {
    const m = medidas(L, A2);
    const clima = areaDoClima(m);
    const faixa = barraSuperior(m);
    ok(`clima abaixo da barra em ${L}x${A2}`,
      clima.y >= m.margem + m.barra + faixa.extra);
    ok(`faixa separada só quando aperta em ${L}x${A2}`,
      faixa.separado === (faixa.sobra < 260));
  }

  // ------------------------------------------------ 2. colmeia visual

  const novo = novoJogo(42);
  const zero = contarOrnamentos(novo);
  ok('colmeia nova não tem enfeite',
    zero.compradas === 0 && zero.anos === 0 && zero.flores === 0);

  const crescida = novoJogo(42);
  crescida.moedas = 1e9;
  for (let i = 0; i < 6; i++) {
    const travada = celulasArray(crescida).find((c) => c.estado === 'travada');
    if (travada) A.comprarCelula(crescida, travada);
  }
  ok('moldura acompanha as compras', contarOrnamentos(crescida).compradas === 6,
    `${contarOrnamentos(crescida).compradas}`);

  const velha = novoJogo(42);
  velha.historico = Array.from({ length: 4 }, (_, i) => ({ ano: i + 1 }));
  ok('uma conta por ano', contarOrnamentos(velha).anos === 4);
  velha.historico = Array.from({ length: 30 }, (_, i) => ({ ano: i + 1 }));
  ok('contas param no ano final', contarOrnamentos(velha).anos === 9);

  const melhorada = novoJogo(42);
  melhorada.campos[0].upgrades = { sustentavel: 3, rota: 2, ogm: 0 };
  ok('uma flor a cada duas melhorias', contarOrnamentos(melhorada).flores === 2,
    `${contarOrnamentos(melhorada).flores} de 5 pips`);
  for (const campo of melhorada.campos) campo.upgrades = { sustentavel: 8, rota: 8, ogm: 8 };
  ok('flores têm teto', contarOrnamentos(melhorada).flores === 12);

  // ------------------------------------------------ 3. floradas temporárias

  const jogo = novoJogo(42);
  ok('começa sem florada', campoEmFlorada(jogo) === null);

  // Os eventos passaram a ser espacados de proposito (ver `sim/eventos.js`),
  // entao o teste arma o relogio da florada em vez de esperar o sorteio.
  jogo.proximaFlorada = 0;
  let abriu = null, fechou = null, simultaneas = 0;
  for (let i = 0; i < 30 * 400; i++) {
    passo(jogo, 1 / 30);
    const emFlor = jogo.campos.filter((c) => (c.florada ?? 0) > 0);
    simultaneas = Math.max(simultaneas, emFlor.length);
    if (emFlor.length && abriu === null) abriu = jogo.decorrido;
    if (!emFlor.length && abriu !== null && fechou === null) fechou = jogo.decorrido;
  }
  ok('a florada acontece', abriu !== null, 'nenhuma em 400 s');
  ok('nunca duas ao mesmo tempo', simultaneas <= 1, `${simultaneas} juntas`);
  ok('dura o combinado', Math.abs((fechou - abriu) - FLORADA.duracao) < 0.2,
    `durou ${(fechou - abriu).toFixed(1)}s`);
  // O relógio foi armado à mão acima, então o que dá pra verificar aqui é o
  // reagendamento: depois de uma florada, a próxima fica pelo menos um
  // intervalo à frente.
  ok('a próxima fica um intervalo à frente',
    jogo.proximaFlorada - fechou >= FLORADA.intervaloMin - 0.1,
    `${(jogo.proximaFlorada - fechou).toFixed(0)}s depois`);

  // O efeito só existe enquanto dura, e vale para os dois números do campo.
  const campo = { ...novoJogo(1).campos[0], florada: 0 };
  const parado = statsComFlorada(campo);
  const florido = statsComFlorada({ ...campo, florada: 5 });
  ok('florada multiplica a taxa',
    Math.abs(florido.taxa - parado.taxa * FLORADA.taxa) < 1e-6);
  ok('florada multiplica a reserva',
    Math.abs(florido.nectarMax - parado.nectarMax * FLORADA.reserva) < 1e-6);
  ok('sem florada, números normais',
    parado.taxa === statsComFlorada({ ...campo }).taxa);

  // Inverno não tem coleta: florada ali seria enfeite sem consequência.
  const gelado = novoJogo(3);
  gelado.decorrido = INVERNO + 5;
  gelado.proximaFlorada = 0;
  for (let i = 0; i < 30 * 40; i++) passo(gelado, 1 / 30);
  ok('não floresce no inverno', campoEmFlorada(gelado) === null);

  // E não começa uma que o inverno cortaria pela metade.
  const fimDoOutono = novoJogo(3);
  fimDoOutono.decorrido = INVERNO - 10;
  fimDoOutono.proximaFlorada = 0;
  for (let i = 0; i < 30 * 5; i++) passo(fimDoOutono, 1 / 30);
  ok('não começa em cima do inverno', campoEmFlorada(fimDoOutono) === null);

  // Só floresce campo que o jogador já pode usar.
  const nivel1 = novoJogo(9);
  nivel1.proximaFlorada = 0;
  for (let i = 0; i < 30 * 3; i++) passo(nivel1, 1 / 30);
  const florido1 = campoEmFlorada(nivel1);
  ok('só floresce campo desbloqueado', !florido1 || nivel1.nivel >= florido1.nivelMin,
    florido1?.id);

  // ------------------------------------------------ 4. encomendas

  const enc = novoJogo(42);
  ok('começa sem encomenda', encomendaAtiva(enc) === null);
  enc.proximaEncomenda = 0;
  passo(enc, 1 / 30);
  const pedido = encomendaAtiva(enc);
  ok('a encomenda chega', pedido !== null);
  ok('pede uma variedade que existe', pedido && VARIEDADES[pedido.variedade] !== undefined);
  ok('o prazo cai no fim de uma estação',
    Math.abs(pedido.vence % SEGUNDOS_POR_ESTACAO) < 0.05, `vence ${pedido.vence}`);
  ok('paga acima do preço do mel',
    pedido.recompensa > pedido.quantidade * VARIEDADES[pedido.variedade].base);

  // Entregar é vender: o pote certo paga, o errado não.
  const cheio = novoJogo(42);
  cheio.proximaEncomenda = 0;
  passo(cheio, 1 / 30);
  const alvo = encomendaAtiva(cheio);
  cheio.pote[alvo.variedade] = alvo.quantidade;
  const moedasAntes = cheio.moedas;
  const venda = A.vender(cheio, alvo.variedade, relogio(cheio.decorrido).estacao);
  ok('entrega completa paga a recompensa', venda.recompensa === alvo.recompensa,
    `${venda.recompensa} vs ${alvo.recompensa}`);
  ok('a recompensa entra nas moedas',
    Math.round(cheio.moedas - moedasAntes - venda.valor) === alvo.recompensa);
  ok('encomenda atendida sai da tela', encomendaAtiva(cheio) === null);
  ok('e a próxima é agendada', cheio.proximaEncomenda > cheio.decorrido);

  const meio = novoJogo(42);
  meio.proximaEncomenda = 0;
  passo(meio, 1 / 30);
  const p2 = encomendaAtiva(meio);
  meio.pote[p2.variedade] = 1;
  const parcial = A.vender(meio, p2.variedade, relogio(meio.decorrido).estacao);
  ok('entrega parcial não paga', !parcial.recompensa);
  ok('entrega parcial conta', encomendaAtiva(meio).entregue === 1);

  const errado = novoJogo(42);
  errado.proximaEncomenda = 0;
  passo(errado, 1 / 30);
  const p3 = encomendaAtiva(errado);
  const outra = Object.keys(errado.pote).find((v) => v !== p3.variedade);
  errado.pote[outra] = 5;
  A.vender(errado, outra, relogio(errado.decorrido).estacao);
  ok('variedade errada não conta', encomendaAtiva(errado).entregue === 0);

  // Vencida some sozinha, sem punir — é objetivo extra, não segunda meta.
  const vencida = novoJogo(42);
  vencida.proximaEncomenda = 0;
  passo(vencida, 1 / 30);
  const pv = encomendaAtiva(vencida);
  vencida.moedas = 500;
  vencida.decorrido = pv.vence + 0.1;
  passo(vencida, 1 / 30);
  ok('encomenda vencida some', encomendaAtiva(vencida) === null);
  ok('vencer não custa moedas', vencida.moedas === 500);

  // ------------------------------------------------ 5. bênção da primavera

  const ano1 = novoJogo(42);
  ok('não escolhe antes da virada', ano1.escolha === null);

  const virou = novoJogo(42);
  virou.vendidoNoAno = 9999;
  virou.decorrido = SEGUNDOS_POR_ESTACAO * 4 - 0.05;
  for (let i = 0; i < 4; i++) passo(virou, 1 / 30);
  ok('a primavera abre a escolha', virou.escolha !== null);
  ok('oferece três cartas', virou.escolha.opcoes.length === 3,
    `${virou.escolha?.opcoes.length}`);
  ok('sem carta repetida',
    new Set(virou.escolha.opcoes.map((o) => o.id)).size === 3);
  ok('toda carta vem com o valor sorteado',
    virou.escolha.opcoes.every((o) => o.valor > 0));
  ok('a escolha pausa o jogo', virou.velocidade === 0);

  // Enquanto a escolha está aberta o relógio não anda: é decisão de partida
  // inteira e não pode ser tomada com as abelhas correndo.
  const congelado = virou.decorrido;
  for (let i = 0; i < 60; i++) passo(virou, 1 / 30);
  ok('a escolha congela a simulação', virou.decorrido === congelado);

  const oferta5 = virou.escolha.opcoes[0];
  const escolhido = oferta5.id;
  const r5 = escolherBencao(virou, escolhido);
  ok('escolher devolve ok', r5.ok === true);
  ok('a bênção sobe de nível', nivelBencao(virou, escolhido) === 1);
  ok('e guarda o valor que estava na carta',
    Math.abs(totalBencao(virou, escolhido) - oferta5.valor) < 1e-9,
    `${totalBencao(virou, escolhido)} vs ${oferta5.valor}`);
  ok('a escolha fecha', virou.escolha === null);
  ok('o jogo volta a andar', virou.velocidade === 1);
  passo(virou, 1 / 30);
  ok('e o relógio destrava', virou.decorrido > congelado);

  ok('carta fora da oferta é recusada',
    escolherBencao(virou, 'negocio').ok === false || virou.escolha !== null);

  // Efeitos: quem ganha multiplica pra cima, quem perde multiplica pra baixo.
  const comBencao = novoJogo(42);
  comBencao.bencaos = {
    coleta: { nivel: 2, total: 0.24 },
    guarda: { nivel: 2, total: 0.5 },
    agasalho: { nivel: 1, total: 0.15 },
  };
  ok('bônus multiplica pra cima',
    Math.abs(bonusBencao(comBencao, 'coleta') - 1.24) < 1e-9);
  ok('desconto multiplica pra baixo',
    Math.abs(descontoBencao(comBencao, 'guarda') - 0.5) < 1e-9);
  ok('desconto tem piso',
    descontoBencao({ bencaos: { guarda: { nivel: 3, total: 9 } } }, 'guarda') === 0.25);
  ok('agasalho só vale no inverno',
    fatorDoInverno(comBencao, { id: 'verao' }) === 1
    && fatorDoInverno(comBencao, { id: 'inverno' }) > 1);
  ok('sem bênção o multiplicador é neutro',
    bonusBencao(novoJogo(1), 'coleta') === 1 && descontoBencao(novoJogo(1), 'guarda') === 1);

  // Save antigo guardava só o nível; tem que continuar valendo alguma coisa em
  // vez de virar zero na cara do jogador.
  ok('save antigo (só nível) ainda conta',
    bonusBencao({ bencaos: { coleta: 2 } }, 'coleta') > 1);

  // Baralho grande e valor sorteado são o que tiram a repetição.
  ok('o baralho é grande', Object.keys(BENCAOS).length >= 12,
    `${Object.keys(BENCAOS).length} cartas`);
  const valores = new Set();
  const cartas = new Set();
  const amostra = novoJogo(3);
  for (let i = 0; i < 40; i++) {
    for (const o of sortearBencaos(amostra)) {
      cartas.add(o.id);
      valores.add(`${o.id}:${o.valor.toFixed(2)}`);
      ok2(o.valor >= BENCAOS[o.id].min - 1e-9 && o.valor <= BENCAOS[o.id].max + 1e-9);
    }
  }
  ok('o sorteio passeia pelo baralho', cartas.size >= 10, `${cartas.size} cartas vistas`);
  ok('a mesma carta sai com valores diferentes', valores.size > cartas.size,
    `${valores.size} combinações para ${cartas.size} cartas`);
  ok('o valor fica dentro da faixa da carta', semValorForaDaFaixa);
  ok('o valor sai redondo em pontos percentuais',
    [...valores].every((v) => {
      const n = Number(v.split(':')[1]) * 100;
      return Math.abs(n - Math.round(n)) < 1e-6;
    }));

  // O texto da carta mostra o valor sorteado, não a faixa.
  ok('o texto traz o valor da oferta',
    textoDaBencao('coleta', 0.13).includes('13%'), textoDaBencao('coleta', 0.13));
  ok('toda carta sabe se descrever',
    Object.keys(BENCAOS).every((id) => typeof textoDaBencao(id, 0.2) === 'string'
      && textoDaBencao(id, 0.2).includes('20%')));

  // O teto impede empilhar a mesma bênção a partida inteira.
  const noTeto = novoJogo(42);
  noTeto.bencaos = Object.fromEntries(Object.keys(BENCAOS)
    .map((id) => [id, { nivel: BENCAOS[id].max_nivel, total: 1 }]));
  ok('bênção no teto não é oferecida', sortearBencaos(noTeto).length === 0);

  // Célula mais barata é desconto de verdade no preço cobrado.
  const barata = novoJogo(42);
  barata.bencaos = { cera: { nivel: 2, total: 0.3 } };
  barata.moedas = 1e6;
  const travadaAntes = celulasArray(barata).find((c) => c.estado === 'travada');
  const moedasAntes5 = barata.moedas;
  A.comprarCelula(barata, travadaAntes);
  const pagou = moedasAntes5 - barata.moedas;
  ok('cera desconta o preço da célula', pagou < precoDaCelula(0),
    `pagou ${pagou} de ${precoDaCelula(0)}`);

  // ------------------------------------------------ 6. desafios de partida

  ok('jogo novo é o desafio padrão', novoJogo(42).desafio === DESAFIO_PADRAO);
  ok('desafio inválido cai no padrão',
    novoJogo(42, 'não existe').desafio === DESAFIO_PADRAO);
  ok('desafio escolhido fica no estado',
    novoJogo(42, 'perigoso').desafio === 'perigoso');

  const perigoso = novoJogo(42, 'perigoso');
  ok('campos perigosos dobram o risco', regraDoDesafio(perigoso, 'risco') === 2);
  ok('e não mexem no resto', regraDoDesafio(perigoso, 'precoCelula') === 1);

  const apertado = novoJogo(42, 'apertado');
  apertado.moedas = 1e6;
  const antesApertado = apertado.moedas;
  A.comprarCelula(apertado, celulasArray(apertado).find((c) => c.estado === 'travada'));
  const comum = novoJogo(42);
  comum.moedas = 1e6;
  const antesComum = comum.moedas;
  A.comprarCelula(comum, celulasArray(comum).find((c) => c.estado === 'travada'));
  ok('espaço apertado encarece a célula',
    (antesApertado - apertado.moedas) > (antesComum - comum.moedas),
    `${antesApertado - apertado.moedas} vs ${antesComum - comum.moedas}`);

  const rigoroso = novoJogo(42, 'rigoroso');
  ok('inverno rigoroso só morde no inverno',
    penalidadeDoInverno(rigoroso, { id: 'verao' }) === 1
    && penalidadeDoInverno(rigoroso, { id: 'inverno' }) === 0.7);
  ok('padrão não penaliza o inverno',
    penalidadeDoInverno(novoJogo(42), { id: 'inverno' }) === 1);

  // Recomeçar num desafio e voltar do save tem que manter a regra: um save que
  // esquece o desafio devolve a partida no modo errado.
  const salvo = novoJogo(7, 'rigoroso');
  for (let i = 0; i < 30 * 20; i++) passo(salvo, 1 / 30);
  const voltou = S.desserializar(JSON.parse(JSON.stringify(S.serializar(salvo))));
  ok('o desafio sobrevive ao save', voltou.desafio === 'rigoroso');
  ok('e continua valendo', penalidadeDoInverno(voltou, { id: 'inverno' }) === 0.7);

  // ------------------------------------------------ 7. personalidade

  const berco = novoJogo(42);
  ok('as operárias iniciais nascem comuns',
    berco.abelhas.filter((a) => a.papel === 'operaria').every((a) => a.talento === null));

  for (let i = 0; i < 120; i++) A.nascerAbelha(berco);
  const time = elenco(berco);
  const nascidas = time.coleta + time.producao + time.defesa + time.comum;
  ok('todo mundo entra no elenco', nascidas === berco.abelhas.length - 1,
    `${nascidas} de ${berco.abelhas.length - 1}`);
  ok('nascem os três talentos', time.coleta > 0 && time.producao > 0 && time.defesa > 0,
    JSON.stringify(time));
  ok('a maioria continua comum sendo notícia ter talento',
    time.comum > nascidas * 0.25 && time.comum < nascidas * 0.6,
    `${time.comum} de ${nascidas}`);

  // Os efeitos: cada talento mexe só no seu pedaço.
  const bat = { talento: 'coleta' };
  const cer = { talento: 'producao' };
  const gua = { talento: 'defesa' };
  const cru = { talento: null };
  ok('batedora coleta mais', fatorColeta(bat) > 1 && fatorColeta(cer) === 1);
  ok('ceroma trabalha mais rápido', fatorProducao(cer) > 1 && fatorProducao(bat) === 1);
  ok('guardiã voa mais segura', fatorRisco(gua) < 1 && fatorRisco(cru) === 1);
  ok('comum não tem bônus',
    fatorColeta(cru) === 1 && fatorProducao(cru) === 1 && fatorRisco(cru) === 1);

  // A vaga do campo é da batedora; a da guarda, da guardiã.
  const fila = [{ talento: null }, { talento: 'defesa' }, { talento: 'coleta' }];
  ok('a colmeia manda a batedora ao campo', melhorPara(fila, 'coleta').talento === 'coleta');
  ok('e a guardiã para a defesa', melhorPara(fila, 'defesa').talento === 'defesa');
  ok('sem ninguém do ramo, vai a primeira',
    melhorPara([{ talento: null }, { talento: 'defesa' }], 'coleta').talento === null);
  ok('lista vazia não quebra', melhorPara([], 'coleta') === null);

  // Numa colmeia com uma batedora, é ela que sai — não a primeira da lista.
  const escala = novoJogo(11);
  escala.campos.forEach((c) => { c.alocadas = 0; c.polenAlocadas = 0; });
  const operarias = escala.abelhas.filter((a) => a.papel === 'operaria');
  operarias[0].talento = null;
  operarias[1].talento = 'coleta';
  A.alocar(escala, 'campainhas', 'nectar', 1);
  for (let i = 0; i < 30 * 3; i++) passo(escala, 1 / 30);
  ok('a batedora é quem vai a campo',
    escala.abelhas.find((a) => a.campo === 'campainhas')?.talento === 'coleta',
    escala.abelhas.map((a) => `${a.talento}:${a.estado}`).join(','));

  // O talento sobrevive ao save — sem isso a colônia se despersonaliza ao voltar.
  const guardado = novoJogo(42);
  for (let i = 0; i < 6; i++) A.nascerAbelha(guardado);
  const antesTal = guardado.abelhas.map((a) => a.talento ?? 'comum').join(',');
  const depoisTal = S.desserializar(JSON.parse(JSON.stringify(S.serializar(guardado))))
    .abelhas.map((a) => a.talento ?? 'comum').join(',');
  ok('talento sobrevive ao save', antesTal === depoisTal, `${antesTal} vs ${depoisTal}`);

  // ------------------------------------------------ 8. câmera

  const favo = novoJogo(42);
  const semCam = geometriaFavo(favo, 1280, 720);
  const comCam = geometriaFavo(favo, 1280, 720, { x: 120, y: -60 });
  ok('a câmera desloca o favo',
    comCam.cx === semCam.cx + 120 && comCam.cy === semCam.cy - 60);
  ok('a câmera não muda o tamanho do hexágono', comCam.tam === semCam.tam);
  ok('sem câmera nada muda',
    geometriaFavo(favo, 1280, 720, null).cx === semCam.cx);

  // Desenho e toque leem a mesma origem: sem isso, tocar numa célula depois de
  // mover a vista acertaria a célula errada.
  const cam = { x: 150, y: 80 };
  const g8 = geometriaFavo(favo, 1280, 720, cam);
  for (const celula of celulasArray(favo)) {
    const p8 = centroDaCelula(celula, g8.cx, g8.cy, g8.tam);
    const achou = dePixel(p8.x - g8.cx, p8.y - g8.cy, g8.tam);
    if (achou.q !== celula.q || achou.r !== celula.r) {
      ok(`toque acerta a célula ${celula.q},${celula.r} com a vista movida`, false,
        `achou ${achou.q},${achou.r}`);
    }
  }
  ok('toque acerta todas as células com a vista movida', true);

  // O limite impede empurrar o favo pra fora da tela e ficar sem referência.
  const solta = limitarCamera({ x: 99999, y: -99999 }, 1000, 800);
  ok('a câmera tem teto', solta.x <= 1000 && solta.y >= -800, JSON.stringify(solta));
  ok('o teto é proporcional à tela',
    limitarCamera({ x: 99999, y: 0 }, 2000, 800).x
    > limitarCamera({ x: 99999, y: 0 }, 1000, 800).x);
  const dentro = limitarCamera({ x: 10, y: -10 }, 1000, 800);
  ok('dentro do limite nada é mexido', dentro.x === 10 && dentro.y === -10);

  // --- zoom
  const base = geometriaFavo(favo, 1280, 720, { x: 0, y: 0, zoom: 1 });
  const perto = geometriaFavo(favo, 1280, 720, { x: 0, y: 0, zoom: 1.5 });
  const longe = geometriaFavo(favo, 1280, 720, { x: 0, y: 0, zoom: 0.9 });
  ok('zoom aumenta o hexágono',
    Math.abs(perto.tam - base.tam * 1.5) < 1e-9, `${perto.tam} vs ${base.tam}`);
  ok('zoom reduz o hexágono', Math.abs(longe.tam - base.tam * 0.9) < 1e-9);
  ok('zoom não move o centro', perto.cx === base.cx && perto.cy === base.cy);
  ok('sem zoom nada muda', geometriaFavo(favo, 1280, 720, { x: 0, y: 0 }).tam === base.tam);

  ok('zoom tem teto', limitarZoom(99) === ZOOM.max && limitarZoom(0.01) === ZOOM.min);
  ok('a faixa de zoom é curta', ZOOM.max / ZOOM.min <= 2.5,
    `${ZOOM.min}-${ZOOM.max}`);
  ok('o passo cabe na faixa',
    ZOOM.passo > 0 && ZOOM.passo < (ZOOM.max - ZOOM.min) / 2);

  // O toque tem que acertar a mesma célula com a vista movida **e** ampliada:
  // é a combinação que mais teria chance de sair de sincronia.
  const vista = { x: 90, y: -50, zoom: ZOOM.max };
  const gz = geometriaFavo(favo, 1280, 720, vista);
  let errosZoom = 0;
  for (const celula of celulasArray(favo)) {
    const pz = centroDaCelula(celula, gz.cx, gz.cy, gz.tam);
    const achou = dePixel(pz.x - gz.cx, pz.y - gz.cy, gz.tam);
    if (achou.q !== celula.q || achou.r !== celula.r) errosZoom++;
  }
  ok('toque acerta a célula com a vista movida e ampliada', errosZoom === 0,
    `${errosZoom} erros`);

  // ------------------------------------------------ 9. dicas de primeira vez

  const aprendiz = novoJogo(42);
  ok('jogo novo não tem dica aberta', aprendiz.dica === null);

  ok('primeira vez abre', mostrarDica(aprendiz, 'florada') === true);
  ok('a dica fica marcada', aprendiz.dica === 'florada');
  fecharDica(aprendiz);
  ok('fechar limpa', aprendiz.dica === null);

  ok('segunda vez abre', mostrarDica(aprendiz, 'florada') === true);
  fecharDica(aprendiz);
  ok('terceira vez não abre', mostrarDica(aprendiz, 'florada') === false);
  ok('e não reabre a dica', aprendiz.dica === null);
  ok('o contador para no limite',
    aprendiz.dicasVistas.florada === DICAS.florada.vezes);
  ok('dica desconhecida não abre', mostrarDica(aprendiz, 'não existe') === false);

  // Fechar por id só fecha a dica certa.
  const soltaDica = novoJogo(42);
  mostrarDica(soltaDica, 'florada');
  fecharDica(soltaDica, 'encomenda');
  ok('fechar id errado não mexe', soltaDica.dica === 'florada');
  fecharDica(soltaDica, 'florada');
  ok('fechar id certo fecha', soltaDica.dica === null);

  // Na partida: abre na florada e some quando ela acaba.
  const emJogo = novoJogo(42);
  emJogo.proximaFlorada = 0;
  // Conta só a dica da florada: outras mecânicas (tempo, vespa, formigas)
  // também abrem a sua nesse intervalo, e antes o teste somava todas.
  let abriu9 = 0, fechouSozinha = false;
  for (let i = 0; i < 30 * 200; i++) {
    const antes = emJogo.dica;
    passo(emJogo, 1 / 30);
    if (antes !== 'florada' && emJogo.dica === 'florada') abriu9++;
    if (antes === 'florada' && emJogo.dica !== 'florada') fechouSozinha = true;
  }
  ok('a florada abre a dica', abriu9 === 1, `${abriu9} vezes`);
  ok('e ela some com o fim da florada', fechouSozinha);

  // O que já foi visto não volta depois de recarregar o save.
  const guardadoDica = novoJogo(42);
  mostrarDica(guardadoDica, 'florada');
  mostrarDica(guardadoDica, 'florada');
  const voltouDica = S.desserializar(JSON.parse(JSON.stringify(S.serializar(guardadoDica))));
  ok('as dicas vistas sobrevivem ao save',
    voltouDica.dicasVistas.florada === 2, JSON.stringify(voltouDica.dicasVistas));
  ok('e não reaparecem', mostrarDica(voltouDica, 'florada') === false);


  // ---------------------------------------------- 10. aluguel de polinização

  const apiario = novoJogo(42);
  apiario.campos.forEach((c) => { c.alocadas = 0; c.polenAlocadas = 0; });
  const moedasAntesAluguel = apiario.moedas;
  ok('alugar devolve ok', A.alugar(apiario).ok === true);
  const alugada = apiario.abelhas.find((a) => a.estado === 'alugada');
  ok('a abelha sai da colmeia', alugada !== undefined);
  ok('e leva o prazo combinado', alugada.restaAluguel === ALUGUEL.duracao);
  ok('alugar não paga adiantado', apiario.moedas === moedasAntesAluguel);
  for (let i = 0; i < 30 * (ALUGUEL.duracao + 2); i++) passo(apiario, 1 / 30);
  ok('volta e paga no fim', apiario.moedas === moedasAntesAluguel + ALUGUEL.pagamento,
    `${apiario.moedas} vs ${moedasAntesAluguel + ALUGUEL.pagamento}`);
  ok('e volta a ser operária da casa',
    apiario.abelhas.every((a) => a.estado !== 'alugada'));

  const inverno10 = novoJogo(42);
  inverno10.decorrido = SEGUNDOS_POR_ESTACAO * 3 + 5;
  ok('no inverno não aluga', A.alugar(inverno10).ok === false);

  // ------------------------------------------------- 11. CO2 e umidade

  ok('ar limpo não atrapalha', ritmoDoAr({ co2: 400, umidade: 55 }) === 1);
  ok('ar abafado atrasa o favo', ritmoDoAr({ co2: 2000, umidade: 55 }) < 1);
  ok('o atraso do ar tem teto',
    Math.abs(ritmoDoAr({ co2: 99999, umidade: 55 }) - (1 - AR.co2NoRitmo)) < 1e-9);
  ok('umidade na faixa não muda a fome', limiteDeFome({ co2: 400, umidade: 55 }, 45) === 45);
  ok('ar seco adianta a fome', limiteDeFome({ co2: 400, umidade: 10 }, 45) < 45);

  // Sem conseguir comer, a fome não pode cair: era o bug que o teste de
  // inverno pegou quando o limite passou a variar com o clima.
  const faminta = novoJogo(42);
  const op11 = faminta.abelhas.find((a) => a.papel === 'operaria');
  for (const v of Object.keys(faminta.pote)) faminta.pote[v] = 0;
  Object.assign(op11, { fome: 45, trabalho: { tipo: 'comer', resta: 0.001, total: 2 } });
  passo(faminta, 1 / 30);
  ok('sem mel a fome não baixa', op11.fome >= 45, `${op11.fome}`);

  // ------------------------------------------------- 12. vagas de campo

  const jogo12 = novoJogo(42);
  const campo12 = jogo12.campos[0];
  const vagasBase = vagasDoCampo(campo12, jogo12);
  ok('vagas partem do catálogo', vagasBase === campo12.slots + vagasDoFavo(jogo12));
  campo12.upgrades.posto = 2;
  ok('cada posto abre uma vaga',
    vagasDoCampo(campo12, jogo12) === vagasBase + 2 * UPGRADES.posto.ganho);

  // O favo também abre vaga: sem isso a produção tinha teto fixo de 34 vagas
  // enquanto a colônia chegava a 90 operárias.
  const favoGrande = novoJogo(42);
  const antesDoFavo = vagasDoCampo(favoGrande.campos[0], favoGrande);
  let abertasNoTeste = 0;
  while (abertasNoTeste < VAGAS.porCelulas) {
    const t = celulasArray(favoGrande).find((c) => c.estado === 'travada');
    if (!t) break;
    A.liberarCelula(favoGrande, t);
    abertasNoTeste++;
  }
  ok('cada punhado de células abre uma vaga em cada campo',
    vagasDoCampo(favoGrande.campos[0], favoGrande) === antesDoFavo + 1,
    `${antesDoFavo} -> ${vagasDoCampo(favoGrande.campos[0], favoGrande)}`);
  ok('e vale para todos os campos, não só o primeiro',
    favoGrande.campos.every((c) => vagasDoCampo(c, favoGrande) === c.slots + vagasDoFavo(favoGrande)));
  ok('sem estado a conta cai na base, sem quebrar',
    vagasDoCampo(favoGrande.campos[0]) === favoGrande.campos[0].slots);

  const escalado = novoJogo(42);
  escalado.moedas = 1e6;
  for (let i = 0; i < 12; i++) A.nascerAbelha(escalado);
  escalado.campos[0].alocadas = 0;
  let coube = 0;
  while (A.alocar(escalado, 'campainhas', 'nectar', 1).ok) coube++;
  ok('a alocação respeita as vagas', coube === vagasDoCampo(escalado.campos[0], escalado),
    `${coube} de ${vagasDoCampo(escalado.campos[0], escalado)}`);
  A.comprarUpgrade(escalado, 'campainhas', 'posto');
  ok('e o posto abre lugar na hora', A.alocar(escalado, 'campainhas', 'nectar', 1).ok === true);

  // -------------------------------------------------- 13. enxameação

  const apertada = novoJogo(7);
  for (let i = 0; i < 30; i++) A.nascerAbelha(apertada);
  const pressao = pressaoDoEnxame(apertada);
  ok('colmeia lotada fica apertada', pressao.apertado === true);
  ok('e diz quantas células faltam', pressao.celulasQueFaltam > 0);

  const folgada = novoJogo(7);
  ok('colônia pequena não enxameia', pressaoDoEnxame(folgada).apertado === false);

  const antesEnxame = apertada.abelhas.length;
  const moedas13 = apertada.moedas;
  for (let i = 0; i < 30 * (ENXAME.aviso + 2); i++) passo(apertada, 1 / 30);
  ok('metade parte', apertada.abelhas.length < antesEnxame * 0.7,
    `${antesEnxame} -> ${apertada.abelhas.length}`);
  ok('e o enxame é vendido', apertada.moedas > moedas13);
  ok('a rainha nunca vai embora',
    apertada.abelhas.some((a) => a.papel === 'rainha'));
  ok('as turmas não ficam mentindo',
    apertada.campos.every((c) => c.alocadas
      <= apertada.abelhas.filter((a) => a.campo === c.id && a.recurso === 'nectar').length));

  // Abrir espaço a tempo cancela.
  const salva = novoJogo(7);
  for (let i = 0; i < 30; i++) A.nascerAbelha(salva);
  salva.moedas = 1e6;
  for (let i = 0; i < 30 * 3; i++) passo(salva, 1 / 30);
  ok('o aviso abre antes de partir', salva.enxame !== null);
  const quantasAntes = salva.abelhas.length;
  for (let i = 0; i < 14; i++) {
    const t13 = celulasArray(salva).find((c) => c.estado === 'travada');
    if (t13) A.comprarCelula(salva, t13);
  }
  for (let i = 0; i < 30 * 3; i++) passo(salva, 1 / 30);
  ok('comprar célula cancela o enxame', salva.enxame === null);
  ok('e ninguém foi embora', salva.abelhas.length === quantasAntes);

  // ------------------------------------------------ 14. chuva e seca

  ok('sem tempo virado nada muda',
    fatorDaColeta(novoJogo(1)) === 1 && fatorDaRebrota(novoJogo(1)) === 1);
  const chovendo = { tempo: { tipo: 'chuva', resta: 5 } };
  ok('chuva derruba a coleta', fatorDaColeta(chovendo) === TEMPO.chuva.coleta);
  ok('e não mexe na rebrota', fatorDaRebrota(chovendo) === 1);
  const secando = { tempo: { tipo: 'seca', resta: 5 } };
  ok('seca derruba a rebrota', fatorDaRebrota(secando) === TEMPO.seca.rebrota);
  ok('e não mexe na coleta', fatorDaColeta(secando) === 1);

  const comTempo = novoJogo(42);
  comTempo.proximoTempo = 0;
  let viu = null;
  for (let i = 0; i < 30 * 200; i++) {
    passo(comTempo, 1 / 30);
    if (tempoAtivo(comTempo)) { viu = tempoAtivo(comTempo).tipo; break; }
  }
  ok('o tempo vira sozinho durante a partida', viu !== null, 'nada em 200 s');

  const geladoTempo = novoJogo(3);
  geladoTempo.decorrido = SEGUNDOS_POR_ESTACAO * 3 + 5;
  geladoTempo.proximoTempo = 0;
  for (let i = 0; i < 30 * 20; i++) passo(geladoTempo, 1 / 30);
  ok('não chove no inverno', tempoAtivo(geladoTempo) === null);

  // --------------------------------------------------- 15. mel misturado

  const vidro = novoJogo(1);
  ok('sem as três não mistura', A.misturar(vidro).ok === false);
  for (const v of MISTURA.entrada) vidro.pote[v] = 1;
  ok('com as três mistura', A.misturar(vidro).ok === true);
  ok('gasta um de cada', MISTURA.entrada.every((v) => vidro.pote[v] === 0));
  ok('e rende um do misturado', vidro.pote[MISTURA.saida] === 1);
  const soma = MISTURA.entrada.reduce((n, v) => n + VARIEDADES[v].base, 0);
  ok('o misturado vale mais que a soma', VARIEDADES[MISTURA.saida].base > soma,
    `${VARIEDADES[MISTURA.saida].base} vs ${soma}`);
  ok('nenhum campo produz o misturado',
    CAMPOS.every((c) => c.variedade !== MISTURA.saida));

  // ----------------------------------------------------- 16. rainha

  const jovem = novoJogo(42);
  ok('rainha nova está no auge', vigorDaRainha(jovem) === 1);
  jovem.decorrido = SEGUNDOS_POR_ANO * (RAINHA.augeAnos + RAINHA.declinioAnos + 2);
  ok('rainha velha chega ao mínimo',
    Math.abs(vigorDaRainha(jovem) - RAINHA.vigorMinimo) < 1e-9);
  ok('e demora mais a pôr',
    intervaloDePostura(jovem) > intervaloDePostura(novoJogo(42)));

  const corte = novoJogo(42);
  corte.decorrido = SEGUNDOS_POR_ANO * 6;
  corte.ano = 7;
  ok('sem mel não coroa', A.coroarRainha(corte).ok === false);
  for (const v of Object.keys(corte.pote)) corte.pote[v] = 0;
  corte.pote.silvestre = RAINHA.custoMel;
  ok('com mel coroa', A.coroarRainha(corte).ok === true);
  ok('o mel é cobrado',
    Object.values(corte.pote).reduce((n, v) => n + v, 0) === 0);
  ok('e abre a janela sem postura', emInterregno(corte) === true);
  ok('coroar de novo no interregno é recusado', A.coroarRainha(corte).ok === false);
  for (let i = 0; i < 30 * (RAINHA.interregno + 1); i++) passo(corte, 1 / 30);
  ok('a janela fecha sozinha', emInterregno(corte) === false);
  ok('e a rainha nova está no auge', vigorDaRainha(corte) === 1);
  ok('idade zera com a troca', idadeDaRainha(corte) < SEGUNDOS_POR_ANO);

  // ------------------------------------------------- 17. quarto campo

  const urzal = CAMPOS.find((c) => c.id === 'urzal');
  ok('o urzal existe', urzal !== undefined);
  ok('é o mais rápido', CAMPOS.every((c) => c.taxa <= urzal.taxa));
  ok('é perto e seguro', urzal.risco === 0 && urzal.viagem < 8);
  ok('mas se recompõe devagar', urzal.rebrota < 1);
  ok('e guarda pouco', urzal.nectarMax < CAMPOS.find((c) => c.id === 'acacias').nectarMax);

  // ------------------------------------------------- 18. formigas

  const colmeia18 = novoJogo(3);
  colmeia18.pote.silvestre = 5;
  colmeia18.moedas = 100;
  colmeia18.proximaFormiga = 0;
  passo(colmeia18, 1 / 30);
  ok('as formigas atacam', formigasAtacando(colmeia18) !== null);
  for (let i = 0; i < 30 * 5; i++) passo(colmeia18, 1 / 30);
  ok('e levam mel enquanto ninguém age', colmeia18.pote.silvestre < 5);
  const moedas18 = colmeia18.moedas;
  const potePos = colmeia18.pote.silvestre;
  ok('vedar devolve ok', vedarEntrada(colmeia18).ok === true);
  ok('vedar custa moedas', colmeia18.moedas === moedas18 - FORMIGAS.custoVedar);
  ok('e o roubo para', formigasAtacando(colmeia18) === null);
  for (let i = 0; i < 30 * 5; i++) passo(colmeia18, 1 / 30);
  ok('depois de vedado o mel fica', colmeia18.pote.silvestre >= potePos - 1e-6);
  ok('sem formiga não dá pra vedar', vedarEntrada(colmeia18).ok === false);

  const semMoeda = novoJogo(3);
  semMoeda.moedas = 0;
  semMoeda.proximaFormiga = 0;
  passo(semMoeda, 1 / 30);
  ok('sem moeda não veda', vedarEntrada(semMoeda).ok === false);

  // --------------------------------------------- 19. dicas das outras

  for (const id of ['florada', 'tempo', 'enxame', 'formigas', 'encomenda', 'vespa', 'inverno', 'primavera']) {
    ok(`existe dica de ${id}`, DICAS[id] !== undefined && DICAS[id].linhas.length > 0);
  }

  // ------------------------------------------------- 20. conquistas

  K.apagarConquistas();
  ok('começa sem nada', K.ler().venceu === false);
  ok('desafios travados de início', K.desafiosLiberados() === false);
  K.registrarVitoria();
  ok('vencer libera os desafios', K.desafiosLiberados() === true);
  ok('e o melhor ano é guardado', K.registrarAno(5) === true && K.ler().melhorAno === 5);
  ok('ano pior não sobrescreve', K.registrarAno(3) === false && K.ler().melhorAno === 5);
  K.apagarConquistas();

  // ------------------------------------------- 21. cartões minimizáveis

  const cartoes = {};
  ok('cartão começa aberto', estaMinimizado(cartoes, 'enxame') === false);
  alternarMinimizado(cartoes, 'enxame');
  ok('minimizar marca só aquele', estaMinimizado(cartoes, 'enxame') === true
    && estaMinimizado(cartoes, 'formigas') === false);
  alternarMinimizado(cartoes, 'enxame');
  ok('e o mesmo toque devolve', estaMinimizado(cartoes, 'enxame') === false);
  ok('ui ausente não quebra', estaMinimizado(undefined, 'enxame') === false);
  alternarMinimizado(undefined, 'enxame');           // não pode lançar
  ok('alternar sem ui não quebra', true);

  // O recuo do botão existe para o número do título não ficar embaixo dele.
  for (const [L21, A21] of [[1280, 720], [375, 812]]) {
    const m21 = medidas(L21, A21);
    ok(`o botão reserva espaço em ${L21}`, recuoDoBotao(m21) >= 28);
  }

  // ------------------------------------------------ 22. sino de avisos

  const calmo = novoJogo(42);
  ok('colmeia calma não tem aviso', avisosAtivos(calmo).length === 0);
  ok('e o sino não pisca', temUrgente(calmo) === false);

  const agitado = novoJogo(42);
  agitado.enxame = { resta: 20 };
  agitado.formigas = { resta: 10, roubado: 0 };
  agitado.ameaca = { resta: 8 };
  agitado.encomenda = { variedade: 'trevo', quantidade: 3, entregue: 0, vence: 999, recompensa: 40 };
  const ativos22 = avisosAtivos(agitado);
  ok('lista tudo que está valendo', ativos22.length === 4, ativos22.join(','));
  ok('urgente vem antes do informativo',
    ativos22.indexOf('enxame') < ativos22.indexOf('encomenda'));
  const soEncomenda = novoJogo(42);
  soEncomenda.encomenda = agitado.encomenda;
  ok('encomenda sozinha não faz piscar', temUrgente(soEncomenda) === false);
  ok('e ainda assim aparece na lista',
    avisosAtivos(soEncomenda).join(',') === 'encomenda');
  ok('ameaça faz piscar', temUrgente(agitado) === true);

  ok('tudo é novo antes de abrir', avisosNovos(agitado, []).length === 4);
  ok('nada é novo depois de abrir',
    avisosNovos(agitado, avisosAtivos(agitado)).length === 0);
  agitado.tempo = null;
  agitado.ameaca = null;
  agitado.formigas = null;
  agitado.enxame = { resta: 5 };
  agitado.encomenda = null;
  ok('o que sumiu sai da lista', avisosAtivos(agitado).join(',') === 'enxame');

  // Um aviso que chega depois de o jogador ter aberto o painel volta a ser novo.
  const vistosAntes = ['enxame'];
  agitado.formigas = { resta: 9, roubado: 0 };
  ok('aviso que chega depois volta a ser novo',
    avisosNovos(agitado, vistosAntes).join(',') === 'formigas');

  // ------------------------------------------------ 23. tela de início

  ok('a grade de desafios cresce com o catálogo',
    alturaDosChips(Object.keys(DESAFIOS).length) > alturaDosChips(2));
  ok('duas colunas por linha',
    alturaDosChips(4) === alturaDosChips(3), `${alturaDosChips(4)} vs ${alturaDosChips(3)}`);
  ok('a altura padrão é a do catálogo inteiro',
    alturaDosChips() === alturaDosChips(Object.keys(DESAFIOS).length));

  // A tela de início e o menu leem a mesma grade: um desafio novo aparece nos
  // dois sem ninguém lembrar de atualizar o segundo.
  ok('início e menu compartilham a grade', typeof desenharChips === 'function');

  // ------------------------------------------ 24. espaçamento de eventos

  ok('sem evento nenhum, o espaço é livre',
    segundosDesdeOUltimoEvento(novoJogo(42)) === Infinity);

  const espacador = novoJogo(42);
  espacador.decorrido = 500;
  let adiado = null;
  ok('o primeiro evento passa',
    tentarEvento(espacador, (e) => { adiado = e; }) === true);
  ok('e fica registrado', espacador.ultimoEvento === 500);
  ok('nada foi adiado', adiado === null);

  // Logo em seguida, o segundo é barrado e reagendado.
  espacador.decorrido = 500 + EVENTOS.espacoMinimo / 2;
  ok('o segundo é barrado', tentarEvento(espacador, (e) => { adiado = e; }) === false);
  ok('e sai com atraso sorteado',
    adiado >= EVENTOS.adiamentoMin && adiado <= EVENTOS.adiamentoMax, `${adiado}`);
  ok('o barrado não vira o último evento', espacador.ultimoEvento === 500);

  // Passado o espaço mínimo, volta a passar.
  espacador.decorrido = 500 + EVENTOS.espacoMinimo + 0.1;
  ok('depois do espaço mínimo passa', tentarEvento(espacador) === true);

  // Numa partida de verdade: nenhum par de eventos abaixo do espaço mínimo.
  const ritmo = novoJogo(7);
  const inicios = [];
  const antes = { fl: false, enc: null, tp: null, fo: null, ve: null };
  for (let i = 0; i < 30 * 900; i++) {
    if (ritmo.escolha) escolherBencao(ritmo, ritmo.escolha.opcoes[0].id);
    if (i % 30 === 0) {
      for (const c of A.celulasMaduras(ritmo)) A.colher(ritmo, c);
      for (const v of Object.keys(ritmo.pote)) A.vender(ritmo, v, relogio(ritmo.decorrido).estacao);
    }
    passo(ritmo, 1 / 30);
    const fl = ritmo.campos.some((c) => (c.florada ?? 0) > 0);
    if (fl && !antes.fl) inicios.push(ritmo.decorrido); antes.fl = fl;
    if (ritmo.encomenda && !antes.enc) inicios.push(ritmo.decorrido); antes.enc = ritmo.encomenda;
    if (ritmo.tempo && !antes.tp) inicios.push(ritmo.decorrido); antes.tp = ritmo.tempo;
    if (ritmo.formigas && !antes.fo) inicios.push(ritmo.decorrido); antes.fo = ritmo.formigas;
    if (ritmo.ameaca && !antes.ve) inicios.push(ritmo.decorrido); antes.ve = ritmo.ameaca;
    if (ritmo.derrota || ritmo.vitoria) break;
  }
  const juntos = inicios.filter((t, i) => i > 0 && t - inicios[i - 1] < EVENTOS.espacoMinimo - 0.1);
  ok('nenhum par de eventos amontoado na partida', juntos.length === 0,
    `${juntos.length} pares em ${inicios.length} eventos`);
  ok('e os eventos continuam acontecendo', inicios.length >= 4,
    `${inicios.length} em 900 s`);

  // ------------------------------- 25. ordem de desenho do fim de partida

  // A tela de derrota registra uma zona de tela inteira. Se ela for desenhada
  // **depois** da tela de início, essa zona ganha o hit-test e engole o toque:
  // o jogador vê "não sobreviveu", toca, e nada acontece — foi exatamente o
  // que aconteceu quando a tela de início entrou.
  const fonteCena = await (await fetch('/src/render/cena.js')).text();
  const posInicio = fonteCena.indexOf('desenharInicio(ctx');
  const posDerrota = fonteCena.indexOf('desenharDerrota(ctx');
  const posVitoria = fonteCena.indexOf('desenharVitoria(ctx');
  ok('a tela de início é desenhada depois da derrota',
    posInicio > posDerrota && posDerrota > 0, `${posInicio} vs ${posDerrota}`);
  ok('e depois da vitória', posInicio > posVitoria && posVitoria > 0);

  // E o toque na zona da derrota, se chegar até o tratador da tela de início,
  // tem que recomeçar em vez de sumir.
  const fonteMain = await (await fetch('/src/main.js')).text();
  const tratador = fonteMain.slice(fonteMain.indexOf('function tratarInicio'),
    fonteMain.indexOf('function tratarZona'));
  ok('a tela de início trata a zona da derrota',
    tratador.includes("'derrota:reiniciar'") && tratador.includes("'vitoria:reiniciar'"));

  // ------------------------------------------------- 26. tutorial guiado

  const semTutorial = novoJogo(42);
  ok('jogo normal não tem tutorial', tutorialAtivo(semTutorial) === null);

  const aprendiz2 = novoJogo(42);
  comecarTutorial(aprendiz2);
  ok('o tutorial começa no primeiro passo', tutorialAtivo(aprendiz2)?.indice === 0);
  ok('e zera as turmas', aprendiz2.campos.every((c) => c.alocadas === 0),
    'senão o passo de mandar a coletora já nasceria cumprido');

  // Passo de leitura só anda no "entendi"; passo de ação, só quando é feito.
  const primeiro = tutorialAtivo(aprendiz2);
  ok('o primeiro passo é leitura', primeiro.tipo === 'leitura');
  ok('ação não avança passo de leitura', avancarTutorial(aprendiz2, {}) === false);
  ok('entendi avança', confirmarPasso(aprendiz2) === true);

  const segundo = tutorialAtivo(aprendiz2);
  ok('o segundo passo é ação', segundo.tipo === 'acao');
  ok('entendi não avança passo de ação', confirmarPasso(aprendiz2) === false);
  ok('e ele espera a ação', avancarTutorial(aprendiz2, { painel: null }) === false);
  ok('cumprida a ação, avança', avancarTutorial(aprendiz2, { painel: 'campos' }) === true);

  // Todo passo tem o que precisa para ser desenhado e resolvido.
  for (const p of PASSOS) {
    const completo = p.id && p.titulo && Array.isArray(p.linhas) && p.linhas.length
      && (p.tipo === 'leitura' || typeof p.concluido === 'function');
    ok(`o passo ${p.id} está completo`, Boolean(completo));
  }

  // Pular sai de vez.
  const pulador = novoJogo(42);
  comecarTutorial(pulador);
  pularTutorial(pulador);
  ok('pular encerra o tutorial', tutorialAtivo(pulador) === null);

  // O tutorial inteiro se resolve e devolve uma partida normal — sem travar em
  // nenhum passo, que é o risco de um roteiro com pré-condições.
  const guiado = novoJogo(42);
  comecarTutorial(guiado);
  const visitados = [];
  let voltas = 0;
  while (tutorialAtivo(guiado) && voltas++ < 40) {
    const p = tutorialAtivo(guiado);
    visitados.push(p.id);
    if (p.tipo === 'leitura') { confirmarPasso(guiado); continue; }
    const antes = p.id;
    // O jogador age quando lê o passo, não um quadro depois. Alocar *dentro* do
    // laço mandava uma segunda coletora depois de o passo já ter avançado, e
    // com as duas operárias no campo ninguém fica dentro pra curar: 146s de
    // espera que nenhum jogador vive. Ver `ninguemDentro` em sim/tutorial.js.
    const painel = { painel: antes === 'abrirCampos' ? 'campos' : null };
    if (antes === 'mandarColetora') A.alocar(guiado, 'campainhas', 'nectar', 1);
    for (let i = 0; i < 30 * 150 && tutorialAtivo(guiado)?.id === antes; i++) {
      passo(guiado, 1 / 30);
      if (antes === 'colher') for (const c of A.celulasMaduras(guiado)) A.colher(guiado, c);
      if (antes === 'vender') {
        for (const v of Object.keys(guiado.pote)) A.vender(guiado, v, relogio(guiado.decorrido).estacao);
      }
      avancarTutorial(guiado, painel);
    }
    if (tutorialAtivo(guiado)?.id === antes) break;
  }
  ok('o tutorial inteiro se resolve', guiado.tutorial === null,
    `travou em ${tutorialAtivo(guiado)?.id ?? '—'}`);
  ok('passa por todos os passos', visitados.length === PASSOS.length,
    `${visitados.length} de ${PASSOS.length}`);
  ok('e é breve', guiado.decorrido < 60, `${Math.round(guiado.decorrido)}s de jogo`);
  ok('com uma coletora só no campo',
    guiado.campos.find((c) => c.id === 'campainhas').alocadas === 1);
  ok('termina com a partida em andamento', guiado.derrota === null && guiado.vendidoNoAno > 0);

  // Quem não conhece o jogo toca o + duas vezes, manda as duas operárias pro
  // campo e fica dois minutos olhando "espere o mel" sem saber por quê. O passo
  // tem que dizer o que houve.
  const todasFora = novoJogo(42);
  comecarTutorial(todasFora);
  todasFora.tutorial.passo = PASSOS.findIndex((x) => x.id === 'esperarMel');
  A.alocar(todasFora, 'campainhas', 'nectar', 1);
  ok('sem alerta se alguém ficou dentro', tutorialAtivo(todasFora).alerta(todasFora) === null);
  A.alocar(todasFora, 'campainhas', 'nectar', 1);
  const alertaMel = tutorialAtivo(todasFora).alerta(todasFora);
  ok('alerta quando todas vão pro campo', Array.isArray(alertaMel) && alertaMel.length > 0,
    `${alertaMel}`);
  const fonteCartao = await (await fetch('/src/ui/tutorial.js')).text();
  ok('e o cartão desenha esse alerta', fonteCartao.includes('passo.alerta'));

  // Sobrevive ao save: recarregar no meio não perde o lugar.
  const guardadoTut = novoJogo(42);
  comecarTutorial(guardadoTut);
  confirmarPasso(guardadoTut);
  const voltouTut = S.desserializar(JSON.parse(JSON.stringify(S.serializar(guardadoTut))));
  ok('o tutorial sobrevive ao save', tutorialAtivo(voltouTut)?.indice === 1);

  // ------------------------------------- 27. dicas de acao pausam o jogo
  const acoesComDica = Object.entries(DICAS).filter(([, d]) => d.pausa);
  ok('ha dica de acao para as acoes principais', acoesComDica.length >= 12,
    `${acoesComDica.length}`);
  ok('toda dica de acao aparece uma vez so',
    acoesComDica.every(([, d]) => d.vezes === 1));
  ok('nenhuma dica de evento pausa',
    ['florada', 'encomenda', 'vespa', 'inverno', 'formigas', 'tempo', 'enxame']
      .every((id) => !DICAS[id].pausa));

  // Escalar a primeira coletora e o momento em que o jogo precisa explicar a
  // viagem e o silo — e parar o relogio, porque o jogador decidiu sem saber.
  const novato = novoJogo(42);
  novato.velocidade = 3;
  A.alocar(novato, 'campainhas', 'nectar', 1);
  ok('a primeira coletora abre a dica', dicaAtiva(novato)?.id === 'acaoNectar');
  ok('e o jogo para', novato.velocidade === 0);
  ok('guardando a velocidade de antes', novato.velocidadeAntesDaDica === 3);
  ok('dicaPausada avisa quem trata o toque', dicaPausada(novato) === true);
  fecharDica(novato);
  ok('fechar devolve a velocidade', novato.velocidade === 3);
  ok('e limpa a guarda', novato.velocidadeAntesDaDica === null);

  A.alocar(novato, 'campainhas', 'nectar', 1);
  ok('a mesma dica nao volta', dicaAtiva(novato) === null);

  // Polen tem dica propria: e uma dinamica diferente da do nectar.
  const comFolga = novoJogo(42);
  for (let i = 0; i < 6; i++) A.nascerAbelha(comFolga);
  A.alocar(comFolga, 'campainhas', 'polen', 1);
  ok('polen tem dica propria', dicaAtiva(comFolga)?.id === 'acaoPolen');

  // Acao recusada nao explica nada nem para o jogo.
  const semAbelhas = novoJogo(1);
  const recusa = A.alocar(semAbelhas, 'campainhas', 'nectar', 99);
  ok('acao recusada nao abre dica', !recusa.ok && dicaAtiva(semAbelhas) === null);
  ok('nem para o relogio', semAbelhas.velocidade === 1);

  // O tutorial ja explica passo a passo: duas explicacoes por cima e pior.
  const aprendiz3 = novoJogo(7);
  comecarTutorial(aprendiz3);
  A.alocar(aprendiz3, 'campainhas', 'nectar', 1);
  ok('o tutorial silencia as dicas', dicaAtiva(aprendiz3) === null);
  ok('e nao para o jogo', aprendiz3.velocidade === 1);

  // Recarregar no meio nao pode deixar a colmeia parada pra sempre.
  const salvoParado = novoJogo(9);
  salvoParado.velocidade = 6;
  A.alocar(salvoParado, 'campainhas', 'nectar', 1);
  const voltouSalvo = S.desserializar(JSON.parse(JSON.stringify(S.serializar(salvoParado))));
  ok('a dica sobrevive ao save', dicaAtiva(voltouSalvo)?.id === 'acaoNectar');
  ok('ainda parada', voltouSalvo.velocidade === 0);
  fecharDica(voltouSalvo);
  ok('e devolve a velocidade certa depois do save', voltouSalvo.velocidade === 6);

  // Fim de partida para o jogo por conta propria: fechar a dica nao destrava.
  const perdida = novoJogo(3);
  A.alocar(perdida, 'campainhas', 'nectar', 1);
  perdida.derrota = { ano: 1, meta: 9, vendido: 0 };
  perdida.velocidade = 0;
  fecharDica(perdida);
  ok('fechar a dica nao ressuscita partida perdida', perdida.velocidade === 0);

  // Vender e colher tambem explicam.
  const vendedor = novoJogo(5);
  vendedor.pote.silvestre = 3;
  A.vender(vendedor, 'silvestre', relogio(0).estacao, 1);
  ok('vender explica a meta', dicaAtiva(vendedor)?.id === 'acaoVender');

  // O cartao precisa continuar visivel com painel aberto: alocar acontece
  // dentro do painel de campos, e dica invisivel + relogio parado e travamento.
  const fonteDica = await (await fetch('/src/ui/dicas.js')).text();
  ok('a dica de acao desenha por cima do painel',
    fonteDica.includes('ui.painel && !dica.pausa'));
  ok('e escurece o fundo', fonteDica.includes('dica.pausa') && fonteDica.includes('fillRect(0, 0, L, A)'));
  const fonteDoMain = await (await fetch('/src/main.js')).text();
  ok('qualquer toque fecha a dica que pausou', fonteDoMain.includes('dicaPausada(estado)'));

  // ------------------------------------ 28. nome nos botoes de acao
  const fonteHud = await (await fetch('/src/ui/hud.js')).text();
  const nomes = [...fonteHud.matchAll(/nome: '([^']+)'/g)].map((x) => x[1]);
  ok('todo botao de acao tem nome', nomes.length === BOTOES_DE_ACAO, nomes.join(', '));
  ok('e o nome nao e o id em ingles',
    nomes.includes('impulsos') && nomes.includes('mercado')
    && nomes.includes('avisos') && nomes.includes('campos'));
  ok('o rotulo encolhe pra caber no botao', fonteHud.includes('larguraRotulo'));
  // O tutorial manda tocar nos botoes pelo nome: se o nome mudar aqui sem
  // mudar la, o passo passa a apontar pra um botao que nao existe mais.
  const fonteTut = await (await fetch('/src/sim/tutorial.js')).text();
  for (const n of ['CAMPOS', 'MERCADO', 'AVISOS']) {
    ok('o tutorial aponta para ' + n, fonteTut.includes(n));
  }

  // ------------------------------- 29. celulas de presente na virada do ano
  const abertasDe = (e) => celulasArray(e).filter((c) => c.estado !== 'travada').length;
  const anoNovo = novoJogo(42);
  anoNovo.vendidoNoAno = 9999;
  const abertasAntes = abertasDe(anoNovo);
  const compradasAntes = anoNovo.celulasCompradas;
  for (let i = 0; i < 30 * (SEGUNDOS_POR_ANO + 5) && anoNovo.ano === 1; i++) passo(anoNovo, 1 / 30);
  const ganhou = abertasDe(anoNovo) - abertasAntes;
  ok('virar o ano da celulas', anoNovo.ano === 2 && ganhou > 0, `${ganhou}`);
  ok('entre 2 e 3 celulas', ganhou >= PRESENTE_DO_ANO.min && ganhou <= PRESENTE_DO_ANO.max,
    `${ganhou}`);
  ok('o presente nao conta como compra', anoNovo.celulasCompradas === compradasAntes);
  ok('e o jogador e avisado', /c\u00e9lulas? nova/.test(anoNovo.aviso?.texto ?? ''),
    anoNovo.aviso?.texto ?? '-');

  // Presente nao pode encarecer o que vem depois: o preco segue o contador de
  // compras, e ele nao subiu.
  const precoDepois = precoDaCelula(anoNovo.celulasCompradas);
  ok('o preco da proxima celula nao subiu', precoDepois === precoDaCelula(compradasAntes));

  // Perder no fim do ano nao da presente nenhum.
  const perdeuNoAno = novoJogo(42);
  perdeuNoAno.vendidoNoAno = 0;
  const abertasPerdedor = abertasDe(perdeuNoAno);
  for (let i = 0; i < 30 * (SEGUNDOS_POR_ANO + 5) && !perdeuNoAno.derrota; i++) passo(perdeuNoAno, 1 / 30);
  ok('quem perde nao ganha celula',
    perdeuNoAno.derrota !== null && abertasDe(perdeuNoAno) === abertasPerdedor);

  // liberarCelula e o mesmo caminho da compra, sem cobrar.
  const doador = novoJogo(7);
  const travadaDoador = celulasArray(doador).find((c) => c.estado === 'travada');
  const moedasDoDoador = doador.moedas;
  ok('liberarCelula abre sem cobrar',
    A.liberarCelula(doador, travadaDoador) === true && travadaDoador.estado === 'vazia'
    && doador.moedas === moedasDoDoador);
  ok('e nao abre o que ja esta aberto', A.liberarCelula(doador, travadaDoador) === false);

  // ----------------------------------------------- filaTeste de dicas
  const filaTeste = novoJogo(11);
  mostrarDica(filaTeste, 'florada');
  mostrarDica(filaTeste, 'vespa');
  mostrarDica(filaTeste, 'enxame');
  ok('so uma dica na tela', dicaAtiva(filaTeste)?.id === 'florada');
  ok('as outras esperam na filaTeste', (filaTeste.filaDeDicas ?? []).join(',') === 'vespa,enxame');
  fecharDica(filaTeste);
  ok('fechar puxa a proxima', dicaAtiva(filaTeste)?.id === 'vespa');
  fecharDica(filaTeste);
  ok('e depois a seguinte', dicaAtiva(filaTeste)?.id === 'enxame');
  fecharDica(filaTeste);
  ok('filaTeste vazia no fim', dicaAtiva(filaTeste) === null && filaTeste.filaDeDicas.length === 0);
  ok('a filaTeste nao marca como vista quem nao apareceu',
    (novoJogo(11), true) && filaTeste.dicasVistas.enxame === 1);

  // A filaTeste sobrevive ao save: recarregar nao pode engolir explicacao.
  const filaSalva = novoJogo(12);
  mostrarDica(filaSalva, 'florada');
  mostrarDica(filaSalva, 'vespa');
  const filaVoltou = S.desserializar(JSON.parse(JSON.stringify(S.serializar(filaSalva))));
  ok('a filaTeste de dicas sobrevive ao save', (filaVoltou.filaDeDicas ?? []).includes('vespa'));

  // ------------------------------------------ 30. censo e painel de abelhas
  const colonia = novoJogo(42);
  for (let i = 0; i < 9; i++) A.nascerAbelha(colonia);
  const cs = censo(colonia);
  ok('o censo conta todas as operarias',
    cs.operarias === colonia.abelhas.filter((b) => b.papel === 'operaria').length,
    `${cs.operarias}`);
  ok('e a rainha fora delas', cs.rainha === 1);
  ok('os pendores somam as operarias',
    Object.values(cs.talentos).reduce((n, v) => n + v, 0) === cs.operarias);
  ok('os lugares somam as operarias',
    Object.values(cs.onde).reduce((n, v) => n + v, 0) === cs.operarias);
  ok('sem pendor cai em comum',
    cs.talentos.comum === colonia.abelhas.filter((b) => b.papel === 'operaria' && !b.talento).length);

  // Alugada e guarda descrevem melhor onde a abelha esta do que o campo
  // `estado`, que continua 'colmeia' nos dois casos.
  const posto = novoJogo(42);
  for (let i = 0; i < 6; i++) A.nascerAbelha(posto);
  const naCasa = censo(posto).onde.colmeia;
  A.alugar(posto);
  ok('alugada sai da colmeia no censo', censo(posto).onde.alugada === 1
    && censo(posto).onde.colmeia === naCasa - 1);
  posto.abelhas.find((b) => b.papel === 'operaria' && b.estado === 'colmeia').guarda = true;
  ok('guarda tem lugar proprio', censo(posto).onde.guarda === 1);
  ok('e continua somando certo',
    Object.values(censo(posto).onde).reduce((n, v) => n + v, 0) === censo(posto).operarias);

  // A fileira de acao ganhou o quinto botao e nao pode encostar no vidro.
  const fonteAcoes = await (await fetch('/src/ui/hud.js')).text();
  const nomesDeAcao = [...fonteAcoes.matchAll(/nome: '([^']+)'/g)].map((v) => v[1]);
  ok('ha cinco botoes de acao', nomesDeAcao.length === BOTOES_DE_ACAO, nomesDeAcao.join(','));
  ok('um deles e o de abelhas', nomesDeAcao.includes('abelhas'));
  for (const largura of [320, 375, 414, 768, 1280]) {
    const mm = medidas(largura, 720);
    const pote = areaDoPote(mm);
    const espaco = Math.round(10 * mm.esc);
    const inicio = largura - mm.margem - BOTOES_DE_ACAO * (mm.acao + espaco) + espaco;
    ok(`a fileira nao encosta no vidro em ${largura}px`, inicio > pote.x + pote.l,
      `inicio ${Math.round(inicio)} vs vidro ate ${Math.round(pote.x + pote.l)}`);
    ok(`e o botao continua tocavel em ${largura}px`, mm.acao >= 44, `${mm.acao}`);
  }

  // -------------------------------------- 31. encomendar o pendor de um ovo
  const comOvo = (semente = 42, mel = 20) => {
    const e = novoJogo(semente);
    e.pote.silvestre = mel;
    for (let i = 0; i < 30 * 60 && !celulasArray(e).some((c) => c.estado === 'ovo'); i++) {
      passo(e, 1 / 30);
    }
    return [e, celulasArray(e).find((c) => c.estado === 'ovo')];
  };

  const [ninho, celulaOvo] = comOvo();
  ok('a colmeia poe um ovo', Boolean(celulaOvo));
  const melAntes = A.totalNoPote(ninho);
  const encomenda = A.escolherPendor(ninho, celulaOvo, 'defesa');
  ok('da pra encomendar o pendor', encomenda.ok === true, encomenda.motivo ?? '');
  ok('e custa o preco da tabela',
    melAntes - A.totalNoPote(ninho) === NINHADA.custoPendor,
    `${melAntes - A.totalNoPote(ninho)}`);
  ok('o ovo lembra o pendor', ovosDaCelula(celulaOvo)[0].pendor === 'defesa');
  ok('pedir o mesmo de novo e recusado',
    A.escolherPendor(ninho, celulaOvo, 'defesa').ok === false);

  const antesDaTroca = A.totalNoPote(ninho);
  ok('trocar de ideia funciona', A.escolherPendor(ninho, celulaOvo, 'coleta').ok === true);
  ok('mas cobra de novo', antesDaTroca - A.totalNoPote(ninho) === NINHADA.custoPendor);

  // O que importa no fim: a abelha nasce com o que foi encomendado.
  A.escolherPendor(ninho, celulaOvo, 'defesa');
  for (const o of ovosDaCelula(celulaOvo)) o.cura = 1;
  const idsAntes = new Set(ninho.abelhas.map((b) => b.id));
  A.eclodirNinhada(ninho, celulaOvo);
  const recemNascida = ninho.abelhas.find((b) => !idsAntes.has(b.id));
  ok('a abelha nasce com o pendor encomendado', recemNascida?.talento === 'defesa',
    recemNascida?.talento ?? '-');

  // Sem encomenda, o sorteio continua mandando — o padrao nao mudou.
  const [natural, celulaNatural] = comOvo(3);
  if (celulaNatural) {
    for (const o of ovosDaCelula(celulaNatural)) o.cura = 1;
    const antesN = new Set(natural.abelhas.map((b) => b.id));
    A.eclodirNinhada(natural, celulaNatural);
    const nascidas = natural.abelhas.filter((b) => !antesN.has(b.id));
    ok('sem encomenda o pendor continua sorteado',
      nascidas.length > 0 && nascidas.every((b) => b.talento === null || TALENTOS[b.talento]));
  } else {
    ok('sem encomenda o pendor continua sorteado', false, 'nao saiu ovo');
  }

  // Sem mel nao da: a encomenda e um remedio, nao um passe livre.
  const [seco, celulaSeca] = comOvo(7, 0);
  ok('sem mel a encomenda e recusada',
    celulaSeca ? A.escolherPendor(seco, celulaSeca, 'defesa').ok === false : false);
  ok('e o pendor continua vazio',
    celulaSeca ? (ovosDaCelula(celulaSeca)[0].pendor ?? null) === null : false);

  // Pendor invalido e celula que nao e ovo.
  ok('pendor desconhecido e recusado', A.escolherPendor(ninho, celulaOvo, 'voar').ok === false);
  const vazia = celulasArray(ninho).find((c) => c.estado === 'vazia');
  ok('so ovo aceita encomenda', vazia ? A.escolherPendor(ninho, vazia, 'defesa').ok === false : true);

  // Recarregar nao perde a encomenda.
  const [ovoGuardado, celulaGuardada] = comOvo(11);
  A.escolherPendor(ovoGuardado, celulaGuardada, 'producao');
  const voltouOvo = S.desserializar(JSON.parse(JSON.stringify(S.serializar(ovoGuardado))));
  const celulaVolta = celulasArray(voltouOvo).find((c) => c.estado === 'ovo');
  ok('a encomenda sobrevive ao save',
    celulaVolta ? ovosDaCelula(celulaVolta).some((o) => o.pendor === 'producao') : false);

  // A tela da ninhada precisa oferecer os tres.
  const fonteNinhada = await (await fetch('/src/ui/ninhada.js')).text();
  ok('a tela da ninhada oferece os tres pendores',
    fonteNinhada.includes("['coleta', 'producao', 'defesa']"));
  ok('e registra a zona de encomenda', fonteNinhada.includes("'ninhada:pendor'"));

  // -------------------------------- 32. eixos da partida: duracao e dificuldade
  const curtaTranquila = novoJogo(42, { duracao: 'curta', dificuldade: 'tranquila' });
  const longaBrutal = novoJogo(42, { duracao: 'longa', dificuldade: 'brutal' });
  ok('duracao curta tem menos anos que longa',
    anosDaPartida(curtaTranquila) < anosDaPartida(longaBrutal),
    `${anosDaPartida(curtaTranquila)} vs ${anosDaPartida(longaBrutal)}`);
  ok('toda duracao cabe na tabela da meta',
    Object.values(DURACOES).every((d) => d.anos <= META.porAno.length),
    Object.values(DURACOES).map((d) => d.anos).join(','));

  const normal = novoJogo(42);
  ok('dificuldade tranquila pede menos', metaDoAno(1, curtaTranquila) < metaDoAno(1, normal));
  ok('e brutal pede mais', metaDoAno(1, longaBrutal) > metaDoAno(1, normal));
  ok('normal e exatamente a tabela', metaDoAno(3, normal) === META.porAno[2]);
  ok('o fator vale para todos os anos',
    [1, 2, 5].every((a) => metaDoAno(a, longaBrutal) > metaDoAno(a, normal)));

  // Os eixos sao independentes: trocar um nao mexe no outro.
  ok('os eixos nao se misturam',
    curtaTranquila.desafio === longaBrutal.desafio
    && curtaTranquila.duracao !== longaBrutal.duracao
    && curtaTranquila.dificuldade !== longaBrutal.dificuldade);

  // Compatibilidade: saves e testes antigos passavam so a string do desafio.
  const soDesafio = novoJogo(42, 'perigoso');
  ok('a forma antiga continua valendo',
    soDesafio.desafio === 'perigoso' && soDesafio.duracao === DURACAO_PADRAO
    && soDesafio.dificuldade === DIFICULDADE_PADRAO);

  const voltouModos = S.desserializar(JSON.parse(JSON.stringify(S.serializar(curtaTranquila))));
  ok('os eixos sobrevivem ao save',
    voltouModos.duracao === 'curta' && voltouModos.dificuldade === 'tranquila');
  ok('e a meta volta igual', metaDoAno(1, voltouModos) === metaDoAno(1, curtaTranquila));

  // A vitoria segue a duracao escolhida, nao um nove fixo.
  const quaseLa = novoJogo(42, { duracao: 'curta' });
  quaseLa.ano = anosDaPartida(quaseLa);
  quaseLa.vendidoNoAno = metaDoAno(quaseLa.ano, quaseLa) + 1;
  quaseLa.decorrido = anosDaPartida(quaseLa) * SEGUNDOS_POR_ANO - 0.05;
  // Alguns quadros: um tick de 1/30 s nao cruza a virada a partir de -0,05 s.
  for (let i = 0; i < 5 && !quaseLa.vitoria; i++) passo(quaseLa, 1 / 30);
  ok('vencer na duracao curta acontece no ano dela',
    quaseLa.vitoria !== null && quaseLa.vitoria.ano === anosDaPartida(quaseLa),
    `${quaseLa.vitoria?.ano ?? '-'} de ${anosDaPartida(quaseLa)}`);

  // ------------------------------------------- 33. biomas e especies
  ok('todo bioma traz quatro campos completos',
    Object.values(BIOMAS).every((b) => b.campos.length === 4
      && b.campos.every((c) => c.sobre && typeof c.alocadasInicial === 'number'
        && typeof c.polenInicial === 'number' && c.slots > 0)),
    Object.keys(BIOMAS).join(','));
  ok('e uma especie que existe',
    Object.values(BIOMAS).every((b) => ESPECIES[b.especie]));
  ok('CAMPOS e o bioma padrao, nao uma segunda copia',
    CAMPOS === BIOMAS[BIOMA_PADRAO].campos);

  const naCaatinga = novoJogo(42, { bioma: 'caatinga' });
  const naMata = novoJogo(42, { bioma: 'mata' });
  ok('o bioma troca os campos',
    naCaatinga.campos[0].id !== naMata.campos[0].id,
    `${naCaatinga.campos[0].id} vs ${naMata.campos[0].id}`);
  ok('e a especie vem junto', naCaatinga.especie === 'jandaira');
  ok('nenhum campo comeca com vaga NaN',
    Object.values(BIOMAS).every((b) => novoJogo(1, { bioma: Object.keys(BIOMAS)
      .find((k) => BIOMAS[k] === b) }).campos
      .every((c) => Number.isFinite(c.alocadas) && Number.isFinite(c.polenAlocadas))));

  // Clima: a caatinga e mais quente que a mata na mesma estacao.
  ok('o bioma desloca a temperatura',
    temperaturaAlvo(0 + deltaDoBioma(naCaatinga, 'temperatura'), 0)
    > temperaturaAlvo(0 + deltaDoBioma(naMata, 'temperatura'), 0));
  ok('e multiplica a rebrota',
    fatorDoBioma(naCaatinga, 'rebrota') < fatorDoBioma(naMata, 'rebrota'));

  // Especie sem ferrao nao para vespa: e a diferenca mais dura entre criar
  // Apis e criar meliponineo.
  ok('africanizada defende a porta', especieDefende(naMata) === true);
  ok('jandaira nao defende', especieDefende(naCaatinga) === false);
  const semFerrao = novoJogo(42, { bioma: 'caatinga' });
  for (const a of semFerrao.abelhas) if (a.papel === 'operaria') a.talento = 'defesa';
  ok('e nenhuma guardia conta na porta dela', defensoras(semFerrao).length === 0);
  ok('o reforco manual tambem e recusado',
    enviarGuarda(Object.assign(semFerrao, { ameaca: { fase: 'aviso', vespas: [{}] } })).ok === false);

  // O mel dela vale mais por pote, e e isso que compensa a coleta menor.
  const estacaoQualquer = relogio(0).estacao;
  ok('mel de meliponineo vale mais',
    A.precoDeVenda(naCaatinga, 'silvestre', estacaoQualquer)
    > A.precoDeVenda(naMata, 'silvestre', estacaoQualquer));

  ok('o bioma entra na meta', metaDoAno(1, naCaatinga) !== metaDoAno(1, naMata));
  const voltouBioma = S.desserializar(JSON.parse(JSON.stringify(S.serializar(naCaatinga))));
  ok('bioma e especie sobrevivem ao save',
    voltouBioma.bioma === 'caatinga' && voltouBioma.especie === 'jandaira');

  // ------------------------------- 34. a tela de inicio cabe na tela
  // Ja quebrou duas vezes: titulo por cima do subtitulo, e o cartao vazando
  // por baixo depois que os cards de bioma entraram. As alturas de chip e card
  // eram fixas, entao encolher a escala quase nao mudava o total.
  for (const [L, A] of [[375, 812], [360, 640], [1280, 620], [1500, 920], [820, 1180]]) {
    for (const comSave of [false, true]) {
      const m = medidas(L, A);
      // `A - margem*2` e o tamanho PREFERIDO (margem igual em cima e embaixo).
      // O que precisa ser verdade e mais fraco: o desenho faz
      // `y = max(margem, (A-a)/2)`, entao o cartao aparece inteiro sempre que
      // `a <= A - margem`. Exigir a margem simetrica reprovava layout que
      // cabia na tela com folga embaixo.
      const d = ajustarParaCaber(m, A - m.margem * 2, comSave);
      const limite = A - m.margem;
      ok(`o cartao de inicio cabe em ${L}x${A}${comSave ? ' com save' : ''}`,
        d.a <= limite, `${Math.round(d.a)} de ${Math.round(limite)}`);
      ok(`e o botao continua tocavel em ${L}x${A}${comSave ? ' com save' : ''}`,
        d.hBotao >= 36, `${d.hBotao}`);
    }
  }

  return { total, falhas: falhas.length, detalhes: falhas };
}
