import { reservaInverno } from './alimento.js';
import { relogio, fatorDeColeta } from './estacoes.js';
import { ABELHA, SILO } from './economia.js';
import { statsComFlorada } from './floradas.js';
import { descontoBencao } from './bencaos.js';

// Quantos segundos antes do inverno o painel de preparação aparece. Vinte e
// cinco cobre a viagem mais longa do jogo (Vale das Acácias, 30 s de ida e
// volta cheia) com folga curta — o aviso chega quando ainda dá pra decidir,
// não quando já não dá.
export const AVISO_INVERNO = 25;

const FORA = ['indo', 'coletando', 'voltando'];

// Retrato do que o inverno vai cobrar, para o jogador poder se preparar em vez
// de descobrir com a colônia lenta de fome. Devolve `null` fora da janela —
// quem desenha não precisa saber quando é a hora.
export function previsaoInverno(estado) {
  const t = relogio(estado.decorrido);
  const inverno = t.estacao.id === 'inverno';
  const fimDoOutono = t.estacao.id === 'outono' && t.restamSegundos <= AVISO_INVERNO;
  if (!inverno && !fimDoOutono) return null;

  const { total, necessario } = reservaInverno(estado);
  const fora = estado.abelhas.filter((a) => FORA.includes(a.estado));
  // A pior das abelhas manda: a colheita só está recolhida quando a última
  // chega. Média esconderia justamente a que não vai dar tempo.
  const voltaEm = fora.reduce((pior, a) => Math.max(pior, segundosParaVoltar(estado, a, t)), 0);

  return {
    inverno,
    restam: t.restamSegundos,
    total,
    necessario,
    falta: Math.max(0, necessario - total),
    fora: fora.length,
    voltaEm: Math.ceil(voltaEm),
    // No inverno já não há o que recolher: as coletoras não saem mais.
    aTempo: inverno || voltaEm <= t.restamSegundos,
  };
}

// Quanto falta para esta abelha estar em casa, contando o que resta da etapa
// atual mais as seguintes. É estimativa: a coleta depende do néctar que ainda
// há no campo, e o risco de voo pode simplesmente comê-la no caminho.
function segundosParaVoltar(estado, abelha, t) {
  const campo = estado.campos.find((c) => c.id === abelha.campo);
  if (!campo) return 0;
  const stats = statsComFlorada(campo);
  const viagem = Math.max(0.5, stats.viagem * descontoBencao(estado, 'viagem'));
  if (abelha.estado === 'voltando') return (1 - abelha.t) * viagem;

  const taxa = abelha.recurso === 'polen' ? stats.taxa * SILO.fatorPolen : stats.taxa;
  const porSegundo = (taxa / 60) * fatorDeColeta(t.estacao);
  const coleta = porSegundo > 0 ? Math.max(0, ABELHA.cargaBase - abelha.carga) / porSegundo : 0;

  if (abelha.estado === 'coletando') return coleta + viagem;
  return (1 - abelha.t) * viagem + coleta + viagem;               // ainda indo
}
