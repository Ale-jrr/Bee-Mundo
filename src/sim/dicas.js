// Dicas de primeira vez. São duas famílias, e a diferença entre elas é o que
// decide se o relógio para:
//
//   evento — florada, encomenda, vespa: o mundo fez algo **agora**, e parar a
//            partida pra explicar o que está acontecendo seria contraditório;
//   ação   — o jogador clicou em algo pela primeira vez e ainda não sabe o que
//            vai acontecer. Essa **pausa** o jogo (`pausa: true`): ele acabou
//            de tomar uma decisão sem conhecer a regra, e merece ler antes de
//            o relógio cobrar por ela.
//
// A dica some depois de aparecer `vezes` vezes — quem já sabe não precisa ver
// de novo, e o contador vai no save justamente pra isso. As de ação aparecem
// uma vez só: uma janela que pausa o jogo não pode virar rotina.
export const DICAS = {
  florada: {
    titulo: 'florada',
    vezes: 2,
    linhas: [
      'Um campo entrou em flor por pouco tempo.',
      'Enquanto dura, ele rende bem mais néctar e',
      'a reserva dele enche na hora.',
      'Vale mandar abelhas para lá — mas confira o',
      'risco do campo antes de mudar a turma.',
    ],
  },
  encomenda: {
    titulo: 'encomenda',
    vezes: 2,
    linhas: [
      'Alguém quer uma variedade específica, com prazo.',
      'Entregar é vender: o mesmo pote conta para a',
      'encomenda e para a meta do ano, e ainda paga um',
      'extra por fora. Perder o prazo não custa nada —',
      'é objetivo a mais, não uma segunda meta.',
    ],
  },
  vespa: {
    titulo: 'vespa',
    vezes: 2,
    linhas: [
      'Uma vespa está rondando e vai levar uma coletora',
      'se ninguém defender a entrada.',
      'Guardiãs saem da colmeia, não do campo: recolha',
      'uma turma com o − para ter abelha livre.',
      'Duas guardiãs espantam a vespa.',
    ],
  },
  inverno: {
    titulo: 'inverno',
    vezes: 2,
    linhas: [
      'No inverno não há coleta: a colônia vive do mel',
      'guardado, e quem estiver fora quando a estação',
      'virar morre de frio.',
      'Recolha as coletoras antes e guarde mel — o',
      'painel da esquerda mostra quanto vai faltar.',
    ],
  },
  primavera: {
    titulo: 'bênção da primavera',
    vezes: 1,
    linhas: [
      'Toda primavera a colmeia escolhe um rumo.',
      'São três cartas de um baralho de quinze, e o',
      'valor de cada uma é sorteado na hora — a mesma',
      'carta pode valer 9% ou 15%.',
      'O jogo fica parado até você escolher.',
    ],
  },
  formigas: {
    titulo: 'formigas',
    vezes: 2,
    linhas: [
      'A vespa ataca as abelhas; a formiga ataca o',
      'vidro — leva mel enquanto a fila estiver aberta.',
      'Vedar a entrada custa moedas e resolve na hora.',
      'O preço de verdade não é a moeda: é não notar',
      'a tempo e descobrir o vidro mais vazio.',
    ],
  },
  tempo: {
    titulo: 'tempo virado',
    vezes: 2,
    linhas: [
      'Chuva e seca duram pouco e atacam lados',
      'diferentes: na chuva as abelhas quase não',
      'colhem; na seca os campos param de se',
      'recompor e o néctar guardado acaba.',
      'Passa sozinho — a questão é o que fazer até lá.',
    ],
  },
  enxame: {
    titulo: 'enxame',
    vezes: 2,
    linhas: [
      'A colônia não cabe mais no favo e metade está',
      'pronta pra ir embora fundar outra colmeia.',
      'Compre células e a pressão passa: ninguém sai.',
      'Ou deixe partir — o enxame é vendido a outro',
      'apiário e vira moedas na hora. É escolha sua.',
    ],
  },

  // ------------------------------------------------- ações do jogador
  // Todas com `pausa: true` e `vezes: 1`.
  acaoNectar: {
    titulo: 'você mandou uma coletora',
    vezes: 1,
    pausa: true,
    linhas: [
      'Ela sai da colmeia, voa até o campo, enche a',
      'bolsa e volta. A viagem leva tempo, e o campo',
      'que rende mais costuma ser o mais longe.',
      'O néctar que ela traz enche uma célula do favo.',
      'Mas néctar ainda não é mel: falta pólen.',
    ],
  },
  acaoPolen: {
    titulo: 'você mandou buscar pólen',
    vezes: 1,
    pausa: true,
    linhas: [
      'O pólen não vira mel: ele é guardado no silo, e',
      'é de lá que uma abelha de dentro pega o que',
      'precisa para fechar uma célula de néctar.',
      'Néctar e pólen dividem as mesmas vagas do campo',
      '— subir um obriga a descer o outro.',
    ],
  },
  acaoColher: {
    titulo: 'você colheu',
    vezes: 1,
    pausa: true,
    linhas: [
      'O mel saiu do favo e foi para o vidro, e a',
      'célula ficou vazia de novo, pronta para receber',
      'néctar.',
      'No vidro o mel ainda não vale nada: só o que é',
      'vendido conta para a meta do ano.',
    ],
  },
  acaoVender: {
    titulo: 'você vendeu',
    vezes: 1,
    pausa: true,
    linhas: [
      'É a venda que conta para a meta do ano, não o',
      'mel guardado.',
      'O preço muda com a estação e com a variedade, e',
      'cada pote vendido empurra o preço daquela',
      'variedade um pouco para baixo — despejar o',
      'vidro inteiro de uma vez custa margem.',
    ],
  },
  acaoCelula: {
    titulo: 'você comprou uma célula',
    vezes: 1,
    pausa: true,
    linhas: [
      'Uma célula a mais é espaço para néctar, mel ou',
      'ninhada — e comprar revela as vizinhas, que é',
      'como o favo cresce.',
      'Também alivia a pressão de enxame: colônia sem',
      'espaço vai embora. Cada célula custa mais que',
      'a anterior.',
    ],
  },
  acaoUpgrade: {
    titulo: 'você melhorou um campo',
    vezes: 1,
    pausa: true,
    linhas: [
      'Melhorias são permanentes, mas valem só para o',
      'campo onde foram compradas.',
      'Cada nível custa bem mais que o anterior, então',
      'concentrar num campo bom costuma render mais',
      'que espalhar por todos.',
    ],
  },
  acaoNinhada: {
    titulo: 'você alimentou a ninhada',
    vezes: 1,
    pausa: true,
    linhas: [
      'Cada pote de mel adianta a eclosão de um ovo, e',
      'o jogo gasta primeiro a variedade mais barata.',
      'É mel que você não vende — mas abelha nova',
      'coleta o resto do ano. Cedo compensa; perto da',
      'virada do ano, quase nunca.',
    ],
  },
  acaoRainha: {
    titulo: 'você coroou uma rainha',
    vezes: 1,
    pausa: true,
    linhas: [
      'A nova rainha não assume na hora: há uma janela',
      'de interregno em que a colônia não põe nenhum',
      'ovo, e ela custa mel que iria para a meta.',
      'Rainha rende cheio nos primeiros anos e vai',
      'caindo depois. Trocar cedo é caro; tarde, pior.',
    ],
  },
  acaoAlugar: {
    titulo: 'você alugou uma abelha',
    vezes: 1,
    pausa: true,
    linhas: [
      'Ela vai trabalhar em outro apiário por um tempo',
      'e volta trazendo moedas.',
      'Enquanto está alugada não coleta nem cura aqui',
      'dentro: é caixa agora em troca de produção',
      'agora. No inverno não dá para alugar.',
    ],
  },
  acaoMisturar: {
    titulo: 'você misturou mel',
    vezes: 1,
    pausa: true,
    linhas: [
      'Um pote de silvestre, um de trevo e um de',
      'acácia viram um pote de florada, que vale mais',
      'que os três somados.',
      'E concentra valor em menos potes, o que importa',
      'porque cada venda derruba o preço da variedade.',
      'O custo é ter as três ao mesmo tempo.',
    ],
  },
  acaoRecolher: {
    titulo: 'você recolheu todas',
    vezes: 1,
    pausa: true,
    linhas: [
      'Todas as turmas voltam de uma vez. Quem está no',
      'ar volta voando, com a carga que já pegou — não',
      'é teletransporte.',
      'É por isso que existe um tempo certo de mandar',
      'recolher antes do inverno, e não em cima dele.',
    ],
  },
  acaoBoost: {
    titulo: 'você usou um boost',
    vezes: 1,
    pausa: true,
    linhas: [
      'O boost mexe no clima da colmeia na hora, em',
      'troca de moedas. Não é permanente: o clima',
      'volta a andar sozinho depois.',
      'Serve para atravessar um pico ruim — clima fora',
      'da faixa atrasa a cura do mel e a eclosão.',
    ],
  },
};

