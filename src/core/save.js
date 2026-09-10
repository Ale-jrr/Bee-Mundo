import { ovosDaCelula, sincronizarOvos } from './ovos.js';
import { consumirMel } from '../sim/alimento.js';
import { novoJogo, VERSAO_SAVE } from './estado.js';
import { CAMPOS, MERCADO } from '../sim/economia.js';

export const CHAVE = 'colmeia:save';

// Campos guardam só a parte mutável. O resto (nome, taxa, risco, slots) é
// recarregado do catálogo, então rebalancear um campo ou acrescentar um novo
// vale para saves antigos em vez de ficar congelado neles.
function serializarCampos(estado) {
  return estado.campos.map((c) => ({
    id: c.id,
    nectar: c.nectar,
    florada: c.florada ?? 0,
    alocadas: c.alocadas,
    polenAlocadas: c.polenAlocadas,
    upgrades: { ...c.upgrades },
  }));
}

function reidratarCampos(salvos = []) {
  return CAMPOS.map((base) => {
    const salvo = salvos.find((c) => c.id === base.id);
    return {
      ...base,
      nectar: salvo?.nectar ?? base.nectarMax,
      florada: salvo?.florada ?? 0,
      alocadas: salvo?.alocadas ?? base.alocadasInicial,
      polenAlocadas: salvo?.polenAlocadas ?? base.polenInicial,
      upgrades: { sustentavel: 0, rota: 0, ogm: 0, posto: 0, ...(salvo?.upgrades ?? {}) },
    };
  });
}

export function serializar(estado) {
  return {
    versao: VERSAO_SAVE,
    salvoEm: Date.now(),
    semente: estado.semente,
    desafio: estado.desafio ?? null,
    rngEstado: estado.rngEstado,
    decorrido: estado.decorrido,
    velocidade: estado.velocidade,
    ano: estado.ano,
    vendidoNoAno: estado.vendidoNoAno,
    moedas: estado.moedas,
    nivel: estado.nivel,
    xp: estado.xp,
    celulas: estado.celulas,
    celulasCompradas: estado.celulasCompradas,
    proximaPostura: estado.proximaPostura,
    abelhas: estado.abelhas,
    proximoIdAbelha: estado.proximoIdAbelha,
    clima: estado.clima,
    pote: estado.pote,
    consumoDeMel: estado.consumoDeMel,
    mercado: estado.mercado,
    ameaca: estado.ameaca ?? null,
    proximoAtaque: estado.proximoAtaque,
    turbo: estado.turbo ?? null,
    proximaFlorada: estado.proximaFlorada ?? null,
    encomenda: estado.encomenda ?? null,
    proximaEncomenda: estado.proximaEncomenda ?? null,
    ultimoEvento: estado.ultimoEvento ?? null,
    formigas: estado.formigas ?? null,
    proximaFormiga: estado.proximaFormiga ?? null,
    rainhaDesde: estado.rainhaDesde ?? 0,
    interregno: estado.interregno ?? 0,
    tempo: estado.tempo ?? null,
    proximoTempo: estado.proximoTempo ?? null,
    enxame: estado.enxame ?? null,
    tutorial: estado.tutorial ?? null,
    dica: estado.dica ?? null,
    dicasVistas: estado.dicasVistas ?? {},
    velocidadeAntesDaDica: estado.velocidadeAntesDaDica ?? null,
    bencaos: estado.bencaos ?? {},
    escolha: estado.escolha ?? null,
    derrota: estado.derrota,
    vitoria: estado.vitoria,
    historico: estado.historico,
    campos: serializarCampos(estado),
  };
}

