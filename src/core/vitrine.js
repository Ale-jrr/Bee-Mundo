import { novoJogo } from './estado.js';
import { serializar, desserializar } from './save.js';
import { passo } from '../sim/tick.js';
import { escolherBencao } from '../sim/bencaos.js';
import { alocar } from '../sim/acoes.js';

// A colmeia que vive atrás da tela de início.
//
// O fundo da tela de abertura sempre foi o favo — mas parado, porque o relógio
// só anda em `tela === 'jogo'`. Atrás de um cartão de vidro, favo parado parece
// foto. Então aqui roda uma partida **descartável**: abelhas andando de célula
// em célula, coletoras saindo para o campo e voltando, de verdade, pelo mesmo
// `passo()` do jogo. E o estado da partida do jogador fica intocado, que é o
// ponto inteiro — o ano dele não pode virar enquanto ele decide se continua.
//
// Três cuidados, os três aprendidos com sondas que travaram antes:
//
//   1. a bênção da primavera zera a velocidade e segura o `passo` — aqui ela é
//      escolhida sozinha, senão a vitrine congela no primeiro ano;
//   2. derrota e vitória também param o `passo` — chegando num dos dois, a
//      colmeia recomeça (ninguém vende mel aqui, então a meta do Ano 1 não é
//      cumprida: acontece depois de uns quinze minutos de tela aberta);
//   3. ela abre com um pedaço de ano já rodado e uma coletora extra no campo,
//      porque colmeia recém-nascida não tem movimento nenhum pra mostrar.

const TICK = 1 / 30;
// Segundos de jogo rodados antes do primeiro quadro, quando a vitrine começa do
// zero. 90 é o bastante pra haver néctar nas células e uma coletora no ar, e
// custa ~110 ms uma vez só.
const AQUECIMENTO = 90;

// `base` é a partida do jogador. Quando existe, a vitrine é **a colmeia dele**,
// copiada e posta pra viver: quem volta vê o próprio apiario respirando atrás do
// vidro, do tamanho em que o deixou, e não uma colmeia genérica. A cópia passa
// pelo serializador do save, que é profundo por construção — referência
// compartilhada aqui faria a vitrine mexer na partida dele.
export function novaVitrine(base = null) {
  const copia = clonar(base);
  if (copia) return copia;

  // Duração longa: a vitrine não tem meta pra cumprir, e o que interessa é que
  // ela não acabe rápido.
  const estado = novoJogo(Date.now() & 0xffffffff, { duracao: 'longa' });
  const campo = estado.campos[0];
  if (campo) alocar(estado, campo.id, 'nectar', 1);
  for (let i = 0; i < Math.round(AQUECIMENTO / TICK); i++) {
    if (!avancar(estado, TICK)) break;
  }
  return estado;
}

function clonar(base) {
  // Partida acabada não anda: `passo` volta na primeira linha, e a vitrine
  // ficaria congelada (ou, pior, se reconstruindo a cada quadro).
  if (!base || base.derrota || base.vitoria) return null;
  try {
    const copia = desserializar(JSON.parse(JSON.stringify(serializar(base))));
    // A escolha da primavera vem junto no save e segura o `passo`. Aqui ela não
    // tem quem escolha — some.
    copia.escolha = null;
    copia.velocidade = 1;
    return copia;
  } catch {
    return null;
  }
}

// Devolve a vitrine a desenhar: a mesma, ou uma nova quando a antiga acabou.
export function avancarVitrine(estado, dt) {
  if (!estado) return novaVitrine();
  if (avancar(estado, dt)) return estado;
  return novaVitrine();
}

function avancar(estado, dt) {
  if (estado.escolha) {
    const oferta = estado.escolha.opcoes?.[0];
    if (oferta) escolherBencao(estado, oferta.id ?? oferta);
    else estado.escolha = null;
  }
  if (estado.derrota || estado.vitoria) return false;
  passo(estado, dt);
  return true;
}
