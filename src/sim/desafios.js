// Desafios de partida: modificadores escolhidos antes de começar. Existem
// porque depois do Ano 9 não sobra motivo pra abrir o jogo de novo — a curva é
// a mesma. Cada desafio troca uma regra e obriga outra estratégia.
//
// Todos os números do jogo já viviam em `economia.js`, então um desafio é só um
// multiplicador aplicado em dois ou três pontos. Era pra isso que a regra de
// "nenhum número mágico espalhado" servia.
export const DESAFIOS = {
  padrao: {
    nome: 'Colmeia Comum',
    resumo: 'O jogo como ele é',
  },
  apertado: {
    nome: 'Espaço Apertado',
    resumo: 'Célula custa 80% a mais',
    precoCelula: 1.8,
  },
  perigoso: {
    nome: 'Campos Perigosos',
    resumo: 'O dobro de risco no voo',
    risco: 2,
  },
  rigoroso: {
    nome: 'Inverno Rigoroso',
    resumo: 'Inverno rende 30% a menos',
    inverno: 0.7,
  },
};

export const DESAFIO_PADRAO = 'padrao';

export function regraDoDesafio(estado, chave) {
  return DESAFIOS[estado?.desafio ?? DESAFIO_PADRAO]?.[chave] ?? 1;
}

// Penalidade do desafio sobre a estação. Só morde no inverno — um desafio que
// piorasse o ano inteiro seria só a meta subida por outro nome.
export function penalidadeDoInverno(estado, estacao) {
  return estacao?.id === 'inverno' ? regraDoDesafio(estado, 'inverno') : 1;
}

export function nomeDoDesafio(estado) {
  return DESAFIOS[estado?.desafio ?? DESAFIO_PADRAO]?.nome ?? DESAFIOS.padrao.nome;
}
