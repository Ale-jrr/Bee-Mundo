// Biomas. Cada um troca três coisas: os campos onde se coleta, o clima das
// estações, e a espécie de abelha que vive ali.
//
// A espécie vem **junto** com o bioma, e não como quarto eixo de escolha.
// Duas razões: é assim na vida real — jandaíra é da caatinga, não do sul — e
// como eixo livre produziria combinações sem sentido que ninguém iria
// balancear.
//
// Este módulo **não importa `economia.js`**, de propósito: economia importa
// biomas (para o fator de meta), e a volta fecharia um ciclo. Quem precisa
// cruzar preço com espécie faz a conta no ponto de uso.
//
// Custo de implementação: o clima é um punhado de deltas aplicados nos cinco
// pontos onde `tick.js` consome a estação, e não uma reescrita do relógio.
// `relogio()` é chamado em dezenas de lugares; mexer nele era o caminho caro.

// Espécies. São multiplicadores aplicados nos mesmos pontos onde talento e
// bênção já multiplicam — o padrão já existia, então acrescentar uma espécie
// não abre nenhum caminho novo no código.
//
// `defende` é a única que não é número: abelha sem ferrão não para vespa na
// porta. É a diferença mais dura entre criar Apis e criar meliponíneo, e é
// justamente o que dá caráter aos biomas onde elas moram.
//
// `coleta × preco` fica perto de 1 em todas de propósito: a espécie tem que
// mudar **como** se joga, não **quanto** se produz. Na primeira versão a
// jandaira tinha preço 2,4 contra coleta 0,62 e o produto dava 1,49 — medido,
// o bioma dela saiu com folga 2,75 contra 1,30 da mata. Não era uma troca,
// era um upgrade com um inconveniente.
export const ESPECIES = {
  africanizada: {
    nome: 'Africanizada',
    resumo: 'Apis mellifera · a abelha do apiário brasileiro',
    coleta: 1, producao: 1, risco: 1, apetite: 1, preco: 1, defende: true,
  },
  carnica: {
    nome: 'Carníola',
    resumo: 'Apis mellifera carnica · aguenta frio, colônia grande',
    coleta: 1.1, producao: 1, risco: 0.9, apetite: 1.15, preco: 0.95, defende: true,
  },
  jandaira: {
    nome: 'Jandaíra',
    resumo: 'Melipona subnitida · sem ferrão, mel raro e caro',
    coleta: 0.62, producao: 1.15, risco: 1, apetite: 0.7, preco: 1.6, defende: false,
  },
  mandacaia: {
    nome: 'Mandaçaia',
    resumo: 'Melipona quadrifasciata · sem ferrão, dócil e regular',
    coleta: 0.78, producao: 1.1, risco: 0.95, apetite: 0.8, preco: 1.35, defende: false,
  },
};

export const ESPECIE_PADRAO = 'africanizada';

