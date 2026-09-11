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

// ----------------------------------------------------------- duração
// Quantos anos a partida tem. É eixo próprio, e não um desafio, porque não
// muda **como** se joga — muda quanto tempo dura. Com a estação em 3 min e
// meio, cada ano é 14 minutos.
//
// A tabela da meta tem nove degraus já calibrados; uma partida curta usa os
// primeiros, que são os mesmos. Por isso encurtar não exige recalibrar nada.
export const DURACOES = {
  curta: { nome: 'Curta', anos: 4, resumo: '4 anos · ~1 hora' },
  media: { nome: 'Média', anos: 6, resumo: '6 anos · ~1h25' },
  longa: { nome: 'Longa', anos: 9, resumo: '9 anos · ~2h' },
};

export const DURACAO_PADRAO = 'media';

export function anosDaPartida(estado) {
  return DURACOES[estado?.duracao ?? DURACAO_PADRAO]?.anos ?? DURACOES[DURACAO_PADRAO].anos;
}

// ------------------------------------------------------- dificuldade
// Só mexe na exigência, não nas regras: é um multiplicador sobre a meta de
// cada ano. Separado dos desafios de propósito — "mais difícil" e "diferente"
// são coisas distintas, e misturar as duas foi o que deixou a lista antiga
// sem um eixo claro de progressão.
//
// Os números são relativos à folga medida do jogador razoável, que é de ~1,3
// no normal (ver docs/BALANCE.md): no fácil ela vira ~1,7, e no brutal ~0,9 —
// só quem alimenta ninhada e mistura florada passa.
export const DIFICULDADES = {
  tranquila: { nome: 'Tranquila', meta: 0.75, resumo: 'Meta 25% menor' },
  normal: { nome: 'Normal', meta: 1, resumo: 'A meta calibrada' },
  dura: { nome: 'Dura', meta: 1.3, resumo: 'Meta 30% maior' },
  brutal: { nome: 'Brutal', meta: 1.5, resumo: 'Meta 50% maior' },
};

export const DIFICULDADE_PADRAO = 'normal';

export function fatorDaDificuldade(estado) {
  return DIFICULDADES[estado?.dificuldade ?? DIFICULDADE_PADRAO]?.meta ?? 1;
}

export function nomeDaDificuldade(estado) {
  return DIFICULDADES[estado?.dificuldade ?? DIFICULDADE_PADRAO]?.nome
    ?? DIFICULDADES[DIFICULDADE_PADRAO].nome;
}

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
