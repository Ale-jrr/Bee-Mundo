import { ovosDaCelula, sincronizarOvos } from '../core/ovos.js';
import { atualizarPredadores } from './predadores.js';
import { consumirMel, MEL_REFEICAO_INVERNO } from './alimento.js';
import { atualizarFloradas, statsComFlorada } from './floradas.js';
import { atualizarEncomendas } from './encomendas.js';
import { abrirEscolha, bonusBencao, descontoBencao, fatorDoInverno } from './bencaos.js';
import { regraDoDesafio, penalidadeDoInverno } from './desafios.js';
import { ritmoDoAr, limiteDeFome } from './clima.js';
import { atualizarEnxame } from './enxame.js';
import { atualizarTempo, fatorDaColeta, fatorDaRebrota } from './tempo.js';
import { atualizarRainha, intervaloDePostura, emInterregno } from './rainha.js';
import { atualizarFormigas } from './formigas.js';
import { mostrarDica } from './dicas.js';
import { AVISO_INVERNO } from './inverno.js';
import { fatorColeta, fatorProducao, fatorRisco, melhorPara } from './talentos.js';
import { relogio, fatorDeColeta, fatorDoFavo } from './estacoes.js';
import {
  CLIMA, CELULA, ABELHA, NINHADA, ALUGUEL, MERCADO, VARIEDADES, SILO, FEROMONIO,
  VOO, META, PASSEIO, TRABALHO, PRESENTE_DO_ANO, saudeDoClima, metaDoAno,
} from './economia.js';
import {
  limitarClima, celulaLivre, celulaParaPostura, celulasArray,
  guardarPolen, consumirPolen, polenTotal,
} from '../core/estado.js';
import { distancia, chave, daChave } from './hex.js';
import { sortear } from '../core/rng.js';
import { eclodirNinhada, liberarCelula } from './acoes.js';

// Um passo de simulação de tamanho fixo. Puro sobre o estado.
// Nada aqui pode depender de framerate, de canvas ou de input.
export function passo(estado, dt) {
  if (estado.derrota || estado.vitoria) return;
  // A escolha da primavera segura o relógio: é decisão de partida inteira e
  // não deve ser tomada com as abelhas correndo por cima.
  if (estado.escolha) return;

  estado.decorrido += dt;
  const t = relogio(estado.decorrido);

  atualizarPredadores(estado, t, dt);
  atualizarTurbo(estado, dt);
  atualizarClima(estado, t, dt);
  atualizarMercado(estado, dt);
  atualizarFloradas(estado, t, dt);
  atualizarEncomendas(estado, t, dt);
  atualizarEnxame(estado, t, dt);
  atualizarTempo(estado, t, dt);
  atualizarRainha(estado, dt);
  atualizarFormigas(estado, t, dt);
  // A dica do inverno abre junto com o painel de preparação: é o momento em
  // que ela tem o que explicar.
  if (t.estacao.id === 'outono' && t.restamSegundos <= AVISO_INVERNO) {
    mostrarDica(estado, 'inverno');
  }
  atualizarCampos(estado, t, dt);
  atualizarAbelhas(estado, t, dt);
  atualizarAluguel(estado, dt);
  atualizarPasseio(estado, dt, t.estacao);
  atualizarNinhada(estado, dt);
  if (t.estacao.id === 'outono'
      && estado.campos.some(c => c.alocadas + c.polenAlocadas > 0)
      && (!estado.aviso || estado.aviso.expira <= estado.decorrido)) {
    estado.aviso = { texto: 'Inverno: recolha as coletoras!', expira: estado.decorrido + 4 };
  }
  avisarSePolenAcabou(estado);
  virarAno(estado, t);
}

const SEM_POLEN = 'Sem pólen: mande uma abelha buscar';

// A cura travada por falta de pólen não tem sinal na tela: a abelha simplesmente
// passa direto pela célula cheia. Este aviso é o sinal — aparece por 4 s e só
// volta 16 s depois, pra lembrar sem virar barulho.
function avisarSePolenAcabou(estado) {
  if (relogio(estado.decorrido).estacao.id === 'inverno') return;
  const aviso = estado.aviso;
  if (aviso && estado.decorrido < aviso.expira) return;
  if (aviso && aviso.texto === SEM_POLEN && estado.decorrido < aviso.expira + 16) return;

  const naBolsa = estado.abelhas.reduce((total, a) => total + (a.polen ?? 0), 0);
  if (polenTotal(estado) + naBolsa > 0.01) return;
  if (!celulasArray(estado).some(podeCurar)) return;

  estado.aviso = { texto: SEM_POLEN, expira: estado.decorrido + 4 };
}