// Abre a dica se ela ainda não bateu o limite de aparições. Devolve se abriu,
// pra quem chama poder decidir o que fazer — hoje ninguém precisa.
export function mostrarDica(estado, id) {
  const regra = DICAS[id];
  if (!regra) return false;
  // O tutorial já explica passo a passo, e ele manda fazer justamente estas
  // ações. Duas explicações por cima da outra é pior que uma.
  if (estado.tutorial) return false;

  estado.dicasVistas = { ...(estado.dicasVistas ?? {}) };
  const vistas = estado.dicasVistas[id] ?? 0;
  if (vistas >= regra.vezes) return false;

  estado.dicasVistas[id] = vistas + 1;
  estado.dica = id;

  if (regra.pausa) {
    // Só guarda a velocidade se ainda não houver uma dica segurando o
    // relógio, senão a segunda gravaria o zero da primeira e o jogo ficaria
    // parado depois de fechar.
    if (estado.velocidadeAntesDaDica == null) estado.velocidadeAntesDaDica = estado.velocidade;
    estado.velocidade = 0;
  }
  return true;
}

export function fecharDica(estado, id = null) {
  if (id && estado.dica !== id) return;
  const pausada = DICAS[estado.dica]?.pausa;
  estado.dica = null;
  if (!pausada) return;

  const antes = estado.velocidadeAntesDaDica;
  estado.velocidadeAntesDaDica = null;
  // Fim de partida e escolha da primavera param o jogo por conta própria:
  // devolver a velocidade aqui destravaria uma colmeia que já acabou.
  if (estado.derrota || estado.vitoria || estado.escolha) return;
  if (typeof antes === 'number') estado.velocidade = antes;
}

export function dicaAtiva(estado) {
  const id = estado?.dica;
  return id && DICAS[id] ? { id, ...DICAS[id] } : null;
}

// Há uma dica segurando o relógio? Quem trata o toque precisa saber: enquanto
// ela está aberta, qualquer toque fecha a dica em vez de mexer no jogo.
export function dicaPausada(estado) {
  return Boolean(DICAS[estado?.dica]?.pausa);
}
