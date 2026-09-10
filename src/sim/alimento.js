import { VARIEDADES, TRABALHO } from './economia.js';
import { relogio, SEGUNDOS_POR_ESTACAO } from './estacoes.js';

// No frio cada refeição custa mais: a reserva sustenta as operárias em casa.
export const MEL_REFEICAO_INVERNO = 0.75;
export function consumirMel(estado, quantidade) {
  let resta = quantidade;
  const baratas = Object.keys(VARIEDADES).sort((a, b) => VARIEDADES[a].base - VARIEDADES[b].base);
  for (const id of baratas) {
    const tirar = Math.min(estado.pote[id] ?? 0, resta);
    estado.pote[id] -= tirar;
    resta -= tirar;
    if (resta <= 1e-9) break;
  }
  return quantidade - resta;
}
export function reservaInverno(estado) {
  const t = relogio(estado.decorrido);
  const inverno = t.estacao.id === 'inverno';
  const tempo = inverno ? t.restamSegundos : SEGUNDOS_POR_ESTACAO;
  // Estimativa conservadora: considera a população atual e uma refeição
  // imediata, além das próximas. Nascimentos podem aumentar a necessidade.
  const operarias = estado.abelhas.filter(a => a.papel === 'operaria');
  const necessario = operarias.reduce((n, a) => n + MEL_REFEICAO_INVERNO *
    (inverno ? Math.floor((Math.min(a.fome, TRABALHO.segundosEntreRefeicoes) + tempo) / TRABALHO.segundosEntreRefeicoes)
      : Math.ceil(tempo / TRABALHO.segundosEntreRefeicoes)), 0);
  const total = Object.values(estado.pote).reduce((n, v) => n + v, 0);
  return { total, necessario: Math.ceil(necessario), inverno };
}
