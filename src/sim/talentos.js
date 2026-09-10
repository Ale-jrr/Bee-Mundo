import { sortear } from '../core/rng.js';

// Personalidade das operárias. Toda abelha nasce com um pendor — ou nenhum — e
// isso muda o que ela faz melhor. O objetivo não é otimização fina: é que a
// colônia deixe de ser um número ("9 abelhas") e vire um elenco, onde perder
// uma coletora para uma vespa dói mais do que perder "uma abelha".
//
// Quem tem talento não vira outra abelha: continua fazendo tudo, só que
// melhor num pedaço. Sem isso o jogador seria obrigado a microgerenciar, e a
// colmeia não é um jogo de fichas.
export const TALENTOS = {
  coleta: { nome: 'Batedora', cor: '#3f8f5a', resumo: 'Coleta 25% mais rápido', ganho: 0.25 },
  producao: { nome: 'Ceroma', cor: '#c8761f', resumo: 'Trabalha 25% mais rápido no favo', ganho: 0.25 },
  defesa: { nome: 'Guardiã', cor: '#7a4bb5', resumo: 'Voa com metade do risco', ganho: 0.5 },
};

// Quatro em dez nascem comuns. Com talento em todas, "ter uma batedora" deixa
// de ser notícia — e é a notícia que faz o jogador olhar pra abelha.
const CHANCE_COMUM = 0.4;

export function sortearTalento(estado) {
  if (sortear(estado) < CHANCE_COMUM) return null;
  const ids = Object.keys(TALENTOS);
  return ids[Math.floor(sortear(estado) * ids.length)] ?? null;
}

export function temTalento(abelha, id) {
  return abelha?.talento === id;
}

// Multiplicador da coleta no campo.
export function fatorColeta(abelha) {
  return temTalento(abelha, 'coleta') ? 1 + TALENTOS.coleta.ganho : 1;
}

// Multiplicador do trabalho e do passeio dentro do favo.
export function fatorProducao(abelha) {
  return temTalento(abelha, 'producao') ? 1 + TALENTOS.producao.ganho : 1;
}

// Multiplicador do risco de voo desta abelha: a guardiã voa mais segura.
export function fatorRisco(abelha) {
  return temTalento(abelha, 'defesa') ? 1 - TALENTOS.defesa.ganho : 1;
}

// Quantas de cada talento a colônia tem. O painel de campos mostra isto: é o
// que transforma "tenho 12 abelhas" em "tenho 3 batedoras".
export function elenco(estado) {
  const conta = { coleta: 0, producao: 0, defesa: 0, comum: 0 };
  for (const abelha of estado.abelhas) {
    if (abelha.papel !== 'operaria') continue;
    conta[abelha.talento ?? 'comum']++;
  }
  return conta;
}

// Censo da colônia: quantas de cada pendor e onde cada uma está. É o que o
// painel de abelhas mostra — o que transforma "tenho 12 abelhas" em "tenho
// três batedoras, e seis delas estão no campo".
export function censo(estado) {
  const talentos = { coleta: 0, producao: 0, defesa: 0, comum: 0 };
  const onde = { colmeia: 0, campo: 0, guarda: 0, alugada: 0 };
  let rainha = 0;
  let operarias = 0;

  for (const abelha of estado.abelhas ?? []) {
    if (abelha.papel === 'rainha') { rainha++; continue; }
    operarias++;
    talentos[abelha.talento ?? 'comum']++;
    // A ordem importa: alugada e guarda descrevem melhor onde ela está do que
    // o campo `estado`, que continua 'colmeia' nos dois casos.
    if (abelha.estado === 'alugada') onde.alugada++;
    else if (abelha.guarda) onde.guarda++;
    else if (['indo', 'coletando', 'voltando'].includes(abelha.estado)) onde.campo++;
    else onde.colmeia++;
  }
  return { talentos, onde, rainha, operarias };
}

// Escolhe, entre as candidatas, a mais adequada à função — e só depois a
// primeira que aparecer. É isto que faz o talento importar sem obrigar o
// jogador a escalar abelha por abelha: ele decide **quantas** vão para o
// campo, e a colmeia manda as certas.
export function melhorPara(candidatas, talento) {
  return candidatas.find((a) => a.talento === talento) ?? candidatas[0] ?? null;
}
