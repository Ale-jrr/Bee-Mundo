import { sortear } from '../core/rng.js';
import { mostrarDica } from './dicas.js';

// Bênção da primavera: uma escolha por ano, entre três cartas. É o que faz duas
// partidas com a mesma semente correrem diferente — todo o resto do jogo é
// otimização do mesmo caminho, e isto é a única coisa que muda o caminho.
//
// Duas regras dão a variedade:
//
//   1. O baralho é grande (quinze cartas para nove escolhas), então nenhuma
//      partida vê tudo e duas partidas não veem o mesmo.
//   2. **O valor é sorteado na hora da oferta**, dentro da faixa de cada carta.
//      "Rota Curta 9%" e "Rota Curta 15%" são a mesma carta e decisões
//      diferentes — e é isso que impede a terceira primavera de parecer a
//      primeira.
//
// `tipo` diz de que lado o número entra: `bonus` multiplica pra cima (coleta,
// preço), `desconto` multiplica pra baixo (risco, tempo, custo).
export const BENCAOS = {
  // ---------------------------------------------------------------- campo
  coleta: {
    nome: 'Rota Curta', tipo: 'bonus', min: 0.08, max: 0.16, max_nivel: 3,
    resumo: (p) => `Coleta ${p}% mais rápida`,
  },
  viagem: {
    nome: 'Vento a Favor', tipo: 'desconto', min: 0.08, max: 0.18, max_nivel: 3,
    resumo: (p) => `Viagem ${p}% mais curta`,
  },
  guarda: {
    nome: 'Guardiãs Atentas', tipo: 'desconto', min: 0.18, max: 0.35, max_nivel: 3,
    resumo: (p) => `Voo ${p}% menos perigoso`,
  },
  florada: {
    nome: 'Terra Fértil', tipo: 'bonus', min: 0.20, max: 0.40, max_nivel: 3,
    resumo: (p) => `Floradas duram ${p}% a mais`,
  },

  // ---------------------------------------------------------------- favo
  oficio: {
    nome: 'Mãos de Cera', tipo: 'desconto', min: 0.12, max: 0.25, max_nivel: 3,
    resumo: (p) => `Fazer mel ${p}% mais rápido`,
  },
  passo: {
    nome: 'Passo Firme', tipo: 'desconto', min: 0.10, max: 0.20, max_nivel: 3,
    resumo: (p) => `Abelhas andam ${p}% mais rápido`,
  },
  polen: {
    nome: 'Pólen Farto', tipo: 'desconto', min: 0.15, max: 0.30, max_nivel: 3,
    resumo: (p) => `Cada mel gasta ${p}% menos pólen`,
  },
  feromonio: {
    nome: 'Feromônio Forte', tipo: 'bonus', min: 0.10, max: 0.20, max_nivel: 3,
    resumo: (p) => `A rainha organiza ${p}% melhor`,
  },
  cera: {
    nome: 'Cera de Sobra', tipo: 'desconto', min: 0.10, max: 0.22, max_nivel: 3,
    resumo: (p) => `Células ${p}% mais baratas`,
  },

  // ------------------------------------------------------------- colônia
  postura: {
    nome: 'Rainha Fértil', tipo: 'desconto', min: 0.12, max: 0.25, max_nivel: 3,
    resumo: (p) => `Ninhada ${p}% mais rápida`,
  },
  calor: {
    nome: 'Corpo Quente', tipo: 'bonus', min: 0.15, max: 0.30, max_nivel: 3,
    resumo: (p) => `Cada abelha aquece ${p}% a mais`,
  },
  apetite: {
    nome: 'Boca Pequena', tipo: 'desconto', min: 0.15, max: 0.30, max_nivel: 3,
    resumo: (p) => `Abelhas comem ${p}% menos mel`,
  },
  agasalho: {
    nome: 'Cera Isolante', tipo: 'bonus', min: 0.10, max: 0.22, max_nivel: 3,
    resumo: (p) => `Inverno rende ${p}% a mais`,
  },

  // -------------------------------------------------------------- bolsa
  negocio: {
    nome: 'Bom Negociante', tipo: 'bonus', min: 0.05, max: 0.12, max_nivel: 3,
    resumo: (p) => `Mel vale ${p}% a mais`,
  },
  encomenda: {
    nome: 'Freguesia Fiel', tipo: 'bonus', min: 0.15, max: 0.30, max_nivel: 3,
    resumo: (p) => `Encomendas pagam ${p}% a mais`,
  },
};