function atualizarTurbo(estado, dt) {
  if (!estado.turbo) return;
  estado.turbo.resta -= dt;
  if (estado.turbo.resta <= 0) estado.turbo = null;
}

function atualizarClima(estado, t, dt) {
  const naColmeia = estado.abelhas.filter(
    (a) => a.estado === 'colmeia' || a.estado === 'rainha',
  ).length;

  const alvo = {
    temperatura: temperaturaAlvo(t.estacao.temperatura, naColmeia,
      bonusBencao(estado, 'calor')),
    co2: co2Alvo(t.estacao.co2 * 10, naColmeia),
    umidade: 45 + t.estacao.umidade,
  };

  // Persegue o alvo com inércia — o clima nunca salta, sempre deriva.
  const k = 1 - Math.pow(1 - CLIMA.inercia, dt);
  for (const m of ['temperatura', 'co2', 'umidade']) {
    estado.clima[m] += (alvo[m] - estado.clima[m]) * k;
  }
  limitarClima(estado.clima);
}

// A colônia empurra a temperatura ambiente para dentro da faixa ideal, mas só
// até onde sua autoridade alcança — nunca além do ideal, nos dois sentidos.
// Colmeia pequena não vence o inverno; colmeia grande não superaquece no verão.
export function temperaturaAlvo(ambiente, naColmeia, calor = 1) {
  const [minIdeal, maxIdeal] = NINHADA.tempIdeal;
  const autoridade = Math.min(CLIMA.autoridadeMaxima,
    naColmeia * CLIMA.grausPorAbelha * calor);
  if (ambiente < minIdeal) return Math.min(minIdeal, ambiente + autoridade);
  if (ambiente > maxIdeal) return Math.max(maxIdeal, ambiente - autoridade);
  return ambiente;
}

// As abelhas ventilam o favo além de respirar nele. A ventilação tem teto, e é
// por isso que uma colônia grande demais volta a abafar.
export function co2Alvo(ambiente, naColmeia) {
  const bruto = CLIMA.co2Externo + ambiente + naColmeia * CLIMA.co2PorAbelha;
  const autoridade = Math.min(CLIMA.ventilacaoMaxima, naColmeia * CLIMA.ventilacaoPorAbelha);
  return Math.max(CLIMA.co2Externo, bruto - autoridade);
}

// Passeio aleatório com reversão à média, por variedade.
function atualizarMercado(estado, dt) {
  for (const [id, v] of Object.entries(estado.mercado)) {
    const vol = VARIEDADES[id].volatilidade;
    // O choque escala com sqrt(dt) (processo de Ornstein-Uhlenbeck). Com dt
    // puro a reversão domina e o preço fica travado em 1.00, matando a
    // decisão de quando vender.
    const choque = (sortear(estado) - 0.5) * 2 * vol * MERCADO.ruido * Math.sqrt(dt);
    const puxao = (1 - v) * MERCADO.reversao * dt;
    estado.mercado[id] = Math.min(MERCADO.maximo, Math.max(MERCADO.minimo, v + choque + puxao));
  }
}

function atualizarCampos(estado, t, dt) {
  for (const campo of estado.campos) {
    const { nectarMax } = statsComFlorada(campo);
    // `campo.rebrota` é o multiplicador próprio do campo: o Urzal se recompõe
    // a um quarto da velocidade dos outros, e é isso que o torna um sprint.
    const porSegundo = (nectarMax * t.estacao.rebrota * fatorDaRebrota(estado)
      * (campo.rebrota ?? 1)) / 60;
    campo.nectar = Math.min(nectarMax, campo.nectar + porSegundo * dt);
  }
}

// Fração do favo que o feromônio da rainha alcança. A mensagem química é o
// que mantém a colônia organizada: onde ela chega, as operárias rendem mais.
// Expandir o favo além do raio dilui a cobertura — o custo escondido de crescer.
export function coberturaFeromonio(estado) {
  const abertas = celulasArray(estado).filter((c) => c.estado !== 'travada');
  if (!abertas.length) return 0;
  const rainha = abertas.find((c) => c.estado === 'rainha');
  if (!rainha) return 0;
  const dentro = abertas.filter((c) => distancia(c, rainha) <= FEROMONIO.raio).length;
  return dentro / abertas.length;
}

