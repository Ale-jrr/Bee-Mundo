import { SEGUNDOS_POR_ANO } from './estacoes.js';
import { NINHADA } from './economia.js';

// A rainha envelhece. Sem isso ela era o único elemento da colmeia que não
// mudava nunca: mesma postura no Ano 1 e no Ano 9. Agora o vigor cai, a
// ninhada rareia, e trocar de rainha vira uma decisão com custo e janela de
// risco — porque a colmeia fica sem postura enquanto a nova amadurece.
export const RAINHA = {
  // Dois anos no auge antes de começar a cair.
  augeAnos: 2,
  // E mais quatro até o mínimo.
  declinioAnos: 4,
  vigorMinimo: 0.35,
  // Coroar custa mel — o mesmo mel que iria para a meta.
  custoMel: 6,
  // Segundos sem postura enquanto a nova rainha amadurece. É o preço de
  // trocar: uma janela em que a colônia não repõe ninguém.
  interregno: 25,
};

export function idadeDaRainha(estado) {
  return Math.max(0, estado.decorrido - (estado.rainhaDesde ?? 0));
}

// 1 no auge, caindo linearmente até `vigorMinimo`.
export function vigorDaRainha(estado) {
  const anos = idadeDaRainha(estado) / SEGUNDOS_POR_ANO;
  if (anos <= RAINHA.augeAnos) return 1;
  const t = Math.min(1, (anos - RAINHA.augeAnos) / RAINHA.declinioAnos);
  return 1 - (1 - RAINHA.vigorMinimo) * t;
}

// Intervalo entre posturas, já com o vigor descontado: rainha velha demora
// mais para pôr o próximo ovo.
export function intervaloDePostura(estado) {
  return NINHADA.segundosPostura / vigorDaRainha(estado);
}

export function emInterregno(estado) {
  return (estado.interregno ?? 0) > 0;
}

export function atualizarRainha(estado, dt) {
  if (estado.rainhaDesde == null) estado.rainhaDesde = 0;
  if (estado.interregno > 0) {
    estado.interregno = Math.max(0, estado.interregno - dt);
    if (estado.interregno === 0) {
      estado.aviso = { texto: 'A nova rainha assumiu', expira: estado.decorrido + 5 };
    }
  }
}

// Custo em mel: gasta a variedade mais barata primeiro, igual à alimentação.
export function podeCoroar(estado) {
  const total = Object.values(estado.pote).reduce((s, v) => s + Math.floor(v), 0);
  return total >= RAINHA.custoMel;
}
