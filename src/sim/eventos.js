import { sortear } from '../core/rng.js';

// Espaçador de eventos.
//
// Florada, encomenda, chuva/seca, formigas e vespa nasceram cada uma com o seu
// relógio, sem nenhuma saber da outra. Medido numa partida: **um evento a cada
// 30 segundos**, quatro pares com menos de 20 s entre si e dois começando no
// mesmo segundo. Cada sistema estava razoável sozinho; somados viravam barulho.
//
// Aqui há uma regra só, e ela é global: **dois eventos nunca começam a menos de
// `espacoMinimo` um do outro**. Quem é barrado não fica esperando na porta — é
// reagendado com um atraso curto e sorteado, senão todos disparariam juntos no
// instante em que o espaço abrisse, que é o mesmo amontoado com outro nome.
export const EVENTOS = {
  espacoMinimo: 40,
  // Atraso de quem foi barrado. Curto o bastante pra não sumir, sorteado o
  // bastante pra não formar fila.
  adiamentoMin: 25,
  adiamentoMax: 55,
};

export function segundosDesdeOUltimoEvento(estado) {
  return estado.decorrido - (estado.ultimoEvento ?? -Infinity);
}

// Chamado por um sistema que está pronto para começar o seu evento.
// Devolve `true` quando pode — e nesse caso já registra o começo. Quando não
// pode, chama `adiar(segundos)` para o sistema empurrar o próprio relógio.
export function tentarEvento(estado, adiar) {
  if (segundosDesdeOUltimoEvento(estado) < EVENTOS.espacoMinimo) {
    const espera = EVENTOS.adiamentoMin
      + sortear(estado) * (EVENTOS.adiamentoMax - EVENTOS.adiamentoMin);
    if (typeof adiar === 'function') adiar(espera);
    return false;
  }
  estado.ultimoEvento = estado.decorrido;
  return true;
}