function atualizarAbelhas(estado, t, dt) {
  const rendimento = fatorDeColeta(t.estacao)
    * fatorDoInverno(estado, t.estacao) * penalidadeDoInverno(estado, t.estacao)
    * (estado.turbo?.multiplicador ?? 1)
    * (1 + FEROMONIO.poder * bonusBencao(estado, 'feromonio') * coberturaFeromonio(estado))
    * fatorDaColeta(estado);
  const perdidas = [];
  let mortasDeFrio = 0;

  for (const abelha of estado.abelhas) {
    if (abelha.papel === 'rainha' || abelha.estado === 'alugada') continue;
    const campo = estado.campos.find((c) => c.id === abelha.campo) || null;
    const stats = campo ? statsComFlorada(campo) : null;

    // O jogador precisa recolher as coletoras antes da virada.
    if (t.estacao.id === 'inverno' && ['indo', 'coletando', 'voltando'].includes(abelha.estado)) {
      perdidas.push(abelha);
      mortasDeFrio++;
      continue;
    }

    switch (abelha.estado) {
      case 'colmeia': {
        if (t.estacao.id === 'inverno' || abelha.guarda) break;
        const destino = estado.campos.find(
          (c) => estado.nivel >= c.nivelMin
            && c.alocadas + c.polenAlocadas > contarNoCampo(estado, c.id),
        );
        // A vaga é da batedora, se houver uma em casa. O jogador escolhe
        // **quantas** vão ao campo; qual vai é ofício da colmeia — obrigá-lo a
        // escalar abelha por abelha seria planilha, não jogo.
        if (destino && !ehAMelhorParaOCampo(estado, abelha)) break;
        if (destino) {
          // Pólen tem prioridade: basta uma coletora dedicada, mas sem ela a
          // colmeia inteira para de produzir mel.
          const emPolen = estado.abelhas.filter(
            (a) => a.campo === destino.id && a.recurso === 'polen',
          ).length;
          abelha.recurso = emPolen < destino.polenAlocadas ? 'polen' : 'nectar';
          abelha.campo = destino.id;
          abelha.estado = 'indo';
          abelha.t = 0;
        }
        break;
      }
      case 'indo':
        abelha.t += dt / viagemDoCampo(estado, stats);
        if (abelha.t >= 1) { abelha.estado = 'coletando'; abelha.t = 0; }
        break;

      case 'coletando': {
        if (abelha.recurso === 'polen') {
          // Pólen vem da flor sem consumir o néctar do campo: o limite de
          // pólen é quantas abelhas você dedica a ele, não o estoque do campo.
          // A taxa acompanha a do campo, então campo melhor e upgrade de OGM
          // valem para os dois recursos.
          abelha.carga += ((taxaColeta(estado, stats, abelha) * SILO.fatorPolen) / 60) * rendimento * dt;
          abelha.t = Math.min(1, abelha.carga / ABELHA.cargaBase);
          if (abelha.t >= 1) { abelha.estado = 'voltando'; abelha.t = 0; }
          break;
        }
        const porSegundo = (taxaColeta(estado, stats, abelha) / 60) * rendimento;
        const colhido = Math.min(porSegundo * dt, campo.nectar);
        campo.nectar -= colhido;
        abelha.carga += colhido;
        abelha.t = Math.min(1, abelha.carga / ABELHA.cargaBase);
        if (abelha.t >= 1 || campo.nectar <= 0.001) { abelha.estado = 'voltando'; abelha.t = 0; }
        break;
      }
      case 'voltando':
        abelha.t += dt / viagemDoCampo(estado, stats);
        if (abelha.t >= 1) {
          // Um único sorteio por volta completa, na chegada. É o único uso
          // do risco: não há eventos de ataque à colmeia.
          //
          // A estação **multiplica** o risco do campo em vez de somar: um campo
          // anunciado como 0% no painel tem que ser 0% o ano todo. Somando, o
          // Bosque das Campainhas matava abelhas no outono apesar de mostrar
          // "0% risco" — e perder 1 das 2 operárias iniciais costuma ser fatal.
          const risco = stats.risco * (1 + t.estacao.risco)
            * descontoBencao(estado, 'guarda') * regraDoDesafio(estado, 'risco')
            * fatorRisco(abelha);
          if (risco > 0 && sortear(estado) < risco * VOO.riscoPorViagem) {
            perdidas.push(abelha);
            break;
          }
          if (abelha.recurso === 'polen') {
            guardarPolen(estado, abelha.carga);
          } else {
            depositar(estado, campo.variedade, abelha.carga);
            // Pólen de carona: o bastante pra colmeia nunca parar de fazer mel.
            guardarPolen(estado, custoDeCura(estado, abelha.carga) * SILO.polenDeCarona);
          }
          abelha.carga = 0;
          abelha.estado = 'colmeia';
          abelha.t = 0;
          abelha.campo = null;
          abelha.andar = 0;
          abelha.pausa = 0;
        }
        break;
    }
  }

  if (perdidas.length) {
    for (const abelha of perdidas) {
      const campo = estado.campos.find((c) => c.id === abelha.campo);
      const turma = abelha.recurso === 'polen' ? 'polenAlocadas' : 'alocadas';
      if (campo) campo[turma] = Math.max(0, campo[turma] - 1);
    }
    estado.abelhas = estado.abelhas.filter((a) => !perdidas.includes(a));
    const n = perdidas.length;
    estado.aviso = {
      texto: mortasDeFrio > 0
        ? `${mortasDeFrio} ${mortasDeFrio === 1 ? 'abelha morreu' : 'abelhas morreram'} de frio`
        : n === 1 ? 'Perdeu uma abelha no voo' : `Perdeu ${n} abelhas no voo`,
      expira: estado.decorrido + 4,
    };
  }
}