const OPCOES_POR_PRIMAVERA = 3;
// O sorteio anda de 1% em 1%: o jogador compara "12%" com "15%", não
// "12,3847%".
const PASSO = 0.01;
// Piso dos descontos: nada no jogo pode chegar a custo zero ou tempo zero.
const PISO = 0.25;

// Estado acumulado de uma bênção. Guarda o **total somado**, não o nível vezes
// um valor fixo: com valor sorteado, duas escolhas da mesma carta podem valer
// 9% e 15%, e recalcular pelo nível perderia isso.
function acumulado(estado, id) {
  const bruto = estado?.bencaos?.[id];
  if (bruto == null) return { nivel: 0, total: 0 };
  // Save antigo guardava só o nível, com valor fixo por carta.
  if (typeof bruto === 'number') {
    return { nivel: bruto, total: bruto * (BENCAOS[id]?.min ?? 0) };
  }
  return { nivel: bruto.nivel ?? 0, total: bruto.total ?? 0 };
}

export function nivelBencao(estado, id) {
  return acumulado(estado, id).nivel;
}

export function totalBencao(estado, id) {
  return acumulado(estado, id).total;
}

// Multiplicador de quem **ganha** com a bênção (coleta, preço, calor).
export function bonusBencao(estado, id) {
  return 1 + totalBencao(estado, id);
}

// Multiplicador de quem **perde** com ela (risco, custo, tempo).
export function descontoBencao(estado, id) {
  return Math.max(PISO, 1 - totalBencao(estado, id));
}

// A estação só melhora com `agasalho` no inverno: é resistência ao frio, não
// um bônus geral disfarçado.
export function fatorDoInverno(estado, estacao) {
  return estacao?.id === 'inverno' ? bonusBencao(estado, 'agasalho') : 1;
}

function sortearValor(estado, regra) {
  const bruto = regra.min + sortear(estado) * (regra.max - regra.min);
  return Math.round(bruto / PASSO) * PASSO;
}

// Três cartas sorteadas entre as que ainda não estouraram o teto, cada uma já
// com o seu valor. Sem repetir carta na mesma oferta — duas iguais lado a lado
// não são escolha, são a mesma coisa duas vezes.
export function sortearBencaos(estado) {
  const resto = Object.keys(BENCAOS)
    .filter((id) => nivelBencao(estado, id) < BENCAOS[id].max_nivel);
  const escolhidas = [];
  while (escolhidas.length < OPCOES_POR_PRIMAVERA && resto.length) {
    const i = Math.min(Math.floor(sortear(estado) * resto.length), resto.length - 1);
    const id = resto.splice(i, 1)[0];
    escolhidas.push({ id, valor: sortearValor(estado, BENCAOS[id]) });
  }
  return escolhidas;
}

// Abre a escolha e pausa o jogo. Pausar é de propósito: é o único momento do
// jogo em que a decisão vale a partida inteira, e com a simulação correndo o
// jogador escolhe às pressas ou nem vê.
export function abrirEscolha(estado) {
  const opcoes = sortearBencaos(estado);
  if (!opcoes.length) return false;
  estado.escolha = { opcoes };
  estado.velocidade = 0;
  mostrarDica(estado, 'primavera');
  return true;
}

export function escolherBencao(estado, id) {
  const oferta = estado.escolha?.opcoes?.find((o) => (o.id ?? o) === id);
  if (!oferta) return { ok: false, motivo: 'Essa bênção não está em oferta.' };

  const regra = BENCAOS[id];
  const valor = oferta.valor ?? regra.min;
  const antes = acumulado(estado, id);

  estado.bencaos = { ...(estado.bencaos ?? {}) };
  estado.bencaos[id] = { nivel: antes.nivel + 1, total: antes.total + valor };
  estado.escolha = null;
  estado.velocidade = 1;
  estado.aviso = {
    texto: `${regra.nome}: ${textoDaBencao(id, valor)}`,
    expira: estado.decorrido + 5,
  };
  return { ok: true, id, valor, nivel: estado.bencaos[id].nivel };
}

// Texto da carta com o valor sorteado, em porcentagem inteira.
export function textoDaBencao(id, valor) {
  return BENCAOS[id].resumo(Math.round(valor * 100));
}