// Reconstrói sobre um jogo novo: qualquer campo que o save não tenha (porque é
// mais antigo que o código) fica com o padrão em vez de virar `undefined`.
export function desserializar(dados) {
  const base = novoJogo(dados.semente ?? Date.now() & 0xffffffff, dados.desafio ?? undefined);
  const estado = { ...base };

  for (const chave of [
    'rngEstado', 'decorrido', 'velocidade', 'ano', 'vendidoNoAno', 'moedas',
    'nivel', 'xp', 'celulasCompradas', 'proximaPostura', 'proximoIdAbelha',
    'derrota', 'vitoria', 'turbo', 'consumoDeMel', 'proximaFlorada',
    'encomenda', 'proximaEncomenda', 'escolha', 'dica', 'velocidadeAntesDaDica', 'enxame', 'tutorial',
    'tempo', 'proximoTempo', 'rainhaDesde', 'interregno',
    'formigas', 'proximaFormiga', 'ultimoEvento', 'ameaca', 'proximoAtaque',
  ]) {
    if (dados[chave] !== undefined) estado[chave] = dados[chave];
  }

  if (dados.celulas) estado.celulas = dados.celulas;
  if (dados.abelhas) estado.abelhas = dados.abelhas;
  if (dados.historico) estado.historico = dados.historico;
  if (dados.clima) estado.clima = { ...base.clima, ...dados.clima };
  if (dados.pote) estado.pote = { ...base.pote, ...dados.pote };
  if (dados.bencaos) estado.bencaos = { ...dados.bencaos };
  if (dados.dicasVistas) estado.dicasVistas = { ...dados.dicasVistas };
  // Apenas variedades do catálogo entram na simulação. Valores inválidos
  // voltam ao padrão sem descartar o restante do progresso.
  estado.mercado = Object.fromEntries(Object.entries(base.mercado).map(([id, padrao]) => {
    const valor = dados.mercado?.[id];
    return [id, Number.isFinite(valor)
      ? Math.min(MERCADO.maximo, Math.max(MERCADO.minimo, valor)) : padrao];
  }));
  // Migra a antiga conta de refeições para o estoque fracionado, uma vez.
  if (Number.isFinite(estado.consumoDeMel) && estado.consumoDeMel > 0) consumirMel(estado, estado.consumoDeMel);
  estado.consumoDeMel = 0;
  estado.campos = reidratarCampos(dados.campos);
  estado.aviso = null;
  if (dados.proximoAtaque === undefined) estado.proximoAtaque = estado.decorrido + 100;

  // Uma abelha sem id colidiria com as próximas; garante a invariante.
  let maiorId = 0;
  for (const abelha of estado.abelhas) {
    if (typeof abelha.id !== 'number') abelha.id = ++maiorId;
    maiorId = Math.max(maiorId, abelha.id);
    // Save anterior ao passeio: planta a abelha no centro do favo.
    if (typeof abelha.de !== 'string') {
      abelha.de = '0,0';
      abelha.para = '0,0';
      abelha.andar = 0;
      abelha.pausa = 0;
    }
    if (abelha.trabalho === undefined) abelha.trabalho = null;
    if (typeof abelha.polen !== 'number') abelha.polen = 0;
    if (typeof abelha.fome !== 'number') abelha.fome = 0;
  }
  for (const c of Object.values(estado.celulas)) {
    if (c.estado === 'ovo') { ovosDaCelula(c); sincronizarOvos(c); }
  }
  estado.proximoIdAbelha = Math.max(estado.proximoIdAbelha ?? 1, maiorId + 1);

  return estado;
}

// Ponto único de migração. Cada versão sobe uma casa; um save que não dá para
// migrar é descartado em silêncio e o jogador começa de novo — melhor que
// carregar um estado inconsistente e travar no meio da partida.
function migrar(dados) {
  if (!dados || typeof dados !== 'object') return null;
  const v = dados.versao ?? 0;
  if (v > VERSAO_SAVE) return null;   // save de uma versão futura do jogo
  // Antes da versão 2 a célula curava sozinha; um save daquela época descreve
  // um jogo que não existe mais. Melhor recomeçar que carregar incoerente.
  if (v < VERSAO_SAVE) return null;
  return dados;
}

export function salvar(estado) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(serializar(estado)));
    return true;
  } catch {
    // Cota estourada, modo privado ou armazenamento bloqueado: o jogo continua
    // rodando sem save em vez de quebrar.
    return false;
  }
}

export function lerBruto() {
  try {
    const texto = localStorage.getItem(CHAVE);
    return texto ? JSON.parse(texto) : null;
  } catch {
    return null;
  }
}

export function carregar() {
  const dados = migrar(lerBruto());
  if (!dados) return null;
  try {
    const estado = desserializar(dados);
    return { estado, salvoEm: dados.salvoEm ?? Date.now() };
  } catch {
    return null;
  }
}

export function apagar() {
  try {
    localStorage.removeItem(CHAVE);
    return true;
  } catch {
    return false;
  }
}
