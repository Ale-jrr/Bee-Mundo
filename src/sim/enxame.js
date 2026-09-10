import { celulasArray } from '../core/estado.js';
import { mostrarDica, fecharDica } from './dicas.js';

// Enxameação. A colônia passava de cem abelhas sem que o favo precisasse
// crescer junto — o tamanho virava número, não consequência. Aqui ele volta a
// custar: colmeia apertada se prepara para enxamear, e o jogador escolhe.
//
// São duas saídas de verdade, não uma punição:
//   comprar célula  → a pressão cai e ninguém vai embora
//   deixar enxamear → metade das operárias parte, e o enxame **é vendido** a
//                     outro apiário, virando moedas na hora
//
// Por isso o número de moedas é generoso: sair da colmeia tem que ser uma
// jogada possível, não só o castigo de quem não prestou atenção.
export const ENXAME = {
  abelhasPorCelula: 3.2,
  // Colônia pequena não enxameia: no começo o aperto é a regra, não a exceção.
  minimoAbelhas: 14,
  aviso: 30,
  fracaoQueVai: 0.5,
  moedasPorAbelha: 22,
};

export function pressaoDoEnxame(estado) {
  const operarias = estado.abelhas.filter((a) => a.papel === 'operaria').length;
  const abertas = celulasArray(estado).filter((c) => c.estado !== 'travada').length;
  const limite = Math.max(1, abertas) * ENXAME.abelhasPorCelula;
  return {
    operarias,
    abertas,
    limite: Math.round(limite),
    apertado: operarias >= ENXAME.minimoAbelhas && operarias > limite,
    // Quantas células faltam pra pressão passar. É o número acionável.
    celulasQueFaltam: Math.max(0, Math.ceil(operarias / ENXAME.abelhasPorCelula) - abertas),
  };
}

export function atualizarEnxame(estado, t, dt) {
  // No inverno ninguém sai: um enxame no frio morreria, e o jogo já tem o
  // inverno como aperto próprio.
  if (t.estacao.id === 'inverno') {
    estado.enxame = null;
    return;
  }

  const pressao = pressaoDoEnxame(estado);
  if (!estado.enxame) {
    if (!pressao.apertado) return;
    estado.enxame = { resta: ENXAME.aviso };
    estado.aviso = { texto: 'A colmeia está apertada!', expira: estado.decorrido + 5 };
    mostrarDica(estado, 'enxame');
    return;
  }

  // Abriu espaço a tempo: o enxame desiste. É a recompensa por reagir.
  if (!pressao.apertado) {
    estado.enxame = null;
    fecharDica(estado, 'enxame');
    estado.aviso = { texto: 'Espaço aberto: o enxame ficou', expira: estado.decorrido + 4 };
    return;
  }

  estado.enxame.resta -= dt;
  if (estado.enxame.resta > 0) return;
  enxamear(estado);
}

function enxamear(estado) {
  const operarias = estado.abelhas.filter((a) => a.papel === 'operaria');
  const quantas = Math.floor(operarias.length * ENXAME.fracaoQueVai);
  estado.enxame = null;
  fecharDica(estado, 'enxame');
  if (quantas <= 0) return;

  // Vão as que estão em casa primeiro: quem está no campo ainda não sabe que a
  // colmeia se dividiu. Sem isso o enxame levava abelhas no meio da viagem e o
  // painel de campos ficava mentindo sobre quem está lá fora.
  const ordem = [...operarias].sort(
    (a, b) => (a.estado === 'colmeia' ? 0 : 1) - (b.estado === 'colmeia' ? 0 : 1),
  );
  const partiram = new Set(ordem.slice(0, quantas));
  estado.abelhas = estado.abelhas.filter((a) => !partiram.has(a));

  // As vagas que ficaram vazias voltam pro painel.
  for (const campo of estado.campos) {
    const nectar = estado.abelhas.filter((a) => a.campo === campo.id && a.recurso === 'nectar').length;
    const polen = estado.abelhas.filter((a) => a.campo === campo.id && a.recurso === 'polen').length;
    campo.alocadas = Math.min(campo.alocadas, nectar);
    campo.polenAlocadas = Math.min(campo.polenAlocadas, polen);
  }

  const moedas = quantas * ENXAME.moedasPorAbelha;
  estado.moedas += moedas;
  estado.aviso = {
    texto: `O enxame partiu: ${quantas} abelhas, +${moedas} moedas`,
    expira: estado.decorrido + 6,
  };
}