// `clima` são deltas e multiplicadores sobre a estação, não valores absolutos:
// assim uma mudança na tabela de estações continua valendo para todo bioma.
//
// `meta` é o fator sobre a tabela base (ver `META.porAno`), e é **medido**,
// não escolhido: a primeira versão foi chutada e saiu quase invertida —
// caatinga e cerrado ficaram fáceis (folga 1,87 e 1,80 contra 1,30 da mata) e
// o sul, impossível (0,84). Os valores atuais igualam os quatro em ~1,30 de
// folga no Ano 1.
//
// Ressalva: fechados com **uma semente e só o Ano 1**. O inverno do sul e a
// rebrota lenta da caatinga mordem mais tarde, então valem remedir.
export const BIOMAS = {
  mata: {
    nome: 'Mata Atlântica',
    resumo: 'O apiário clássico',
    especie: 'africanizada',
    meta: 1,
    clima: { temperatura: 0, rebrota: 1, produtividade: 1, risco: 0 },
    campos: [
      {
        id: 'campainhas', nome: 'Bosque das Campainhas', variedade: 'silvestre',
        taxa: 17.6, viagem: 5.2, nectarMax: 40, risco: 0, slots: 4, nivelMin: 1,
        // Uma coletora só: com 2 operárias, a outra fica em casa — visível,
        // aquecendo o favo e cuidando do mel. O pólen inicial do silo cobre
        // os primeiros potes até o jogador descobrir a turma de pólen.
        alocadasInicial: 1, polenInicial: 0,
        sobre: { bom: 'Seguro e simples, pertinho de casa.', ruim: 'Um ritmo tranquilo.' },
      },
      {
        id: 'treval', nome: 'Treval do Moinho', variedade: 'trevo',
        taxa: 29.0, viagem: 9, nectarMax: 75, risco: 0.06, slots: 5, nivelMin: 3,
        alocadasInicial: 0, polenInicial: 0,
        sobre: { bom: 'Quase o dobro de néctar, e mel mais caro.', ruim: 'Longe — e nem toda abelha volta.' },
      },
      // Quebra o padrão dos outros três, que são a mesma ideia em três
      // intensidades (mais longe = mais rico = mais perigoso). O Urzal é perto,
      // seguro e o mais rápido do jogo — e esgota.
      {
        id: 'urzal', nome: 'Urzal da Neblina', variedade: 'acacia',
        taxa: 52.0, viagem: 6, nectarMax: 55, risco: 0, slots: 3, nivelMin: 5,
        rebrota: 0.25,
        alocadasInicial: 0, polenInicial: 0,
        sobre: { bom: 'Pertinho, seguro e o mais rápido de todos.', ruim: 'Seca depressa e demora a voltar.' },
      },
      {
        id: 'acacias', nome: 'Vale das Acácias', variedade: 'acacia',
        taxa: 45.0, viagem: 13, nectarMax: 120, risco: 0.16, slots: 6, nivelMin: 7,
        alocadasInicial: 0, polenInicial: 0,
        sobre: { bom: 'A acácia é o mel mais caro da bolsa.', ruim: 'Viagem longa e francamente perigosa.' },
      },
    ],
  },

  // Quente o ano todo e com pouca água: a reserva do campo é pequena e demora
  // a voltar. Coletar rápido importa mais que coletar muito, e o inverno quase
  // não existe — o aperto vem da seca, não do frio.
  caatinga: {
    nome: 'Caatinga',
    resumo: 'Quente e seca · floradas curtas',
    especie: 'jandaira',
    meta: 1.15,
    clima: { temperatura: +7, rebrota: 0.5, produtividade: 1.05, risco: +0.03 },
    campos: [
      {
        id: 'umbuzeiro', nome: 'Umbuzeiro do Sertão', variedade: 'silvestre',
        taxa: 22, viagem: 4.5, nectarMax: 28, risco: 0, slots: 4, nivelMin: 1,
        alocadasInicial: 1, polenInicial: 0,
        sobre: { bom: 'Logo ali, e rende rápido.', ruim: 'A reserva é pequena e acaba à toa.' },
      },
      {
        id: 'juazeiro', nome: 'Juazeiro da Estrada', variedade: 'trevo',
        taxa: 34, viagem: 7, nectarMax: 50, risco: 0.05, slots: 4, nivelMin: 3,
        alocadasInicial: 0, polenInicial: 0,
        sobre: { bom: 'Floresce mesmo na seca.', ruim: 'Poucas vagas para muita abelha.' },
      },
      {
        id: 'angico', nome: 'Angico da Serra', variedade: 'acacia',
        taxa: 60, viagem: 6.5, nectarMax: 40, risco: 0.02, slots: 3, nivelMin: 5,
        rebrota: 0.35,
        alocadasInicial: 0, polenInicial: 0,
        sobre: { bom: 'O campo mais rápido do sertão.', ruim: 'Esgota num piscar e demora a voltar.' },
      },
      {
        id: 'mandacaru', nome: 'Mandacaru Florido', variedade: 'acacia',
        taxa: 48, viagem: 11, nectarMax: 90, risco: 0.20, slots: 6, nivelMin: 7,
        alocadasInicial: 0, polenInicial: 0,
        sobre: { bom: 'Floradas enormes quando vem chuva.', ruim: 'Longe, e o caminho não perdoa.' },
      },
    ],
  },

  // Duas estações em vez de quatro: chove ou não chove. Campos grandes e
  // longe, que é o que o cerrado é — e a rebrota no meio do caminho entre a
  // mata e a caatinga.
  cerrado: {
    nome: 'Cerrado',
    resumo: 'Campos vastos · rebrota lenta',
    especie: 'mandacaia',
    meta: 1.25,
    clima: { temperatura: +3, rebrota: 0.75, produtividade: 1, risco: +0.02 },
    campos: [
      {
        id: 'pequizeiro', nome: 'Pequizeiro do Chapadão', variedade: 'silvestre',
        taxa: 19, viagem: 6, nectarMax: 55, risco: 0, slots: 4, nivelMin: 1,
        alocadasInicial: 1, polenInicial: 0,
        sobre: { bom: 'Reserva boa para um campo de início.', ruim: 'Um pouco mais longe que o costume.' },
      },
      {
        id: 'barbatimao', nome: 'Barbatimão', variedade: 'trevo',
        taxa: 31, viagem: 10, nectarMax: 95, risco: 0.08, slots: 5, nivelMin: 3,
        alocadasInicial: 0, polenInicial: 0,
        sobre: { bom: 'Muito néctar guardado de uma vez.', ruim: 'A viagem come o ganho.' },
      },
      {
        id: 'ipe', nome: 'Ipê Amarelo', variedade: 'acacia',
        taxa: 58, viagem: 8, nectarMax: 60, risco: 0.04, slots: 3, nivelMin: 5,
        rebrota: 0.4,
        alocadasInicial: 0, polenInicial: 0,
        sobre: { bom: 'Quando floresce, floresce tudo de uma vez.', ruim: 'E depois some por um bom tempo.' },
      },
      {
        id: 'buriti', nome: 'Vereda dos Buritis', variedade: 'acacia',
        taxa: 42, viagem: 15, nectarMax: 140, risco: 0.14, slots: 6, nivelMin: 7,
        alocadasInicial: 0, polenInicial: 0,
        sobre: { bom: 'A maior reserva de todo o cerrado.', ruim: 'A viagem mais longa do jogo.' },
      },
    ],
  },

  // Verão farto e inverno de verdade. A colônia rende mais que em qualquer
  // outro bioma enquanto há flor — e passa um quarto do ano sem poder sair.
  sul: {
    nome: 'Campos do Sul',
    resumo: 'Verão farto · inverno severo',
    especie: 'carnica',
    meta: 0.7,
    clima: { temperatura: -7, rebrota: 1.15, produtividade: 1.12, risco: -0.02 },
    campos: [
      {
        id: 'bracatinga', nome: 'Bracatingal', variedade: 'silvestre',
        taxa: 20, viagem: 5, nectarMax: 48, risco: 0, slots: 4, nivelMin: 1,
        alocadasInicial: 1, polenInicial: 0,
        sobre: { bom: 'Perto, farto e sem risco.', ruim: 'Só dá no tempo certo.' },
      },
      {
        id: 'trevoBranco', nome: 'Campo de Trevo-Branco', variedade: 'trevo',
        taxa: 33, viagem: 8, nectarMax: 90, risco: 0.05, slots: 5, nivelMin: 3,
        alocadasInicial: 0, polenInicial: 0,
        sobre: { bom: 'Reserva grande e caminho curto.', ruim: 'Some no primeiro frio.' },
      },
      {
        id: 'eucaliptal', nome: 'Eucaliptal', variedade: 'acacia',
        taxa: 55, viagem: 7, nectarMax: 70, risco: 0.03, slots: 4, nivelMin: 5,
        alocadasInicial: 0, polenInicial: 0,
        sobre: { bom: 'Rápido, perto e com vaga sobrando.', ruim: 'Mel de eucalipto não é o mais fino.' },
      },
      {
        id: 'araucaria', nome: 'Mata de Araucária', variedade: 'acacia',
        taxa: 47, viagem: 14, nectarMax: 135, risco: 0.18, slots: 6, nivelMin: 7,
        alocadasInicial: 0, polenInicial: 0,
        sobre: { bom: 'O campo mais rico do sul.', ruim: 'Frio, longe e perigoso.' },
      },
    ],
  },
};

