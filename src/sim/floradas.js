import { sortear } from '../core/rng.js';
import { statsDoCampo } from './economia.js';
import { mostrarDica, fecharDica } from './dicas.js';
import { bonusBencao } from './bencaos.js';

// Florada: um campo entra em flor por pouco tempo e rende muito mais. É a
// única coisa no jogo que muda o valor de um campo **durante** a partida, e é
// isso que a torna uma decisão: mudar a turma custa a viagem que já estava em
// curso, e o campo que floresce pode ser justamente o mais perigoso.
export const FLORADA = {
  duracao: 25,
  intervaloMin: 90,
  intervaloMax: 150,
  taxa: 1.6,          // multiplicador da taxa do campo enquanto dura
  reserva: 1.5,       // e do néctar que o campo comporta
  // Não começa uma florada que morreria na virada do inverno: prometer uma
  // oportunidade e tirá-la em cinco segundos é pior que não prometer.
  folgaParaInverno: 20,
};

export function campoEmFlorada(estado) {
  return estado.campos.find((c) => (c.florada ?? 0) > 0) ?? null;
}

// Aplica a florada sobre os números já derivados dos upgrades. Fica aqui, e não
// dentro de `statsDoCampo`, porque a florada é regra de simulação com tempo —
// `economia.js` guarda constantes, não estado que corre.
export function statsComFlorada(campo) {
  const stats = statsDoCampo(campo);
  if (!(campo.florada > 0)) return stats;
  return {
    ...stats,
    taxa: stats.taxa * FLORADA.taxa,
    nectarMax: stats.nectarMax * FLORADA.reserva,
  };
}

export function atualizarFloradas(estado, t, dt) {
  if (estado.proximaFlorada == null) {
    estado.proximaFlorada = estado.decorrido + FLORADA.intervaloMin;
  }

  const emFlor = campoEmFlorada(estado);
  if (emFlor) {
    emFlor.florada = Math.max(0, emFlor.florada - dt);
    if (emFlor.florada === 0) {
      // A dica explica o que está acontecendo agora; passada a florada ela
      // perde o assunto e sai da frente sozinha.
      fecharDica(estado, 'florada');
      estado.aviso = { texto: `Fim da florada: ${emFlor.nome}`, expira: estado.decorrido + 4 };
      estado.proximaFlorada = estado.decorrido
        + FLORADA.intervaloMin + sortear(estado) * (FLORADA.intervaloMax - FLORADA.intervaloMin);
    }
    return;
  }

  if (estado.decorrido < estado.proximaFlorada) return;
  // No inverno não há coleta: florada aqui seria enfeite sem consequência.
  if (t.estacao.id === 'inverno') return;
  if (t.estacao.id === 'outono' && t.restamSegundos <= FLORADA.folgaParaInverno) return;

  const abertos = estado.campos.filter((c) => estado.nivel >= c.nivelMin);
  if (!abertos.length) return;

  const campo = abertos[Math.floor(sortear(estado) * abertos.length)] ?? abertos[0];
  campo.florada = FLORADA.duracao * bonusBencao(estado, 'florada');
  // Floresce cheio: a oportunidade é o néctar disponível agora, não a promessa
  // de que o campo vai se recompor devagar durante os 25 segundos.
  campo.nectar = statsComFlorada(campo).nectarMax;
  // Sem artigo antes do nome: os campos têm gêneros diferentes e um aviso curto
  // com "no/na" errado salta aos olhos. Dois-pontos resolve e não envelhece.
  estado.aviso = { texto: `Florada: ${campo.nome}!`, expira: estado.decorrido + 5 };
  mostrarDica(estado, 'florada');
}
