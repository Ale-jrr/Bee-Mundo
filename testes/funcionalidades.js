// Testes das sete funcionalidades novas. Rode no console do navegador:
//   (await import('/testes/funcionalidades.js')).rodar()
//
// Não tocam em localStorage: dá pra rodar com uma partida real aberta.

import { novoJogo, celulasArray } from '../src/core/estado.js';
import { passo } from '../src/sim/tick.js';
import * as A from '../src/sim/acoes.js';
import { previsaoInverno, AVISO_INVERNO } from '../src/sim/inverno.js';
import { SEGUNDOS_POR_ESTACAO, relogio } from '../src/sim/estacoes.js';
import { medidas, areaDoClima, barraSuperior } from '../src/ui/layout.js';
import { contarOrnamentos } from '../src/render/ornamentos.js';
import {
  geometriaFavo, centroDaCelula, limitarCamera, limitarZoom, ZOOM,
} from '../src/render/favo.js';
import { dePixel } from '../src/sim/hex.js';
import { DICAS, mostrarDica, fecharDica } from '../src/sim/dicas.js';
import * as S from '../src/core/save.js';
import { DESAFIO_PADRAO, regraDoDesafio, penalidadeDoInverno } from '../src/sim/desafios.js';
import {
  elenco, fatorColeta, fatorProducao, fatorRisco, melhorPara,
} from '../src/sim/talentos.js';
import { campoEmFlorada, statsComFlorada, FLORADA } from '../src/sim/floradas.js';
import { encomendaAtiva } from '../src/sim/encomendas.js';
import { VARIEDADES, precoDaCelula } from '../src/sim/economia.js';
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

export function rodar() {
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
  ok('primeira não vem antes do intervalo', abriu >= FLORADA.intervaloMin - 0.1,
    `veio aos ${abriu?.toFixed(0)}s`);

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
  for (let i = 0; i < 30 * 61; i++) passo(enc, 1 / 30);
  const pedido = encomendaAtiva(enc);
  ok('a encomenda chega', pedido !== null);
  ok('pede uma variedade que existe', pedido && VARIEDADES[pedido.variedade] !== undefined);
  ok('o prazo cai no fim de uma estação',
    Math.abs(pedido.vence % SEGUNDOS_POR_ESTACAO) < 0.05, `vence ${pedido.vence}`);
  ok('paga acima do preço do mel',
    pedido.recompensa > pedido.quantidade * VARIEDADES[pedido.variedade].base);

  // Entregar é vender: o pote certo paga, o errado não.
  const cheio = novoJogo(42);
  for (let i = 0; i < 30 * 61; i++) passo(cheio, 1 / 30);
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
  for (let i = 0; i < 30 * 61; i++) passo(meio, 1 / 30);
  const p2 = encomendaAtiva(meio);
  meio.pote[p2.variedade] = 1;
  const parcial = A.vender(meio, p2.variedade, relogio(meio.decorrido).estacao);
  ok('entrega parcial não paga', !parcial.recompensa);
  ok('entrega parcial conta', encomendaAtiva(meio).entregue === 1);

  const errado = novoJogo(42);
  for (let i = 0; i < 30 * 61; i++) passo(errado, 1 / 30);
  const p3 = encomendaAtiva(errado);
  const outra = Object.keys(errado.pote).find((v) => v !== p3.variedade);
  errado.pote[outra] = 5;
  A.vender(errado, outra, relogio(errado.decorrido).estacao);
  ok('variedade errada não conta', encomendaAtiva(errado).entregue === 0);

  // Vencida some sozinha, sem punir — é objetivo extra, não segunda meta.
  const vencida = novoJogo(42);
  for (let i = 0; i < 30 * 61; i++) passo(vencida, 1 / 30);
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
  let abriu9 = 0, fechouSozinha = false;
  for (let i = 0; i < 30 * 200; i++) {
    const antes = emJogo.dica;
    passo(emJogo, 1 / 30);
    if (!antes && emJogo.dica) abriu9++;
    if (antes && !emJogo.dica) fechouSozinha = true;
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

  return { total, falhas: falhas.length, detalhes: falhas };
}