// Duração da viagem já com a bênção de vento a favor.
function viagemDoCampo(estado, stats) {
  return Math.max(0.5, stats.viagem * descontoBencao(estado, 'viagem'));
}

// Taxa do campo já com a bênção de coleta. Vive aqui, e não em `economia.js`,
// porque depende do estado da partida — `economia` guarda constantes.
function taxaColeta(estado, stats, abelha) {
  return stats.taxa * bonusBencao(estado, 'coleta') * fatorColeta(abelha);
}

// A abelha em questão é a melhor candidata em casa para sair a campo? Sem
// isto, a primeira da lista pegava a vaga e o talento de coleta virava sorte.
function ehAMelhorParaOCampo(estado, abelha) {
  const emCasa = estado.abelhas.filter(
    (a) => a.papel === 'operaria' && a.estado === 'colmeia' && !a.guarda,
  );
  // Com vespa a caminho, a guardiã fica. Ela é a defesa da porta, e mandar
  // justo ela ao campo agora seria esvaziar a entrada na hora do ataque.
  const candidatas = estado.ameaca
    ? emCasa.filter((a) => a.talento !== 'defesa')
    : emCasa;
  return melhorPara(candidatas, 'coleta') === abelha;
}

function contarNoCampo(estado, id) {
  return estado.abelhas.filter((a) => a.campo === id).length;
}

function atualizarAluguel(estado, dt) {
  for (const abelha of estado.abelhas) {
    if (abelha.estado !== 'alugada') continue;
    abelha.restaAluguel -= dt;
    abelha.t = 1 - Math.max(0, abelha.restaAluguel) / ALUGUEL.duracao;
    if (abelha.restaAluguel <= 0) {
      abelha.estado = 'colmeia';
      abelha.restaAluguel = 0;
      abelha.t = 0;
      estado.moedas += ALUGUEL.pagamento;
    }
  }
}

function depositar(estado, variedade, quantidade) {
  let resta = quantidade;
  let guarda = 0;
  while (resta > 0.001 && guarda++ < 20) {
    const celula = celulaLivre(estado, variedade);
    if (!celula) return; // favo cheio: o néctar se perde
    if (celula.estado === 'vazia') {
      celula.estado = 'nectar';
      celula.variedade = variedade;
      celula.nectar = 0;
      celula.cura = 0;
    }
    const cabe = CELULA.capacidadeNectar - celula.nectar;
    const posto = Math.min(cabe, resta);
    celula.nectar += posto;
    resta -= posto;
  }
}


