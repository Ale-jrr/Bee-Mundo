import { celulasArray } from '../core/estado.js';
import { totalNoPote } from './acoes.js';

// Tutorial guiado. Não é um texto que o jogador fecha e esquece: cada passo
// pede **uma** coisa e só avança quando ela é feita. Quem chega sem saber
// aprende fazendo, na própria colmeia, e no fim continua jogando a mesma
// partida — não há "modo tutorial" separado para depois recomeçar do zero.
//
// Dois tipos de passo:
//   leitura → explica e espera o toque em "entendi"
//   acao    → pede algo e espera acontecer; `concluido` é quem decide
//
// `marca` guarda um valor tirado no começo do passo (o mel no vidro, por
// exemplo) para o passo saber comparar com o depois.

export const PASSOS = [
  {
    id: 'boasvindas',
    tipo: 'leitura',
    titulo: 'sua colmeia',
    linhas: [
      'Cada hexágono é uma célula do favo, e a do meio',
      'é da rainha. As abelhas trazem néctar do campo e',
      'transformam em mel aqui dentro.',
    ],
  },
  {
    id: 'abrirCampos',
    tipo: 'acao',
    titulo: 'os campos',
    linhas: [
      'É lá fora que o néctar está.',
      'Toque no botão CAMPOS, no canto de baixo.',
    ],
    concluido: (estado, ui) => ui.painel === 'campos',
  },
  {
    id: 'mandarColetora',
    tipo: 'acao',
    titulo: 'mande uma coletora',
    linhas: [
      'No Bosque das Campainhas, toque no + da linha',
      'NÉCTAR. Cada abelha que você põe ali sai da',
      'colmeia e vai buscar.',
    ],
    concluido: (estado) => (estado.campos.find((c) => c.id === 'campainhas')?.alocadas ?? 0) >= 1,
  },
  {
    id: 'esperarNectar',
    tipo: 'acao',
    titulo: 'a viagem',
    linhas: [
      'Feche o painel e olhe o favo: ela voa até o campo',
      'e volta. O néctar vai enchendo uma célula.',
    ],
    concluido: (estado) => celulasArray(estado).some((c) => c.estado === 'nectar' && c.nectar > 0),
  },
  {
    id: 'polen',
    tipo: 'leitura',
    titulo: 'néctar não é mel',
    linhas: [
      'Falta pólen. Aquele hexágono com um número é o',
      'silo, e é de lá que uma abelha de dentro pega o',
      'pólen e fecha a célula, virando mel.',
      'Quando o silo esvaziar, mande alguém buscar mais.',
    ],
  },
  {
    id: 'esperarMel',
    tipo: 'acao',
    titulo: 'espere o mel',
    linhas: [
      'A célula muda de cor e ganha um anel piscando',
      'quando o mel está pronto.',
    ],
    concluido: (estado) => celulasArray(estado).some((c) => c.estado === 'madura'),
    alerta: (estado) => (ninguemDentro(estado) ? [
      'Todas as suas abelhas estão no campo, e não sobrou',
      'ninguém dentro pra fechar a célula. Volte nos campos',
      'e tire uma do NÉCTAR.',
    ] : null),
  },
  {
    id: 'colher',
    tipo: 'acao',
    titulo: 'colha',
    linhas: [
      'Toque na célula pronta. O mel vai para o vidro,',
      'no canto de baixo à esquerda.',
    ],
    marcar: (estado) => totalNoPote(estado),
    concluido: (estado, ui, marca) => totalNoPote(estado) > marca,
  },
  {
    id: 'vender',
    tipo: 'acao',
    titulo: 'venda',
    linhas: [
      'Mel no vidro não conta: só vale o que é vendido.',
      'Abra o MERCADO, no canto de baixo, e venda.',
    ],
    concluido: (estado) => estado.vendidoNoAno > 0,
  },
  {
    id: 'meta',
    tipo: 'leitura',
    titulo: 'a meta do ano',
    linhas: [
      'Lá em cima, ao lado das moedas, está quanto você',
      'já vendeu e quanto precisa vender este ano.',
      'Não bateu a meta na virada, a colmeia acabou.',
    ],
  },
  {
    id: 'inverno',
    tipo: 'leitura',
    titulo: 'o inverno',
    linhas: [
      'No inverno não há coleta: a colônia vive do mel',
      'guardado, e quem estiver no campo quando a',
      'estação virar morre de frio.',
      'Recolha as coletoras antes — o jogo avisa.',
    ],
  },
  {
    id: 'sino',
    tipo: 'leitura',
    titulo: 'o sino',
    linhas: [
      'Florada, encomenda, vespa, formiga e enxame',
      'aparecem em AVISOS, no canto de baixo. O sino',
      'pisca quando tem algo novo esperando você.',
    ],
  },
  {
    id: 'fim',
    tipo: 'leitura',
    titulo: 'é sua',
    linhas: [
      'O resto você descobre jogando: o jogo explica',
      'cada mecânica na primeira vez que ela aparece.',
      'Sobreviva a nove anos. Boa colmeia.',
    ],
  },
];

// Todas as operárias reservadas pra campo = ninguém dentro pra virar o néctar
// em mel. É escolha legítima do jogador (ver `alocar`), mas quem está no
// tutorial fez isso sem saber: o passo fica parado e a tela não explica nada.
function ninguemDentro(estado) {
  const operarias = estado.abelhas.filter(
    (a) => a.papel === 'operaria' && a.estado !== 'alugada' && !a.guarda,
  ).length;
  const reservadas = estado.campos.reduce((n, c) => n + c.alocadas + c.polenAlocadas, 0);
  return operarias > 0 && reservadas >= operarias;
}

export function tutorialAtivo(estado) {
  const t = estado?.tutorial;
  if (!t) return null;
  const passo = PASSOS[t.passo];
  if (!passo) return null;
  return { ...passo, indice: t.passo, total: PASSOS.length, marca: t.marca };
}

export function comecarTutorial(estado) {
  estado.tutorial = { passo: 0, marca: null };
  aplicarMarca(estado);
  // O tutorial pede que o jogador mande a primeira coletora; se ela já
  // estivesse escalada, o passo estaria cumprido antes de ser lido.
  for (const campo of estado.campos) {
    campo.alocadas = 0;
    campo.polenAlocadas = 0;
  }
  return estado.tutorial;
}

export function pularTutorial(estado) {
  estado.tutorial = null;
}

function aplicarMarca(estado) {
  const passo = PASSOS[estado.tutorial?.passo];
  estado.tutorial.marca = passo?.marcar ? passo.marcar(estado) : null;
}

function proximo(estado) {
  estado.tutorial.passo += 1;
  if (estado.tutorial.passo >= PASSOS.length) {
    estado.tutorial = null;
    return;
  }
  aplicarMarca(estado);
}

// Toque no "entendi" de um passo de leitura.
export function confirmarPasso(estado) {
  const passo = tutorialAtivo(estado);
  if (!passo || passo.tipo !== 'leitura') return false;
  proximo(estado);
  return true;
}

// Chamado por quadro, de fora da simulação: precisa da `ui` para saber se um
// painel está aberto, e `sim/` não conhece a interface.
export function avancarTutorial(estado, ui) {
  const passo = tutorialAtivo(estado);
  if (!passo || passo.tipo !== 'acao') return false;
  if (!passo.concluido(estado, ui, passo.marca)) return false;
  proximo(estado);
  return true;
}
