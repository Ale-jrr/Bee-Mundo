import { previsaoInverno } from './inverno.js';
import { encomendaAtiva } from './encomendas.js';

// Quais avisos estão valendo agora. A tela ficou cheia: inverno, enxame,
// formigas, vespa e encomenda podem estar em curso ao mesmo tempo, e cinco
// cartões empilhados cobriam o favo — que é o que o jogador quer olhar.
//
// Agora eles moram atrás do sino. Este módulo é a lista; quem desenha decide
// como mostrar.
//
// A ordem importa: é a ordem em que aparecem no painel, e as coisas com
// relógio correndo vêm antes das que só informam.
const ORDEM = ['enxame', 'formigas', 'vespa', 'inverno', 'encomenda'];

const URGENTES = new Set(['enxame', 'formigas', 'vespa']);

export function avisosAtivos(estado) {
  if (!estado) return [];
  const ativos = new Set();
  if (estado.enxame) ativos.add('enxame');
  if (estado.formigas) ativos.add('formigas');
  if (estado.ameaca) ativos.add('vespa');
  if (previsaoInverno(estado)) ativos.add('inverno');
  if (encomendaAtiva(estado)) ativos.add('encomenda');
  return ORDEM.filter((id) => ativos.has(id));
}

// Urgente é o que tem contagem regressiva e custa alguma coisa se for
// ignorado. O sino pisca por causa deles, não pela encomenda.
export function temUrgente(estado) {
  return avisosAtivos(estado).some((id) => URGENTES.has(id));
}

// Quais estão ativos e o jogador ainda não viu. `vistos` é uma lista simples
// que a interface guarda — não vai pro save: aviso visto ontem não interessa.
export function avisosNovos(estado, vistos = []) {
  const jaVistos = new Set(vistos);
  return avisosAtivos(estado).filter((id) => !jaVistos.has(id));
}