// Passeio pelo favo. As abelhas de dentro não ficam paradas: caminham de
// célula em célula, com preferência pelo que importa — o silo de pólen e as
// células com néctar, que é onde o mel é feito. A rainha vagueia e põe onde para.
function atualizarPasseio(estado, dt, estacao) {
  const abertas = celulasArray(estado).filter((c) => c.estado !== 'travada');
  // Uma varredura por quadro, e não uma por abelha: com 140 operárias o
  // segundo jeito é O(n²) e derrubou o passo do jogo pela metade.
  // `proximoDestino` vai somando nela quem acabou de escolher, então duas
  // abelhas que decidem no mesmo quadro também não se atropelam.
  const ocupados = destinosOcupados(estado);
  if (!abertas.length) return;

  // Ar abafado atrasa tudo o que acontece dentro do favo, e o ar seco adianta
  // a fome. Calculados uma vez por passo: valem pra colmeia inteira.
  const ar = ritmoDoAr(estado.clima);
  const fomeLimite = limiteDeFome(estado.clima, TRABALHO.segundosEntreRefeicoes);

  for (const abelha of estado.abelhas) {
    if (abelha.estado !== 'colmeia' && abelha.estado !== 'rainha') continue;

    if (!estado.celulas[abelha.para]) {
      abelha.de = abelha.para = chave(abertas[0].q, abertas[0].r);
      abelha.andar = 0;
    }

    if (abelha.papel === 'operaria') abelha.fome += dt;

    // Faminta trabalha e anda pela metade — atrasa a colmeia, não a paralisa.
    const faminta = abelha.papel === 'operaria'
      && abelha.fome >= fomeLimite;
    const lentidao = faminta ? TRABALHO.penalidadeFome : 1;

    // Trabalhando: a barrinha sobre a abelha é este progresso.
    if (abelha.trabalho) {
      // O clima pesa na cura, mas de forma contida: usado cru, uma colmeia
      // ruim deixava a tarefa 6,7x mais lenta. Aqui vai de 0,6 a 1,0 —
      // atrapalha sem descolar do número. A estação vale aqui também.
      const ambiente = abelha.trabalho.tipo === 'cura'
        ? (0.6 + 0.4 * saudeDoClima(estado.clima)) * fatorDoFavo(estacao)
          * fatorDoInverno(estado, estacao) * penalidadeDoInverno(estado, estacao)
        : 1;
      abelha.trabalho.resta -= dt * lentidao * ambiente * fatorProducao(abelha) * ar;
      abelha.t = 1 - Math.max(0, abelha.trabalho.resta) / abelha.trabalho.total;
      if (abelha.trabalho.resta <= 0) {
        concluirTrabalho(estado, abelha);
        // Encadeia na mesma célula: quem parou no silo pra comer pega o pólen
        // em seguida, em vez de ir embora de mãos vazias.
        iniciarTrabalho(estado, abelha);
      }
      continue;
    }

    if (abelha.guarda) { iniciarTrabalho(estado, abelha); continue; }

    if (abelha.pausa > 0) {
      abelha.pausa -= dt;
      continue;
    }

    abelha.andar += (dt * lentidao * fatorProducao(abelha) * ar)
      / (PASSEIO.segundosPorCelula * descontoBencao(estado, 'passo'));
    if (abelha.andar < 1) continue;

    abelha.de = abelha.para;
    abelha.andar = 0;
    abelha.t = 0;

    // Chegou: se há trabalho nesta célula, começa. Senão, descansa e escolhe
    // o próximo destino.
    if (iniciarTrabalho(estado, abelha)) continue;

    abelha.para = proximoDestino(estado, abelha, abertas, prontaParaPor(estado), ocupados);

    // Só descansa quem não tem o que fazer. Ir buscar pólen também é ter o que
    // fazer — antes só carregar contava, e a ida ao silo saía pausada.
    const destino = estado.celulas[abelha.para];
    const indoTrabalhar = destino
      && (destino.estado === 'nectar' || destino.estado === 'silo');
    // Carregar pólen só conta como propósito se houver mesmo aonde levar. Sem
    // célula com néctar, a abelha ficava andando em círculo de bolsa cheia.
    const comPropósito = indoTrabalhar
      || abelha.fome >= limiteDeFome(estado.clima, TRABALHO.segundosEntreRefeicoes)
      || (abelha.papel === 'rainha' && prontaParaPor(estado));
    abelha.pausa = comPropósito ? 0
      : PASSEIO.pausaMin + sortear(estado) * (PASSEIO.pausaMax - PASSEIO.pausaMin);
  }
}

