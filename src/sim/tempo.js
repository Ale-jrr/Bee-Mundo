import { sortear } from '../core/rng.js';
import { mostrarDica, fecharDica } from './dicas.js';
import { tentarEvento } from './eventos.js';

// Tempo dentro da estação. A estação era o mesmo número do primeiro ao último
// segundo: escolhida a turma na virada, não havia mais nada a decidir até a
// próxima. Chuva e seca são o contrário da florada — janelas curtas que pioram
// alguma coisa e pedem reação.
//
// Cada uma ataca um lado diferente, pra não serem a mesma coisa com nome
// diferente:
//   chuva → as abelhas quase não colhem enquanto dura
//   seca  → os campos param de se recompor, então o néctar acumulado acaba
export const TEMPO = {
  intervaloMin: 260,
  intervaloMax: 420,
  duracao: 18,
  // Fora do inverno, que já é o aperto da estação e não tem coleta nenhuma.
  chuva: { nome: 'chuva', coleta: 0.15, rebrota: 1 },
  seca: { nome: 'seca', coleta: 1, rebrota: 0.08 },
};

const POR_ESTACAO = {
  primavera: ['chuva'],
  verao: ['chuva', 'seca'],
  outono: ['chuva'],
  inverno: [],
};

export function tempoAtivo(estado) {
  const t = estado?.tempo;
  return t && TEMPO[t.tipo] ? { ...TEMPO[t.tipo], tipo: t.tipo, resta: t.resta } : null;
}

export function fatorDaColeta(estado) {
  return tempoAtivo(estado)?.coleta ?? 1;
}

export function fatorDaRebrota(estado) {
  return tempoAtivo(estado)?.rebrota ?? 1;
}

export function atualizarTempo(estado, t, dt) {
  if (estado.proximoTempo == null) {
    estado.proximoTempo = estado.decorrido + TEMPO.intervaloMin;
  }

  if (estado.tempo) {
    estado.tempo.resta -= dt;
    if (estado.tempo.resta <= 0) {
      const nome = TEMPO[estado.tempo.tipo].nome;
      estado.tempo = null;
      fecharDica(estado, 'tempo');
      estado.aviso = { texto: `A ${nome} passou`, expira: estado.decorrido + 4 };
      agendar(estado);
    }
    return;
  }

  if (estado.decorrido < estado.proximoTempo) return;
  const possiveis = POR_ESTACAO[t.estacao.id] ?? [];
  if (!possiveis.length) return;
  // Não começa uma que a virada da estação cortaria pela metade.
  if (t.restamSegundos <= TEMPO.duracao) return;

  if (!tentarEvento(estado, (espera) => { estado.proximoTempo = estado.decorrido + espera; })) {
    return;
  }

  const tipo = possiveis[Math.floor(sortear(estado) * possiveis.length)] ?? possiveis[0];
  estado.tempo = { tipo, resta: TEMPO.duracao };
  estado.aviso = {
    texto: tipo === 'chuva' ? 'Chuva: as abelhas quase não colhem' : 'Seca: os campos não se recompõem',
    expira: estado.decorrido + 5,
  };
  mostrarDica(estado, 'tempo');
}

function agendar(estado) {
  estado.proximoTempo = estado.decorrido + TEMPO.intervaloMin
    + sortear(estado) * (TEMPO.intervaloMax - TEMPO.intervaloMin);
}
