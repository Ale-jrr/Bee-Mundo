// Dicas de primeira vez. O jogo não tem tutorial, e mecânica que aparece do
// nada no meio da partida — florada, encomenda, vespa — só é entendida por
// quem já entendeu. A dica aparece nas primeiras vezes e some depois: quem já
// sabe não precisa ver de novo, e o contador vai no save justamente pra isso.
export const DICAS = {
  florada: {
    titulo: 'florada',
    vezes: 2,
    linhas: [
      'Um campo entrou em flor por pouco tempo.',
      'Enquanto dura, ele rende bem mais néctar e',
      'a reserva dele enche na hora.',
      'Vale mandar abelhas para lá — mas confira o',
      'risco do campo antes de mudar a turma.',
    ],
  },
  encomenda: {
    titulo: 'encomenda',
    vezes: 2,
    linhas: [
      'Alguém quer uma variedade específica, com prazo.',
      'Entregar é vender: o mesmo pote conta para a',
      'encomenda e para a meta do ano, e ainda paga um',
      'extra por fora. Perder o prazo não custa nada —',
      'é objetivo a mais, não uma segunda meta.',
    ],
  },
  vespa: {
    titulo: 'vespa',
    vezes: 2,
    linhas: [
      'Uma vespa está rondando e vai levar uma coletora',
      'se ninguém defender a entrada.',
      'Guardiãs saem da colmeia, não do campo: recolha',
      'uma turma com o − para ter abelha livre.',
      'Duas guardiãs espantam a vespa.',
    ],
  },
  inverno: {
    titulo: 'inverno',
    vezes: 2,
    linhas: [
      'No inverno não há coleta: a colônia vive do mel',
      'guardado, e quem estiver fora quando a estação',
      'virar morre de frio.',
      'Recolha as coletoras antes e guarde mel — o',
      'painel da esquerda mostra quanto vai faltar.',
    ],
  },
  primavera: {
    titulo: 'bênção da primavera',
    vezes: 1,
    linhas: [
      'Toda primavera a colmeia escolhe um rumo.',
      'São três cartas de um baralho de quinze, e o',
      'valor de cada uma é sorteado na hora — a mesma',
      'carta pode valer 9% ou 15%.',
      'O jogo fica parado até você escolher.',
    ],
  },
  formigas: {
    titulo: 'formigas',
    vezes: 2,
    linhas: [
      'A vespa ataca as abelhas; a formiga ataca o',
      'vidro — leva mel enquanto a fila estiver aberta.',
      'Vedar a entrada custa moedas e resolve na hora.',
      'O preço de verdade não é a moeda: é não notar',
      'a tempo e descobrir o vidro mais vazio.',
    ],
  },
  tempo: {
    titulo: 'tempo virado',
    vezes: 2,
    linhas: [
      'Chuva e seca duram pouco e atacam lados',
      'diferentes: na chuva as abelhas quase não',
      'colhem; na seca os campos param de se',
      'recompor e o néctar guardado acaba.',
      'Passa sozinho — a questão é o que fazer até lá.',
    ],
  },
  enxame: {
    titulo: 'enxame',
    vezes: 2,
    linhas: [
      'A colônia não cabe mais no favo e metade está',
      'pronta pra ir embora fundar outra colmeia.',
      'Compre células e a pressão passa: ninguém sai.',
      'Ou deixe partir — o enxame é vendido a outro',
      'apiário e vira moedas na hora. É escolha sua.',
    ],
  },
};

// Abre a dica se ela ainda não bateu o limite de aparições. Devolve se abriu,
// pra quem chama poder decidir o que fazer — hoje ninguém precisa.
export function mostrarDica(estado, id) {
  const regra = DICAS[id];
  if (!regra) return false;
  estado.dicasVistas = { ...(estado.dicasVistas ?? {}) };
  const vistas = estado.dicasVistas[id] ?? 0;
  if (vistas >= regra.vezes) return false;

  estado.dicasVistas[id] = vistas + 1;
  estado.dica = id;
  return true;
}

export function fecharDica(estado, id = null) {
  if (id && estado.dica !== id) return;
  estado.dica = null;
}

export function dicaAtiva(estado) {
  const id = estado?.dica;
  return id && DICAS[id] ? { id, ...DICAS[id] } : null;
}