// Operária busca pólen e cuida do mel; rainha procura célula vazia pra pôr.
// Sempre com um pouco de sorteio, senão todas empilham na mesma célula.
// Operária parada numa célula: pega pólen se for silo, ou trabalha o mel se
// for uma célula cheia de néctar e ela estiver carregando pólen.
function iniciarTrabalho(estado, abelha) {
  if (abelha.papel === 'rainha') return false;
  const celula = estado.celulas[abelha.de];
  if (!celula) return false;

  // Comer vem antes de qualquer coisa, e acontece onde ela estiver: o mel sai
  // do pote do jogador, não da célula. Fazê-la desviar até uma célula madura
  // custava mais tempo que os 50% de lentidão da fome — alimentar a colmeia
  // saía pior que deixá-la faminta, que é o contrário do que a regra quer.
  if (abelha.fome >= limiteDeFome(estado.clima, TRABALHO.segundosEntreRefeicoes)
      && temMelNoPote(estado)) {
    abelha.trabalho = { tipo: 'comer', resta: TRABALHO.segundosComendo, total: TRABALHO.segundosComendo };
    abelha.t = 0;
    return true;
  }
  if (abelha.guarda) return false;
  if (celula.estado === 'silo' && abelha.polen < TRABALHO.capacidadePolen
      && celula.polen > 0) {
    abelha.trabalho = { tipo: 'polen', resta: TRABALHO.segundosPegarPolen, total: TRABALHO.segundosPegarPolen };
    abelha.t = 0;
    return true;
  }
  // A célula não precisa estar cheia — mas precisa ter uma carga de néctar,
  // senão a abelha fecharia célula de 1 de néctar e tiraria um pote inteiro
  // dela, que é mel de graça.
  if (podeCurarCom(estado, abelha, celula)) {
    const curar = TRABALHO.segundosCurar * descontoBencao(estado, 'oficio');
    abelha.trabalho = { tipo: 'cura', resta: curar, total: curar };
    abelha.t = 0;
    return true;
  }
  return false;
}

function podeCurar(celula) {
  return celula.estado === 'nectar' && celula.nectar >= ABELHA.cargaBase;
}

// Pólen que a cura de uma dada quantidade de néctar consome. Proporcional à
// célula cheia, então fechar meia célula custa meio pólen.
function podeCurarCom(estado, abelha, celula) {
  return podeCurar(celula) && abelha.polen >= custoDeCura(estado, celula.nectar);
}

function custoDeCura(estado, nectar) {
  return SILO.polenPorMel * (nectar / CELULA.capacidadeNectar)
    * descontoBencao(estado, 'polen');
}

// Néctar + pólen = mel, num passo só. O que rende é o néctar que estava ali:
// fechar uma célula pela metade dá metade do mel e custa metade do pólen.
function fazerMel(estado, abelha, celula) {
  abelha.polen = Math.max(0, abelha.polen - custoDeCura(estado, celula.nectar));
  celula.estado = 'madura';
  celula.cura = 0;
  celula.potes = Math.max(1, Math.floor(celula.nectar / ABELHA.cargaBase));
}

function concluirTrabalho(estado, abelha) {
  const celula = estado.celulas[abelha.de];
  const tipo = abelha.trabalho.tipo;
  abelha.trabalho = null;
  abelha.t = 0;
  if (!celula) return;

  if (tipo === 'comer') {
    // Boca pequena: a mesma refeição custa menos mel do pote.
    const refeicao = (relogio(estado.decorrido).estacao.id === 'inverno'
      ? MEL_REFEICAO_INVERNO : TRABALHO.melPorRefeicao)
      * descontoBencao(estado, 'apetite');
    // O jogador pode vender enquanto a abelha come; sem alimento não sacia.
    const comeu = consumirMel(estado, refeicao);
    // Desconta só o que ela realmente comeu. Antes a fome era **reescrita**
    // para o limite: sem mel no vidro ela continuava faminta, mas se o limite
    // tivesse subido (ar mais úmido) ela saía da fome sem ter comido nada.
    const limite = limiteDeFome(estado.clima, TRABALHO.segundosEntreRefeicoes);
    abelha.fome = Math.max(0, abelha.fome - limite * (comeu / refeicao));
  } else if (tipo === 'polen') {
    abelha.polen += consumirPolen(estado, TRABALHO.capacidadePolen - abelha.polen);
  } else if (tipo === 'cura' && podeCurarCom(estado, abelha, celula)) {
    // Outra abelha pode ter fechado a célula durante estes 5 s; aí o trabalho
    // se perde sem cobrar pólen, em vez de virar um pote do nada.
    fazerMel(estado, abelha, celula);
  }
}

function temMelNoPote(estado) {
  return Object.values(estado.pote).some((n) => n > 1e-9);
}

// A rainha está com um ovo pronto e o favo quente o bastante pra chocá-lo?
function prontaParaPor(estado) {
  return estado.proximaPostura <= 0
    && ritmoDeEclosao(estado.clima.temperatura) >= NINHADA.ritmoMinimoParaPor;
}

