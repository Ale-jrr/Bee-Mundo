import { novoJogo } from '../src/core/estado.js';
import { passo } from '../src/sim/tick.js';
import { relogio, SEGUNDOS_POR_ESTACAO } from '../src/sim/estacoes.js';
import { serializar, desserializar } from '../src/core/save.js';
import {
  VESPAS, atualizarPredadores, enviarGuarda, defensoras, vespasSemDefesa,
} from '../src/sim/predadores.js';
import { nascerAbelha } from '../src/sim/acoes.js';

// Vespas invadindo. A regra mudou de "o jogador monta uma guarda e quem morre
// é uma coletora no campo" para "as guardiãs de casa param na porta, e quem
// passa ataca quem está dentro". Estes testes travam a regra nova.

export async function rodar() {
  const falhas = [];
  let total = 0;
  const ok = (nome, cond, extra = '') => {
    total++;
    if (!cond) falhas.push(extra ? `${nome}: ${extra}` : nome);
  };

  // Ataque armado na hora, sem esperar o sorteio do intervalo.
  const criar = (semente = 42, ano = 1) => {
    const s = novoJogo(semente);
    s.decorrido = 100;
    s.ano = ano;
    s.proximoAtaque = 0;
    atualizarPredadores(s, relogio(100), 1 / 30);
    return s;
  };

  // Sem talento nenhum, para os testes controlarem quem defende.
  const semPendor = (s) => {
    for (const a of s.abelhas) if (a.papel === 'operaria') a.talento = null;
    return s;
  };

  let s = criar();
  ok('o ataque comeca no aviso', s.ameaca?.fase === 'aviso' && s.ameaca.resta === VESPAS.aviso);
  ok('com pelo menos uma vespa', (s.ameaca?.vespas?.length ?? 0) >= VESPAS.minimo);
  ok('cada vespa tem faixa propria de entrada',
    new Set(s.ameaca.vespas.map((v) => v.faixa)).size === s.ameaca.vespas.length);
  ok('e ninguem morreu ainda', s.abelhas.length === 3);

  // ------------------------------------------------ as fases se sucedem
  s = criar();
  s.ameaca.resta = 0.01;
  passo(s, 1 / 30);
  ok('do aviso vai para o voo', s.ameaca?.fase === 'voo');
  ok('e as vespas decolam', s.ameaca.vespas.every((v) => v.estado === 'voando'));
  passo(s, 1 / 30);
  ok('o voo tem progresso desenhavel', s.ameaca.vespas[0].t > 0 && s.ameaca.vespas[0].t < 1);
  s.ameaca.resta = 0.01;
  passo(s, 1 / 30);
  ok('do voo vai para a luta', s.ameaca?.fase === 'luta');

  // -------------------------------------- guardia em casa defende sozinha
  s = semPendor(criar());
  s.abelhas.find((a) => a.papel === 'operaria').talento = 'defesa';
  ok('guardia em casa ja conta como defensora', defensoras(s).length === 1);
  ok('e a porta fica coberta', vespasSemDefesa(s) === 0);
  const antesDaLuta = s.abelhas.length;
  correrAtaque(s);
  ok('a guardia barra sem o jogador mandar ninguem', s.abelhas.length === antesDaLuta);
  ok('e o aviso conta isso', /barrou/i.test(s.aviso?.texto ?? ''), s.aviso?.texto ?? '-');
  ok('o ataque termina', s.ameaca === null);
  ok('e o proximo fica longe', s.proximoAtaque >= s.decorrido + VESPAS.intervaloMin);

  // ------------------------------------- sem guardia, a vespa entra e mata
  s = semPendor(criar());
  ok('sem guardia ninguem esta na porta', defensoras(s).length === 0);
  const antesSemDefesa = s.abelhas.length;
  correrAtaque(s);
  ok('a vespa entra e mata quem esta dentro', s.abelhas.length === antesSemDefesa - 1);
  ok('e o aviso diz o estrago', /matou/i.test(s.aviso?.texto ?? ''), s.aviso?.texto ?? '-');

  // --------------------- quem esta no campo escapa; quem fica em casa morre
  s = semPendor(criar());
  const noCampo = s.abelhas.filter((a) => a.papel === 'operaria')[0];
  Object.assign(noCampo, { campo: s.campos[0].id, estado: 'coletando' });
  correrAtaque(s);
  ok('a coletora no campo sobrevive', s.abelhas.includes(noCampo));

  // ------------------------------------ colmeia vazia: a vespa saqueia o mel
  s = semPendor(criar());
  for (const a of s.abelhas) {
    if (a.papel === 'operaria') Object.assign(a, { campo: s.campos[0].id, estado: 'coletando' });
  }
  s.pote.silvestre = 4;
  const abelhasAntes = s.abelhas.length;
  correrAtaque(s);
  ok('colmeia vazia nao perde abelha', s.abelhas.length === abelhasAntes);
  ok('mas perde mel do vidro', s.pote.silvestre === 3, `${s.pote.silvestre}`);
  ok('e o aviso fala do pote', /pote/i.test(s.aviso?.texto ?? ''), s.aviso?.texto ?? '-');

  // ------------------------------------------------- reforco manual
  s = semPendor(criar());
  ok('da pra por mais uma na porta', enviarGuarda(s).ok === true);
  ok('e ela passa a defender', defensoras(s).length === 1);
  ok('nao da pra por mais que o necessario', enviarGuarda(s).ok === false);
  const antesComReforco = s.abelhas.length;
  correrAtaque(s);
  ok('o reforco barra a vespa', s.abelhas.length === antesComReforco);
  ok('e a guarda e liberada no fim', s.abelhas.every((a) => !a.guarda));

  // Tarde demais: na luta o reforco nao entra mais.
  s = semPendor(criar());
  s.ameaca.fase = 'luta';
  ok('na luta nao da mais pra reforcar', enviarGuarda(s).ok === false);

  // ----------------------------------------- guardia nao sai com vespa vindo
  const comGuardia = novoJogo(42);
  for (let i = 0; i < 4; i++) nascerAbelha(comGuardia);
  for (const a of comGuardia.abelhas) if (a.papel === 'operaria') a.talento = null;
  const fica = comGuardia.abelhas.find((a) => a.papel === 'operaria');
  fica.talento = 'defesa';
  comGuardia.campos[0].alocadas = 6;
  comGuardia.decorrido = 100;
  comGuardia.proximoAtaque = 0;
  atualizarPredadores(comGuardia, relogio(100), 1 / 30);
  for (let i = 0; i < 30 * 12; i++) passo(comGuardia, 1 / 30);
  ok('a guardia fica em casa enquanto a vespa vem',
    fica.estado === 'colmeia', fica.estado);

  // ------------------------------------------------------------- save
  s = semPendor(criar());
  enviarGuarda(s);
  s.ameaca.resta = 3;
  const copia = desserializar(JSON.parse(JSON.stringify(serializar(s))));
  ok('o save guarda a fase e as vespas',
    copia.ameaca.fase === s.ameaca.fase
    && copia.ameaca.vespas.length === s.ameaca.vespas.length
    && copia.ameaca.resta === s.ameaca.resta);
  ok('e guarda quem esta na porta', defensoras(copia).length === defensoras(s).length);

  // ------------------------------------------------------------- inverno
  const gelado = novoJogo(42);
  gelado.decorrido = SEGUNDOS_POR_ESTACAO * 3;
  atualizarPredadores(gelado, relogio(gelado.decorrido), 1 / 30);
  ok('sem vespas no inverno', !gelado.ameaca);

  // ------------------------------------------ mais vespas conforme os anos
  const contar = (ano) => {
    let maior = 0;
    for (let semente = 0; semente < 40; semente++) {
      const jogo = criar(semente, ano);
      maior = Math.max(maior, jogo.ameaca?.vespas?.length ?? 0);
    }
    return maior;
  };
  const noAno1 = contar(1);
  const noAno9 = contar(9);
  ok('no ano 1 vem uma vespa so', noAno1 === 1, `${noAno1}`);
  ok('nos anos finais vem mais de uma', noAno9 > noAno1, `${noAno1} -> ${noAno9}`);
  ok('e nunca mais que o teto', noAno9 <= VESPAS.maximo, `${noAno9}`);

  return { total, falhas: falhas.length, detalhes: falhas };
}

// Corre o ataque inteiro — aviso, voo e luta — sem esperar em tempo real.
function correrAtaque(s) {
  for (let volta = 0; volta < 4 && s.ameaca; volta++) {
    s.ameaca.resta = 0.01;
    passo(s, 1 / 30);
  }
}
