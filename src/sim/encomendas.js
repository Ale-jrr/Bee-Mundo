import { sortear } from '../core/rng.js';
import { VARIEDADES } from './economia.js';
import { SEGUNDOS_POR_ESTACAO, relogio } from './estacoes.js';
import { bonusBencao } from './bencaos.js';
import { mostrarDica } from './dicas.js';

// Encomenda: um pedido por uma variedade específica, com prazo. A meta anual
// só olha o total vendido, então o jogador acaba tratando os quatro méis como
// o mesmo número; a encomenda é o que faz *qual* campo ele guarnece importar.
//
// Entregar é vender: não há botão separado. Vender o mel pedido conta para a
// encomenda **e** para a meta do ano — a recompensa é o extra, não um caminho
// paralelo, e assim nunca compensa segurar mel esperando pedido.
export const ENCOMENDA = {
  intervaloMin: 60,
  intervaloMax: 110,
  // Prazo em estações inteiras: o pedido vence no fim da N-ésima estação a
  // partir da atual, que é o que deixa dizer "até o outono" em vez de "em 84s".
  estacoesDePrazo: 2,
  quantidadeBase: 2,
  quantidadePorNivel: 0.55,
  quantidadeMaxima: 14,
  // Paga por pote o preço-base da variedade vezes isto. Acima de ~1,6 a
  // encomenda passa a valer mais que o próprio mel e vira a única coisa que o
  // jogador olha; abaixo de ~1,2 ninguém desvia a turma para atendê-la.
  premio: 1.5,
};

export function encomendaAtiva(estado) {
  return estado.encomenda ?? null;
}

export function atualizarEncomendas(estado, t, dt) {
  if (estado.proximaEncomenda == null) {
    estado.proximaEncomenda = estado.decorrido + ENCOMENDA.intervaloMin;
  }

  const pedido = estado.encomenda;
  if (pedido) {
    if (estado.decorrido < pedido.vence) return;
    estado.encomenda = null;
    estado.aviso = {
      texto: `Encomenda vencida: faltaram ${Math.ceil(pedido.quantidade - pedido.entregue)}`,
      expira: estado.decorrido + 5,
    };
    agendar(estado);
    return;
  }

  if (estado.decorrido < estado.proximaEncomenda) return;
  estado.encomenda = criarPedido(estado, t);
  estado.aviso = {
    texto: `Encomenda: ${estado.encomenda.quantidade} de ${VARIEDADES[estado.encomenda.variedade].nome}`,
    expira: estado.decorrido + 5,
  };
  mostrarDica(estado, 'encomenda');
}

function agendar(estado) {
  estado.proximaEncomenda = estado.decorrido + ENCOMENDA.intervaloMin
    + sortear(estado) * (ENCOMENDA.intervaloMax - ENCOMENDA.intervaloMin);
}

function criarPedido(estado, t) {
  const ids = Object.keys(VARIEDADES);
  const variedade = ids[Math.floor(sortear(estado) * ids.length)] ?? ids[0];
  const quantidade = Math.min(
    ENCOMENDA.quantidadeMaxima,
    Math.max(1, Math.round(ENCOMENDA.quantidadeBase + ENCOMENDA.quantidadePorNivel * estado.nivel)),
  );
  // Vence no fim de uma estação, não N segundos à frente: assim o prazo é
  // legível ("até o outono") e cai junto com a virada que o jogador já observa.
  const fimDaEstacaoAtual = estado.decorrido + t.restamSegundos;
  const vence = fimDaEstacaoAtual + SEGUNDOS_POR_ESTACAO * (ENCOMENDA.estacoesDePrazo - 1);
  return {
    variedade,
    quantidade,
    entregue: 0,
    vence,
    recompensa: Math.round(quantidade * VARIEDADES[variedade].base * ENCOMENDA.premio
      * bonusBencao(estado, 'encomenda')),
  };
}

// Chamado por `vender`. Devolve o que foi pago, ou 0 — quem vende não precisa
// saber se havia encomenda.
export function registrarEntrega(estado, variedade, potes) {
  const pedido = estado.encomenda;
  if (!pedido || pedido.variedade !== variedade || potes <= 0) return 0;

  pedido.entregue += potes;
  if (pedido.entregue < pedido.quantidade) return 0;

  const recompensa = pedido.recompensa;
  estado.encomenda = null;
  estado.moedas += recompensa;
  estado.aviso = { texto: `Encomenda paga: +${recompensa}`, expira: estado.decorrido + 5 };
  agendar(estado);
  return recompensa;
}

// Nome da estação em que o pedido vence, para o painel poder dizer "até o
// outono" em vez de contar segundos.
export function estacaoDoPrazo(pedido) {
  return relogio(Math.max(0, pedido.vence - 0.001)).estacao;
}