export const BIOMA_PADRAO = 'mata';

function bioma(estado) {
  return BIOMAS[estado?.bioma ?? BIOMA_PADRAO] ?? BIOMAS[BIOMA_PADRAO];
}

export function camposDoBioma(chave) {
  return (BIOMAS[chave] ?? BIOMAS[BIOMA_PADRAO]).campos;
}

export function nomeDoBioma(estado) {
  return bioma(estado).nome;
}

export function fatorDoBioma(estado, chave) {
  return bioma(estado).clima?.[chave] ?? 1;
}

// Deltas somam em vez de multiplicar: temperatura e risco são medidos em
// graus e em pontos percentuais, não em fatores.
export function deltaDoBioma(estado, chave) {
  return bioma(estado).clima?.[chave] ?? 0;
}

export function metaDoBioma(estado) {
  return bioma(estado).meta ?? 1;
}

// ------------------------------------------------------------- espécie

export function especieDoEstado(estado) {
  const id = estado?.especie ?? bioma(estado).especie ?? ESPECIE_PADRAO;
  return ESPECIES[id] ?? ESPECIES[ESPECIE_PADRAO];
}

export function fatorDaEspecie(estado, chave) {
  return especieDoEstado(estado)[chave] ?? 1;
}

// Abelha sem ferrão não para vespa na porta. Consultado por `predadores.js`.
export function especieDefende(estado) {
  return especieDoEstado(estado).defende !== false;
}

export function nomeDaEspecie(estado) {
  return especieDoEstado(estado).nome;
}

