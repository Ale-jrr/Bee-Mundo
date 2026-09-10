// Testes do save. Rode no console do navegador:
//   (await import('/testes/save.js')).rodar()
//
// Não há runner: o projeto não usa Node. São asserções puras sobre o núcleo,
// que é determinístico, então falha aqui é falha de verdade.

import * as S from '../src/core/save.js';
import { novoJogo, celulasArray, consumirPolen } from '../src/core/estado.js';
import { passo } from '../src/sim/tick.js';
import * as A from '../src/sim/acoes.js';
import { relogio } from '../src/sim/estacoes.js';
import { CAMPOS, META, metaDoAno } from '../src/sim/economia.js';

const clonar = (x) => JSON.parse(JSON.stringify(x));

function jogarAte(segundos, semente = 42) {
  const s = novoJogo(semente);
  for (let i = 0; i < 30 * segundos; i++) {
    passo(s, 1 / 30);
    if (i % 900 === 0) {
      for (const c of A.celulasMaduras(s)) A.colher(s, c);
      for (const v of Object.keys(s.pote)) A.vender(s, v, relogio(s.decorrido).estacao);
    }
  }
  return s;
}

export function rodar() {
  const falhas = [];
  const ok = (nome, condicao, detalhe) => {
    if (!condicao) falhas.push(detalhe ? `${nome}: ${detalhe}` : nome);
  };

  const orig = jogarAte(400);

  // --- ida e volta preserva o estado
  const copia = S.desserializar(clonar(S.serializar(orig)));
  ok('decorrido', copia.decorrido === orig.decorrido);
  ok('rngEstado', copia.rngEstado === orig.rngEstado);
  ok('moedas', copia.moedas === orig.moedas);
  ok('nivel/xp', copia.nivel === orig.nivel && copia.xp === orig.xp);
  ok('células', JSON.stringify(copia.celulas) === JSON.stringify(orig.celulas));
  ok('abelhas', JSON.stringify(copia.abelhas) === JSON.stringify(orig.abelhas));
  ok('pote', JSON.stringify(copia.pote) === JSON.stringify(orig.pote));
  ok('mercado', JSON.stringify(copia.mercado) === JSON.stringify(orig.mercado));
  ok('histórico', JSON.stringify(copia.historico) === JSON.stringify(orig.historico));
  ok('clima', JSON.stringify(copia.clima) === JSON.stringify(orig.clima));
  ok('upgrades', JSON.stringify(copia.campos.map((c) => c.upgrades))
    === JSON.stringify(orig.campos.map((c) => c.upgrades)));
  ok('turmas', JSON.stringify(copia.campos.map((c) => [c.alocadas, c.polenAlocadas]))
    === JSON.stringify(orig.campos.map((c) => [c.alocadas, c.polenAlocadas])));
  ok('proximoIdAbelha', copia.proximoIdAbelha === orig.proximoIdAbelha);

  // --- determinismo: continuar de dois saves idênticos não pode divergir
  const a = S.desserializar(clonar(S.serializar(orig)));
  const b = S.desserializar(clonar(S.serializar(orig)));
  for (let i = 0; i < 30 * 300; i++) { passo(a, 1 / 30); passo(b, 1 / 30); }
  ok('determinismo', JSON.stringify(S.serializar(a).celulas) === JSON.stringify(S.serializar(b).celulas)
    && a.moedas === b.moedas && a.abelhas.length === b.abelhas.length,
    `moedas ${a.moedas} vs ${b.moedas}`);

  // --- continuar do save = continuar sem salvar
  const semSave = jogarAte(400);
  const comSave = S.desserializar(clonar(S.serializar(semSave)));
  for (let i = 0; i < 30 * 200; i++) { passo(semSave, 1 / 30); passo(comSave, 1 / 30); }
  ok('save não altera a simulação',
    semSave.moedas === comSave.moedas && semSave.abelhas.length === comSave.abelhas.length,
    `moedas ${semSave.moedas} vs ${comSave.moedas}`);

  // --- save de versão futura é recusado
  localStorage.setItem(S.CHAVE, JSON.stringify({ ...S.serializar(orig), versao: 999 }));
  ok('recusa versão futura', S.carregar() === null);

  // --- lixo não derruba o jogo
  localStorage.setItem(S.CHAVE, '{isto não é json');
  ok('recusa json inválido', S.carregar() === null);
  localStorage.setItem(S.CHAVE, JSON.stringify({ versao: 1, celulas: 'não é objeto' }));
  ok('sobrevive a save malformado', (() => {
    try { return S.carregar() !== undefined; } catch { return false; }
  })());

  // --- save antigo sem campos novos ganha o padrão do catálogo
  const antigo = S.serializar(orig);
  antigo.campos = antigo.campos.slice(0, 1);
  delete antigo.proximoIdAbelha;
  delete antigo.mercado;
  const migrado = S.desserializar(antigo);
  ok('campos novos aparecem em save antigo', migrado.campos.length === CAMPOS.length);
  ok('campo ausente volta ao padrão', migrado.campos[1].upgrades.ogm === 0);
  ok('mercado ausente ganha padrão', Object.keys(migrado.mercado).length > 0);
  ok('id de abelha sem colisão',
    migrado.proximoIdAbelha > Math.max(...migrado.abelhas.map((x) => x.id)));

  // --- gravar e ler de verdade pelo localStorage
  S.apagar();
  ok('sem save carrega null', S.carregar() === null);
  ok('salvar retorna ok', S.salvar(orig) === true);
  const lido = S.carregar();
  ok('carrega o que salvou', lido && lido.estado.moedas === orig.moedas);
  ok('carimba salvoEm', lido && typeof lido.salvoEm === 'number');

  // --- o jogo fica parado enquanto o jogador está fora
  // Não há progresso offline: o carimbo do save é informativo, e carregar um
  // save antigo devolve exatamente o estado em que ele foi gravado.
  const guardado = S.serializar(jogarAte(300));
  const decorridoGravado = guardado.decorrido;
  const moedasGravadas = guardado.moedas;
  const abelhasGravadas = guardado.abelhas.length;
  guardado.salvoEm = Date.now() - 10 * 60 * 1000;
  localStorage.setItem(S.CHAVE, JSON.stringify(guardado));

  const voltou = S.carregar();
  ok('ausência não avança o relógio', voltou.estado.decorrido === decorridoGravado,
    `${voltou.estado.decorrido} vs ${decorridoGravado}`);
  ok('ausência não rende moedas', voltou.estado.moedas === moedasGravadas);
  ok('ausência não gera abelhas', voltou.estado.abelhas.length === abelhasGravadas);
  ok('ausência não vira o ano', voltou.estado.ano === guardado.ano);

  // Dez dias fora é igual a dez segundos fora: nada acontece.
  const antigoDemais = S.serializar(jogarAte(300));
  antigoDemais.salvoEm = Date.now() - 10 * 24 * 3600 * 1000;
  localStorage.setItem(S.CHAVE, JSON.stringify(antigoDemais));
  ok('ausência longa também não avança',
    S.carregar().estado.decorrido === antigoDemais.decorrido);

  // Relógio do sistema adiantado ou atrasado não pode mexer no estado.
  const relogioTorto = S.serializar(jogarAte(200));
  relogioTorto.salvoEm = Date.now() + 3600 * 1000;
  localStorage.setItem(S.CHAVE, JSON.stringify(relogioTorto));
  ok('relógio adiantado não afeta', S.carregar().estado.decorrido === relogioTorto.decorrido);

  // Pausado carrega pausado — a velocidade também é estado.
  const pausado = S.serializar(jogarAte(120));
  pausado.velocidade = 0;
  localStorage.setItem(S.CHAVE, JSON.stringify(pausado));
  ok('pausado carrega pausado', S.carregar().estado.velocidade === 0);

  // A derrota segue congelando a simulação (agora só pode acontecer jogando).
  const derrotado = jogarAte(60);
  derrotado.derrota = { ano: 1, meta: 11, vendido: 0 };
  const antesDaDerrota = derrotado.decorrido;
  for (let i = 0; i < 300; i++) passo(derrotado, 1 / 30);
  ok('derrota congela a simulação', derrotado.decorrido === antesDaDerrota);

  // --- vitória: sobreviver ao ano final encerra a partida
  const vencedor = jogarAte(60);
  vencedor.ano = META.anoFinal;
  vencedor.vendidoNoAno = metaDoAno(META.anoFinal) + 1;
  vencedor.decorrido = META.anoFinal * 240 - 0.5;      // véspera da virada
  for (let i = 0; i < 60; i++) passo(vencedor, 1 / 30);
  ok('vence ao passar do ano final', vencedor.vitoria !== null,
    `ano ${vencedor.ano}, vitória ${JSON.stringify(vencedor.vitoria)}`);
  ok('vitória não é derrota', vencedor.derrota === null);
  ok('vitória pausa o jogo', vencedor.velocidade === 0);

  const congelado = vencedor.decorrido;
  for (let i = 0; i < 300; i++) passo(vencedor, 1 / 30);
  ok('vitória congela a simulação', vencedor.decorrido === congelado);

  // Não vencer antes da hora: bater a meta de um ano qualquer só vira o ano.
  const meio = jogarAte(60);
  meio.ano = 2;
  meio.vendidoNoAno = metaDoAno(2) + 1;
  meio.decorrido = 2 * 240 - 0.5;
  for (let i = 0; i < 60; i++) passo(meio, 1 / 30);
  ok('ano intermediário não vence', meio.vitoria === null && meio.ano === 3,
    `ano ${meio.ano}`);

  ok('vitória sobrevive ao save',
    S.desserializar(clonar(S.serializar(vencedor))).vitoria !== null);

  // --- pólen: a colmeia não pode parar de fazer mel em silêncio
  // O favo sem coletora de pólen dedicada ficava 67% da partida com uma célula
  // pronta e nenhum pólen pra fechá-la, sem nada na tela dizendo isso.
  const seco = novoJogo(42);
  for (const c of celulasArray(seco)) if (c.estado === 'silo') { c.estado = 'vazia'; c.polen = 0; }
  for (const a of seco.abelhas) a.polen = 0;
  const celulaPronta = celulasArray(seco).find((c) => c.estado === 'vazia');
  celulaPronta.estado = 'nectar';
  celulaPronta.variedade = 'silvestre';
  celulaPronta.nectar = 9;
  passo(seco, 1 / 30);
  ok('avisa quando falta pólen', /pólen/i.test(seco.aviso?.texto ?? ''),
    JSON.stringify(seco.aviso));

  const abastecido = novoJogo(42);
  const outra = celulasArray(abastecido).find((c) => c.estado === 'vazia');
  outra.estado = 'nectar';
  outra.variedade = 'silvestre';
  outra.nectar = 9;
  passo(abastecido, 1 / 30);
  ok('não avisa com pólen no silo', abastecido.aviso === null);

  // O último silo fica no favo mostrando zero: era o único mostrador de pólen
  // da tela e sumia justo quando o jogador precisava dele.
  const vazio = novoJogo(42);
  consumirPolen(vazio, 999);
  const restantes = celulasArray(vazio).filter((c) => c.estado === 'silo');
  ok('último silo não some ao zerar', restantes.length === 1 && restantes[0].polen === 0,
    `${restantes.length} silos`);

  // Coletora de néctar volta com pólen de carona, senão a colmeia trava.
  const carona = novoJogo(42);
  for (const c of celulasArray(carona)) if (c.estado === 'silo') c.polen = 0;
  for (const campo of carona.campos) campo.polenAlocadas = 0;
  for (let i = 0; i < 30 * 240; i++) passo(carona, 1 / 30);
  ok('produz mel sem coletora de pólen',
    celulasArray(carona).some((c) => c.estado === 'madura') || carona.pote.silvestre > 0,
    `pote ${JSON.stringify(carona.pote)}`);

  S.apagar();
  return { total: 38, falhas: falhas.length, detalhes: falhas };
}
