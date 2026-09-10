import { criarRng } from './rng.js';
import { chave, espiral } from '../sim/hex.js';
import { CLIMA, VARIEDADES, CELULA, SILO, CAMPOS, NINHADA } from '../sim/economia.js';
import { DESAFIO_PADRAO, DESAFIOS } from '../sim/desafios.js';

// 2: as abelhas passaram a fazer o mel (antes a célula curava sozinha), ganharam
// passeio, trabalho e fome.
// 3: a cura acabou de vez — a abelha chega com pólen e o mel sai na hora. Um
// save antigo traria células paradas em `curando`, estado que ninguém mais
// desenha nem resolve; por isso é descartado.
export const VERSAO_SAVE = 3;

// O estado é 100% serializável: nada de funções, nada de referências ao DOM.
// `sim/` só transforma este objeto; `render/` só lê.
export function novoJogo(semente = Date.now() & 0xffffffff, desafio = DESAFIO_PADRAO) {
  const rng = criarRng(semente);
  const modo = DESAFIOS[desafio] ? desafio : DESAFIO_PADRAO;

  const celulas = {};
  // Centro + primeiro anel. O centro é da rainha; três vizinhas já vêm abertas.
  const posicoes = espiral({ q: 0, r: 0 }, 1);
  const posSilo = chave(1, -1);
  posicoes.forEach((p, i) => {
    const k = chave(p.q, p.r);
    celulas[k] = {
      q: p.q, r: p.r,
      estado: i === 0 ? 'rainha' : k === posSilo ? 'silo' : i <= 3 ? 'vazia' : 'travada',
      variedade: null,
      nectar: 0,
      cura: 0,
      polen: k === posSilo ? 8 : 0,
      ninhada: 0,
      potes: 0,
    };
  });

  return {
    versao: VERSAO_SAVE,
    semente,
    desafio: modo,          // modificador de partida escolhido no menu
    rngEstado: rng.semente,

    decorrido: 0,          // segundos de jogo — a única fonte de tempo
    velocidade: 1,         // 0 pausado, 1 normal, 3 acelerado
    ano: 1,
    vendidoNoAno: 0,

    moedas: 163,
    nivel: 1,
    xp: 0,

    celulas,
    celulasCompradas: 0,
    proximaPostura: 0,       // conta regressiva da rainha, em segundos

    abelhas: [
      criarAbelha('rainha', 1),
      criarAbelha('operaria', 2),
      criarAbelha('operaria', 3),
    ],
    proximoIdAbelha: 4,

    clima: {
      temperatura: 30.2,
      co2: 553,
      umidade: 48,
    },

    // A colmeia começa com uma reserva própria: as abelhas comem daqui, e sem
    // ela a primeira operária ficaria lenta já aos 45 segundos.
    pote: { ...Object.fromEntries(Object.keys(VARIEDADES).map((k) => [k, 0])), silvestre: 3 },
    // Conta corrente do que as abelhas comeram. O pote guarda potes inteiros —
    // se o consumo fracionado saísse direto dele, 1 pote viraria 0,94 e o
    // jogador ficaria sem poder vender um mel que ainda vê no vidro.
    consumoDeMel: 0,

    // Multiplicador de preço por variedade. 1 = preço-base.
    mercado: Object.fromEntries(Object.keys(VARIEDADES).map((k) => [k, 1])),

    ameaca: null,
    proximoAtaque: 100,
    derrota: null,           // { ano, meta, vendido } se a meta não foi batida
    vitoria: null,           // { ano, total, abelhas } ao sobreviver ao ano final
    historico: [],           // um registro por ano encerrado
    aviso: null,             // { texto, expira } — feedback efêmero na tela

    proximaFlorada: null,      // armado no primeiro passo da simulação
    encomenda: null,           // { variedade, quantidade, entregue, vence, recompensa }
    proximaEncomenda: null,
    dica: null,                // id da dica de primeira vez em exibição
    dicasVistas: {},           // id -> quantas vezes já apareceu
    bencaos: {},               // id da bênção -> nível escolhido
    escolha: null,             // { opcoes: [id, id, id] } enquanto o jogador decide

    campos: CAMPOS.map((c) => ({
      ...c,
      nectar: c.nectarMax,
      florada: 0,              // segundos restantes de florada neste campo
      alocadas: c.alocadasInicial,
      polenAlocadas: c.polenInicial,
      upgrades: { sustentavel: 0, rota: 0, ogm: 0 },
    })),
  };
}

// O id vem de fora (`estado.proximoIdAbelha`) em vez de um contador de módulo:
// um contador de módulo reiniciaria em 1 ao carregar um save e colidiria com
// as abelhas já existentes.
export function criarAbelha(papel, id, talento = null) {
  return {
    id,
    papel,                       // 'rainha' | 'operaria'
    talento,                     // 'coleta' | 'producao' | 'defesa' | null
    estado: papel === 'rainha' ? 'rainha' : 'colmeia',
    campo: null,
    recurso: 'nectar',           // 'nectar' | 'polen' — o que esta viagem busca
    t: 0,                        // progresso 0..1 do estado atual
    carga: 0,
    restaAluguel: 0,             // segundos restantes de polinização paga
    // Passeio dentro do favo: caminha de `de` até `para`, `andar` é 0..1.
    de: '0,0',
    para: '0,0',
    andar: 0,
    pausa: 0,
    // Trabalho em curso na célula onde parou: { tipo, resta, total }.
    trabalho: null,
    polen: 0,                    // pólen que está carregando dentro do favo
    fome: 0,                     // segundos desde a última refeição
  };
}