function proximoDestino(estado, abelha, abertas, rainhaQuerPor, ocupados) {
  // Nunca escolhe a célula onde já está: com um silo só, a operária ficava
  // parada em cima dele porque era sempre o destino preferido.
  const outras = abertas.filter((c) => chave(c.q, c.r) !== abelha.de);
  if (!outras.length) return abelha.de;

  if (abelha.papel === 'rainha') {
    const vazias = outras.filter((c) => c.estado === 'vazia');
    // Com ovo pronto ela vai direto à célula vazia mais próxima, em vez de
    // vaguear. Sem isso a janela de postura (curta, e só no calor) passava
    // batido: ela quase nunca estava no lugar certo na hora certa.
    if (rainhaQuerPor && vazias.length) {
      const perto = vazias.reduce((melhor, c) => (
        distancia(c, abelha.de ? daChave(abelha.de) : c) < distancia(melhor, daChave(abelha.de)) ? c : melhor
      ), vazias[0]);
      return chave(perto.q, perto.r);
    }
    const fonte = vazias.length && sortear(estado) < 0.75 ? vazias : outras;
    return chaveSorteada(estado, fonte, outras);
  }

  // Só escolhe mel que consegue pagar, e só o que ninguém já pegou; se faltar
  // pólen, completa a bolsa.
  const cuidar = outras.filter((c) => podeCurarCom(estado, abelha, c)
    && !ocupados.cura.has(chave(c.q, c.r)));
  if (cuidar.length) {
    const maisCheia = cuidar.reduce((m, c) => c.nectar > m.nectar ? c : m, cuidar[0]);
    const escolhida = chave(maisCheia.q, maisCheia.r);
    ocupados.cura.add(escolhida);
    return escolhida;
  }
  const fontes = outras.filter((c) => c.estado === 'silo' && c.polen > 0);
  if (abelha.polen < TRABALHO.capacidadePolen && fontes.length) {
    const vagas = fontes.filter((c) => !ocupados.silos.has(chave(c.q, c.r)));
    const escolhida = chaveSorteada(estado, vagas.length ? vagas : fontes, outras);
    ocupados.silos.add(escolhida);
    return escolhida;
  }
  return chaveSorteada(estado, outras, outras);
}

// Para onde as outras abelhas já estão indo, ou o que já estão fazendo.
//
// Sem isto todas escolhiam a mesma célula — a mais cheia é sempre a mesma para
// todo mundo — e só a primeira a chegar fazia mel. As outras chegavam com o
// pólen na bolsa, encontravam a célula já madura e não tinham o que fazer ali:
// a viagem inteira se perdia, e quanto maior a colônia, mais se perdia.
//
// Os dois casos não são iguais, e por isso são tratados diferente:
//
//   cura  — **bloqueia**: uma célula só pode ser fechada por uma abelha;
//   silo  — **desprefére**: o silo atende várias, mas mandar três na mesma
//           gaveta esvazia ela na cara das duas últimas. Se todos estiverem
//           ocupados, ela vai assim mesmo em vez de ficar parada.
function destinosOcupados(estado) {
  const cura = new Set();
  const silos = new Set();
  for (const a of estado.abelhas) {
    if (a.papel !== 'operaria') continue;
    if (a.estado !== 'colmeia') continue;
    if (a.trabalho?.tipo === 'cura') { cura.add(a.de); continue; }
    if (a.trabalho?.tipo === 'polen') { silos.add(a.de); continue; }
    const destino = a.para;
    if (!destino || destino === a.de) continue;
    const celula = estado.celulas[destino];
    if (!celula) continue;
    if (celula.estado === 'nectar' && a.polen > 0) cura.add(destino);
    else if (celula.estado === 'silo') silos.add(destino);
  }
  return { cura, silos };
}

function chaveSorteada(estado, fonte, reserva) {
  const lista = fonte.length ? fonte : reserva;
  const escolhida = lista[Math.floor(sortear(estado) * lista.length)] ?? reserva[0];
  return chave(escolhida.q, escolhida.r);
}

// 1 dentro da faixa ideal, caindo a zero a `toleranciaGraus` de distância.
// É o freio do crescimento: colmeia lotada esquenta e para de gerar abelhas.
export function ritmoDeEclosao(temperatura) {
  const [min, max] = NINHADA.tempIdeal;
  if (temperatura >= min && temperatura <= max) return 1;
  const fora = temperatura < min ? min - temperatura : temperatura - max;
  return Math.max(0, 1 - fora / NINHADA.toleranciaGraus);
}

