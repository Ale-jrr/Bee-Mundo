import { sortear } from '../core/rng.js';
import { consumirMel } from './alimento.js';
import { mostrarDica, fecharDica } from './dicas.js';
import { tentarEvento } from './eventos.js';

// Formigas. A vespa ataca as abelhas; a formiga ataca o **estoque**. São
// ameaças de natureza diferente de propósito: contra a vespa você tira uma
// coletora do campo, contra a formiga você paga para vedar a entrada. Uma
// custa produção, a outra custa dinheiro — e as duas custam atenção.
export const FORMIGAS = {
  intervaloMin: 300,
  intervaloMax: 480,
  duracao: 25,
  // Mel roubado por segundo enquanto a fila estiver aberta: ~2 potes se o
  // jogador não fizer nada.
  rouboPorSegundo: 0.08,
  // Custo de vedar a entrada com própolis. Barato o bastante pra ser sempre a
  // escolha certa quando você vê — o preço de verdade é não ver.
  custoVedar: 12,
};

export function formigasAtacando(estado) {
  return estado.formigas ?? null;
}

export function atualizarFormigas(estado, t, dt) {
  if (estado.proximaFormiga == null) {
    estado.proximaFormiga = estado.decorrido + FORMIGAS.intervaloMin;
  }

  if (estado.formigas) {
    // Roubam continuamente: quanto mais o jogador demora, mais some do vidro.
    estado.formigas.roubado += consumirMel(estado, FORMIGAS.rouboPorSegundo * dt);
    estado.formigas.resta -= dt;
    if (estado.formigas.resta <= 0) {
      const levou = estado.formigas.roubado;
      estado.formigas = null;
      fecharDica(estado, 'formigas');
      agendar(estado);
      estado.aviso = {
        texto: levou >= 0.05
          ? `As formigas levaram ${levou.toFixed(1)} de mel`
          : 'As formigas foram embora de mãos vazias',
        expira: estado.decorrido + 5,
      };
    }
    return;
  }

  if (estado.decorrido < estado.proximaFormiga) return;
  // No inverno a colmeia está fechada e as formigas não vêm.
  if (t.estacao.id === 'inverno') return;

  if (!tentarEvento(estado, (espera) => { estado.proximaFormiga = estado.decorrido + espera; })) {
    return;
  }

  estado.formigas = { resta: FORMIGAS.duracao, roubado: 0 };
  estado.aviso = { texto: 'Formigas na entrada!', expira: estado.decorrido + 5 };
  mostrarDica(estado, 'formigas');
}

function agendar(estado) {
  estado.proximaFormiga = estado.decorrido + FORMIGAS.intervaloMin
    + sortear(estado) * (FORMIGAS.intervaloMax - FORMIGAS.intervaloMin);
}

export function vedarEntrada(estado) {
  if (!estado.formigas) return { ok: false, motivo: 'Não há formigas na entrada.' };
  if (estado.moedas < FORMIGAS.custoVedar) {
    return { ok: false, motivo: `Faltam ${Math.ceil(FORMIGAS.custoVedar - estado.moedas)} moedas.` };
  }
  estado.moedas -= FORMIGAS.custoVedar;
  const levou = estado.formigas.roubado;
  estado.formigas = null;
  fecharDica(estado, 'formigas');
  agendar(estado);
  estado.aviso = {
    texto: levou >= 0.05
      ? `Entrada vedada. Levaram ${levou.toFixed(1)} de mel`
      : 'Entrada vedada a tempo',
    expira: estado.decorrido + 5,
  };
  return { ok: true, roubado: levou };
}