// Ponto único de saturação dos medidores de clima.
export function limitarClima(clima) {
  for (const m of ['temperatura', 'co2', 'umidade']) {
    clima[m] = Math.min(CLIMA[m].max, Math.max(CLIMA[m].min, clima[m]));
  }
  return clima;
}

// Silos são células, não uma estrutura à parte: existem vários, aparecem
// quando chega pólen e somem quando são esvaziados.
export function silos(estado) {
  return celulasArray(estado).filter((c) => c.estado === 'silo');
}

export function polenTotal(estado) {
  return silos(estado).reduce((total, c) => total + c.polen, 0);
}

export function capacidadeDePolen(estado) {
  return silos(estado).length * SILO.capacidadePorCelula;
}

export function maxSilos(estado) {
  const abertas = celulasArray(estado).filter((c) => c.estado !== 'travada').length;
  return Math.max(1, Math.floor(abertas / SILO.celulasPorSilo));
}

// Não converte a última célula vazia, e respeita o teto de silos por favo.
function celulaParaSilo(estado) {
  if (silos(estado).length >= maxSilos(estado)) return null;
  const vazias = celulasArray(estado).filter((c) => c.estado === 'vazia');
  return vazias.length >= 2 ? vazias[0] : null;
}

// Completa os silos existentes antes de ocupar uma célula nova.
export function guardarPolen(estado, quantidade) {
  let resta = quantidade;
  let guarda = 0;
  while (resta > 0.001 && guarda++ < 24) {
    let alvo = silos(estado).find((c) => c.polen < SILO.capacidadePorCelula);
    if (!alvo) {
      alvo = celulaParaSilo(estado);
      if (!alvo) break;            // favo sem espaço: o pólen se perde
      alvo.estado = 'silo';
      alvo.variedade = null;
      alvo.nectar = 0;
      alvo.cura = 0;
      alvo.polen = 0;
    }
    const posto = Math.min(SILO.capacidadePorCelula - alvo.polen, resta);
    alvo.polen += posto;
    resta -= posto;
  }
  return quantidade - resta;
}

// Esvazia primeiro os silos menos cheios, para devolver células ao favo em vez
// de manter várias meio vazias ocupando espaço.
export function consumirPolen(estado, quantidade) {
  let resta = quantidade;
  const fontes = silos(estado).filter((c) => c.polen > 0).sort((a, b) => a.polen - b.polen);
  for (const celula of fontes) {
    if (resta <= 0.000001) break;
    const tirado = Math.min(celula.polen, resta);
    celula.polen -= tirado;
    resta -= tirado;
    if (celula.polen <= 0.001) {
      celula.polen = 0;
      // O último silo continua no favo, vazio, mostrando zero. Ele sumindo era
      // o pior momento do jogo: o mel parava e o único mostrador de pólen da
      // tela desaparecia junto, sem dizer o que faltava.
      if (silos(estado).length > 1) celula.estado = 'vazia';
    }
  }
  return quantidade - resta;
}

export function celulasArray(estado) {
  return Object.values(estado.celulas);
}

// Célula onde a rainha pode pôr. Só existe **uma** ninhada por vez no favo: a
// rainha cuida de um ovo até ele nascer antes de pôr o próximo, em vez de
// espalhar ovos pelas células. E nunca ocupa a última vazia, senão a colônia
// trava sem lugar pra guardar néctar.
export function celulaParaPostura(estado) {
  const celulas = celulasArray(estado);
  // Já existe ninhada? A rainha soma ovos nela até o limite, em vez de abrir
  // outra célula — a ninhada não se espalha pelo favo.
  const ninhada = celulas.find((c) => c.estado === 'ovo');
  if (ninhada) return (ninhada.ninhada ?? 1) < NINHADA.porNinhada ? ninhada : null;

  const vazias = celulas.filter((c) => c.estado === 'vazia');
  return vazias.length >= 2 ? vazias[0] : null;
}

// Célula onde cabe néctar. Completar uma célula já iniciada é sempre livre.
// Ocupar uma vazia é livre enquanto algum silo tiver espaço — o pólen tem onde
// cair. Quando nenhum silo tem espaço, o néctar precisa deixar células livres
// suficientes pra um silo novo nascer, senão a colmeia trava sem saída.
export function celulaLivre(estado, variedade) {
  const celulas = celulasArray(estado);
  const emCurso = celulas.find(
    (c) => c.estado === 'nectar' && c.variedade === variedade && c.nectar < CELULA.capacidadeNectar,
  );
  if (emCurso) return emCurso;

  const vazias = celulas.filter((c) => c.estado === 'vazia');
  if (!vazias.length) return null;

  const siloComEspaco = celulas.some(
    (c) => c.estado === 'silo' && c.polen < SILO.capacidadePorCelula,
  );
  if (siloComEspaco) return vazias[0];
  return vazias.length > CELULA.reservaSemSilo ? vazias[0] : null;
}