function atualizarNinhada(estado, dt) {
  const ritmo = ritmoDeEclosao(estado.clima.temperatura);

  // O relógio da postura só reinicia quando o ovo é realmente posto. Se a
  // rainha ainda não chegou numa célula vazia, ele fica pendente em zero e ela
  // põe assim que parar numa — o passeio dela decide onde a ninhada aparece.
  if (estado.proximaPostura > 0) estado.proximaPostura -= dt;
  else estado.proximaPostura = 0;

  // Sem rainha no posto não há postura: é a janela que a troca custa.
  if (estado.proximaPostura <= 0 && ritmo >= NINHADA.ritmoMinimoParaPor
      && !emInterregno(estado)) {
    const rainha = estado.abelhas.find((a) => a.papel === 'rainha');
    const ondeEla = rainha && rainha.andar === 0 ? estado.celulas[rainha.de] : null;
    const alvo = celulaParaPostura(estado);
    // Ela põe onde está, ou reforça a ninhada que já existe se estiver nela.
    if (alvo && (alvo === ondeEla || alvo.estado === 'ovo')) {
      if (alvo.estado !== 'ovo') {
        alvo.estado = 'ovo';
        alvo.variedade = null;
        alvo.nectar = 0;
        alvo.cura = 0;
        alvo.ninhada = 0;
        alvo.ovos = [];
        alvo.proximoOvo ??= 1;
      }
      const ovos = ovosDaCelula(alvo);
      ovos.push({ id: alvo.proximoOvo++, cura: 0 });
      sincronizarOvos(alvo);
      estado.proximaPostura = intervaloDePostura(estado);
    }
  }

  if (ritmo <= 0) return;
  for (const celula of Object.values(estado.celulas)) {
    if (celula.estado !== 'ovo') continue;
    const eclosao = NINHADA.segundosEclosao * descontoBencao(estado, 'postura');
    for (const ovo of ovosDaCelula(celula)) ovo.cura += (dt / eclosao) * ritmo;
    sincronizarOvos(celula);
    if (celula.cura >= 1) {
      eclodirNinhada(estado, celula);
    }
  }
}

// Células de graça na virada do ano. Sorteia entre as travadas que já estão
// à vista — são sempre vizinhas do que a colmeia já tem, então o favo cresce
// pela borda, do mesmo jeito que cresce comprando.
function presentearCelulas(estado) {
  const { min, max } = PRESENTE_DO_ANO;
  const quantas = min + Math.floor(sortear(estado) * (max - min + 1));
  let dadas = 0;
  for (let i = 0; i < quantas; i++) {
    const travadas = celulasArray(estado).filter((c) => c.estado === 'travada');
    if (!travadas.length) break;
    if (liberarCelula(estado, travadas[Math.floor(sortear(estado) * travadas.length)])) dadas++;
  }
  return dadas;
}

function virarAno(estado, t) {
  if (t.ano === estado.ano) return;

  const meta = metaDoAno(estado.ano);
  const bateu = estado.vendidoNoAno >= meta;
  estado.historico.push({ ano: estado.ano, meta, vendido: estado.vendidoNoAno, bateu });

  if (!bateu) {
    estado.derrota = { ano: estado.ano, meta, vendido: estado.vendidoNoAno };
    estado.velocidade = 0;
    return;
  }

  // Bateu a meta do último ano: a colmeia sobreviveu ao ciclo inteiro.
  if (estado.ano >= META.anoFinal) {
    estado.vitoria = {
      ano: estado.ano,
      total: Math.round(estado.historico.reduce((soma, h) => soma + h.vendido, 0)),
      abelhas: estado.abelhas.length,
    };
    estado.velocidade = 0;
    return;
  }

  estado.ano = t.ano;
  estado.vendidoNoAno = 0;

  // Presente do ano: o favo cresce por ter sobrevivido, não só por ter
  // dinheiro. Vem antes da bênção de propósito — o aviso fica na tela
  // enquanto o jogador escolhe a carta, que é quando ele está olhando.
  const ganhas = presentearCelulas(estado);
  if (ganhas) {
    estado.aviso = {
      texto: ganhas === 1 ? 'A colmeia ganhou 1 célula nova.'
        : `A colmeia ganhou ${ganhas} células novas.`,
      expira: estado.decorrido + 8,
    };
    mostrarDica(estado, 'presenteDoAno');
  }

  // Ano novo começa na primavera: é aqui que a colônia escolhe pra onde vai
  // crescer. Depois da vitória e da derrota de propósito — não faz sentido
  // escolher rumo numa partida que acabou de terminar.
  abrirEscolha(estado);
}

