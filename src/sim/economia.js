// Todas as constantes de balanceamento vivem aqui. Nenhum número mágico
// espalhado pelo resto do código — a curva do jogo se ajusta neste arquivo.
// Ver docs/BALANCE.md para o raciocínio por trás de cada bloco.

export const VARIEDADES = {
  silvestre: { nome: 'Flor Silvestre', cor: '#b8484a', base: 6,  volatilidade: 0.06 },
  acacia:    { nome: 'Acácia',         cor: '#f2e6a8', base: 14, volatilidade: 0.14 },
  trevo:     { nome: 'Trevo',          cor: '#e07b2c', base: 9,  volatilidade: 0.09 },
  // Mel de florada não vem de campo nenhum: é o que sai de misturar as três
  // variedades no vidro. Por isso vale mais que qualquer uma sozinha.
  florada:   { nome: 'Florada',        cor: '#f0b429', base: 34, volatilidade: 0.11 },
};

// Mistura: um pote de cada variedade de campo vira um pote de florada. Vale a
// pena pelo preço (34 contra 6+9+14 = 29) e por concentrar valor em menos
// potes, já que cada venda empurra o preço daquela variedade pra baixo. O
// custo real é ter as três ao mesmo tempo — ou seja, guarnecer os três campos
// em vez de só o melhor deles, que é a decisão que faltava.
export const MISTURA = {
  entrada: ['silvestre', 'trevo', 'acacia'],
  saida: 'florada',
};

export const CLIMA = {
  temperatura: { ideal: [33, 36], min: 0,   max: 45,   nome: 'temperatura' },
  co2:         { ideal: [0, 800], min: 300, max: 2000, nome: 'co2' },
  umidade:     { ideal: [50, 65], min: 0,   max: 100,  nome: 'umidade' },
  // Abelhas termorregulam nos dois sentidos: aquecem tremendo e resfriam
  // ventilando. O que elas têm é autoridade limitada — cada abelha em casa
  // rende alguns graus de correção, até um teto. Fora desse alcance a estação
  // vence, e é aí que os boosts de clima existem para complementar.
  grausPorAbelha: 1.4,
  autoridadeMaxima: 26,
  // Respirar sobe o CO₂; abanar as asas na entrada o derruba. Como as duas
  // coisas escalam com a mesma colônia, um favo bem povoado se mantém perto do
  // limite em vez de asfixiar — mas a ventilação tem teto, então colônia grande
  // demais volta a sufocar. Sem isso o CO₂ subia sem parar e era ele, não a
  // produção, que matava o jogo a partir do Ano 7.
  co2PorAbelha: 22,
  ventilacaoPorAbelha: 16,
  ventilacaoMaxima: 950,
  co2Externo: 400,
  // Velocidade com que o interior persegue o alvo (por segundo).
  inercia: 0.06,
};

export const BOOSTS = {
  arcondicionado: { nome: 'Ar-Condicionado da Colmeia', custo: 50,  delta: { temperatura: -6 } },
  aquecer:        { nome: 'Aquecer a Colmeia',          custo: 50,  delta: { temperatura: +6 } },
  umidificar:     { nome: 'Aumentar Umidade',            custo: 50,  delta: { umidade: +12 } },
  ventilar:       { nome: 'Ventilar a Colmeia',          custo: 60,  delta: { co2: -220 } },
  turbinar:       { nome: 'Turbinar Abelhas!',           custo: 100, delta: {}, duracao: 30, multiplicador: 2 },
};

// Silo de pólen. Não é uma estrutura única: é um estado de célula, igual a
// néctar ou ninhada. Qualquer hexágono do favo pode virar silo quando chega
// pólen, e volta a ser célula vazia quando é esvaziado. Como o favo cresce, a
// capacidade de pólen cresce junto — é assim que a mecânica escala.
export const SILO = {
  capacidadePorCelula: 12,
  // Um silo a cada N células abertas, no mínimo um. Sem este teto o pólen come
  // o favo: coletoras demais criam silo atrás de silo e não sobra célula pro
  // néctar. É o teto que faz "quantas abelhas no pólen" ser uma decisão real —
  // pólen em excesso simplesmente se perde.
  celulasPorSilo: 6,
  // Pólen gasto por célula inteira transformada em mel, proporcional ao néctar
  // que havia ali: meia célula custa meio pólen. Assim encher antes de fechar
  // não é premiado nem punido, e uma coletora de pólen sustenta ~3 de néctar.
  polenPorMel: 2,
  // A coleta de pólen acompanha a taxa do próprio campo, em vez de ser um
  // número fixo. Com taxa fixa de 3,4/min ela não acompanhava campos de 14/min
  // e a cura virava o gargalo: uma coletora servia menos de uma de néctar.
  // Com este fator, uma coletora de pólen sustenta cerca de quatro de néctar —
  // que é o "apenas uma basta" do começo virando "uma a cada quatro" na escala.
  fatorPolen: 0.8,
  // Toda coletora de néctar volta com um pouco de pólen no corpo, como abelha
  // de verdade: esta fração do pólen que a carga dela vai consumir na cura.
  // Sem isso a colmeia sem coletora de pólen dedicada parava de fazer mel de
  // vez — medido, o mel morria aos 236 s e não voltava mais, e a partida ficava
  // 67% do tempo com uma célula pronta travada por falta de pólen. Com esta
  // carona nunca para; pôr uma abelha no pólen continua valendo porque leva a
  // produção de 40% para 100%.
  polenDeCarona: 0.4,
};

// Feromônio da rainha: a mensagem química que organiza a colônia. `raio` diz
// até onde ela alcança no favo; `poder` diz quanto rende dentro do alcance.
// Conforme o favo cresce além do raio, a cobertura cai e as operárias perdem
// eficiência — é o custo escondido de expandir.
export const FEROMONIO = {
  raio: 2,
  poder: 0.30,
};

export const CELULA = {
  precoBase: 19,
  precoCrescimento: 1.18,
  // Três viagens enchem uma célula. Como a abelha pode trabalhar o que já
  // houver ali, isso vira decisão: curar cedo dá mel agora, esperar encher
  // dá o triplo pelo mesmo tempo de trabalho.
  capacidadeNectar: 9,
  // Segundos para curar néctar cheio em mel, em clima perfeito.
  segundosCura: 24,
  // Quanto o clima ruim pode desacelerar a cura, no pior caso.
  penalidadeMaxCura: 0.15,
  // Invariante do favo: o pólen precisa sempre ter onde ser guardado. Se
  // nenhum silo tem espaço, o néctar é obrigado a deixar células livres o
  // bastante pra um silo novo nascer. Sem isso o jogo trava de vez — favo cheio
  // de células em cura, pólen zerado, e a cura precisa de pólen pra liberar
  // célula. Uma reserva fixa não serve: no favo inicial ela impede toda a
  // produção.
  reservaSemSilo: 2,
};

export const ABELHA = {
  // Néctar que uma operária carrega antes de voltar pra colmeia.
  // Carga menor = viagem mais curta. Com 5 a coleta sozinha levava 57,7 s e o
  // campo respondia por 90% da espera por um pote de mel.
  cargaBase: 3,
};

// A rainha põe sozinha, mas a eclosão só avança com a temperatura na faixa.
// É o que amarra o crescimento da colônia ao sistema de clima: mais abelhas
// esquentam a colmeia, e colmeia quente para de produzir abelhas.
export const NINHADA = {
  // Com uma ninhada por vez no favo, o ciclo inteiro (pôr + chocar) é o teto
  // do crescimento da colônia. Com 20 s + 50 s ela empacava em 4-6 abelhas.
  segundosPostura: 8,      // intervalo entre posturas da rainha
  // 45 s porque a ninhada traz até três abelhas de uma vez: com 15 s a colônia
  // ia a 129 abelhas no Ano 9, contra as 25-56 que o resto do jogo espera.
  segundosEclosao: 45,     // com temperatura perfeita
  // Cabem até três abelhas na mesma ninhada. A rainha vai somando enquanto o
  // ovo não choca, e todas nascem juntas ao fim.
  porNinhada: 3,
  tempIdeal: [33, 36],
  // Abaixo deste ritmo de eclosão a rainha para de pôr. Sem isso ela enche o
  // favo de ovos que não vingam e a colmeia trava sozinha no inverno.
  ritmoMinimoParaPor: 0.25,
  // Fora da faixa a eclosão desacelera até parar de vez. Com 5 a eclosão zerava
  // a 28 °C, e uma colônia de duas ou três abelhas só passa disso no pico do
  // verão: bastava perder uma operária (vespa ou frio) para a ninhada congelar
  // e a colmeia nunca mais se recompor — medido, 5 de 6 sementes morriam no
  // Ano 2 ou 3 com o favo parado. Com 7 o frio **atrasa** a ninhada em vez de
  // matá-la, e o inverno (favo a 9-15 °C) continua parando tudo, que é a
  // regra que interessa.
  toleranciaGraus: 7,
  // Alimentar a ninhada: cada pote de mel adianta esta fração da eclosão.
  // A 0,1 são dez potes para chocar um ovo do zero — na prática o jogador
  // gasta dois ou três no fim, para não esperar o último pedaço.
  avancoPorMel: 0.1,
  // Encomendar o pendor de um ovo. Não é o único jeito de ter guardiã — o
  // sorteio de nascimento continua igual — é o jeito de **consertar** um
  // sorteio que não deu o que a colmeia precisa. Por isso custa mel, e por
  // isso custa pouco: quem está sem guardiã é quem está perdendo abelha, e
  // portanto quem tem menos mel.
  custoPendor: 3,
};

// Passeio das abelhas dentro do favo. É desenho, mas mora na simulação porque
// a rainha põe ovo na célula onde está — o movimento tem consequência, não é
// só enfeite.
// Medido: com 1,6 s por célula e pausas de até 2,6 s, a abelha passava 58% do
// tempo andando e 26% parada, contra 13% trabalhando — e uma célula levava 14 s
// pra ficar pronta, sendo que a tarefa em si dura 5 s. Aqui ela anda depressa e
// a pausa é só um respiro de quem não tem o que fazer.
export const PASSEIO = {
  // 0,7 s por célula era corrida demais de se ver, 1,0 ainda parecia
  // apressado. Com a estação em 3 min e meio, a caminhada é uma fatia pequena
  // do ciclo e pode ter o ritmo de quem está trabalhando, não de quem está
  // fugindo — dava pra ver o bando deslizando, e não andando.
  segundosPorCelula: 1.8,
  // Pausa de quem está sem tarefa. Curta demais e a abelha fica vibrando de um
  // lado pro outro carregando pólen que não tem onde entregar; é o que dava a
  // impressão de que ela "carrega e não faz o mel".
  pausaMin: 1.5,
  pausaMax: 4,
};

// O trabalho dentro do favo. A célula não cura mais sozinha: uma operária
// busca pólen no silo, leva até uma célula cheia de néctar e trabalha nela.
// Cada visita adianta um pedaço, então o mel passa a depender de quantas
// abelhas ficam em casa — e não só de quantas saem pro campo.
export const TRABALHO = {
  // Pegar o pólen é rápido; fazer o mel é a tarefa visível da colmeia — é a
  // barrinha que corre em cima da abelha. Cinco segundos: com 20 s ou 15 s o
  // primeiro pote saía aos 74 s e o mel vinha aos trancos. Uma visita fecha a
  // célula; não existe cura pela metade.
  segundosPegarPolen: 1,
  segundosCurar: 5,
  polenPorVisita: 1,
  // Quanto pólen ela traz numa ida ao silo. Como o mel é instantâneo, o que
  // sobra de caminhada é a ida ao silo — bolsa maior atende mais células por
  // viagem.
  capacidadePolen: 6,
  // A abelha que trabalha também come. A cada 45 s ela larga a tarefa, vai até
  // uma célula de mel e se alimenta. O mel sai do estoque — então não dá pra
  // vender tudo: a colmeia precisa da própria reserva pra continuar produzindo.
  segundosEntreRefeicoes: 45,
  segundosComendo: 2,
  melPorRefeicao: 0.06,
  // Com fome ela não para: fica 50% mais lenta, no trabalho e no passo. Sem
  // mel no pote a colmeia arrasta, mas não trava.
  penalidadeFome: 0.5,
};

// Polinização paga: a abelha sai da colmeia por um tempo e volta com moedas.
// Compete diretamente com a coleta de néctar pelo mesmo corpo.
export const ALUGUEL = {
  duracao: 90,
  pagamento: 26,
};

// Passeio aleatório com reversão à média. Nunca foge muito da base, mas
// segurar estoque esperando a alta é sempre uma aposta.
export const MERCADO = {
  reversao: 0.35,          // força do puxão de volta à base, por segundo
  ruido: 1.8,              // amplitude do choque aleatório
  minimo: 0.55,
  maximo: 1.45,
};

// Catálogo de campos. O estado instancia a partir daqui, então rebalancear um
// campo não exige tocar no save nem no código do jogo.
// Risco e recompensa andam juntos: o mel mais caro fica no campo mais longe e
// mais perigoso. `florada` fica reservada pra mecânica de troca de variedade.
export const CAMPOS = [
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
  // seguro e o mais rápido do jogo — e esgota. A reserva é pequena e se
  // recompõe a um quarto da velocidade, então ele rende muito por pouco tempo
  // e obriga a mudar a turma de lugar em vez de escalar e esquecer.
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
];

// Chance de perder a abelha numa volta completa = risco × isto.
// Vive aqui pra o risco do campo poder ser lido como porcentagem na UI.
export const VOO = { riscoPorViagem: 0.10 };

// Melhorias de campo. Cada pip é multiplicativo — são elas que precisam vencer
// a meta composta, já que comprar célula e nascer abelha só crescem linear.
export const UPGRADES = {
  sustentavel: { nome: 'Agricultura Sustentável', max: 8, custoBase: 150, crescimento: 1.55, ganho: +0.15 },
  rota:        { nome: 'Rota de Voo',             max: 8, custoBase: 100, crescimento: 1.50, ganho: -0.10 },
  ogm:         { nome: 'OGM',                     max: 8, custoBase: 100, crescimento: 1.65, ganho: +0.15 },
  // Vagas. Os três campos somavam 15 lugares fixos, e a colônia passa de cem
  // abelhas: tudo além de ~18 só servia pra aquecer o favo. Cada posto abre
  // uma vaga, e é caro de propósito — crescer a colônia tem que continuar
  // sendo decisão, não consequência automática de ter dinheiro.
  posto:       { nome: 'Posto Avançado',          max: 4, custoBase: 260, crescimento: 1.85, ganho: +1 },
};

export function custoUpgrade(id, nivel) {
  const u = UPGRADES[id];
  return Math.round(u.custoBase * Math.pow(u.crescimento, nivel));
}

// Valores efetivos do campo: o objeto guarda a base, os upgrades derivam.
// Nada muta o campo, então rebalancear um upgrade não corrompe saves antigos.
export function statsDoCampo(campo) {
  const u = campo.upgrades;
  return {
    taxa: campo.taxa * (1 + UPGRADES.ogm.ganho * u.ogm),
    viagem: campo.viagem * Math.pow(1 + UPGRADES.rota.ganho, u.rota),
    nectarMax: campo.nectarMax * (1 + UPGRADES.sustentavel.ganho * u.sustentavel),
    risco: campo.risco,
  };
}

// Vagas de campo. A base de cada campo e o Posto Avançado são fixos, mas o
// **favo também conta**: a cada `VAGAS.porCelulas` células abertas, todo campo
// liberado ganha uma vaga.
//
// Sem essa parte a produção tinha teto duro de 34 vagas enquanto a colônia
// chegava a 90 operárias — 74 abelhas sem trabalho no campo, produção plana a
// partir do Ano 5, e a meta compondo a 1,78×/ano contra um teto fixo. Existia
// um ano em que uma cruzava a outra, e qual ano não dependia de habilidade
// nenhuma: perder era aritmética, não erro do jogador.
//
// Com o favo contando, comprar célula e criar abelha voltam a pagar em
// produção — que é o que dá finalidade aos anos do meio.
export const VAGAS = { porCelulas: 6 };

// Quantas vagas o tamanho do favo acrescenta a **cada** campo liberado.
// Conta as células aqui em vez de importar `celulasArray` porque
// `core/estado.js` importa este arquivo: a importação de volta fecharia ciclo.
export function vagasDoFavo(estado) {
  if (!estado?.celulas) return 0;
  let abertas = 0;
  for (const c of Object.values(estado.celulas)) if (c.estado !== 'travada') abertas++;
  return Math.floor(abertas / VAGAS.porCelulas);
}

// Vagas efetivas do campo. Fica separado porque a interface e a alocação
// precisam dela sem calcular o resto.
export function vagasDoCampo(campo, estado = null) {
  return campo.slots
    + UPGRADES.posto.ganho * (campo.upgrades?.posto ?? 0)
    + vagasDoFavo(estado);
}

// O nível precisa destravar o Treval (3) por volta do Ano 2 e o Vale (7) por
// volta do Ano 5, senão a meta composta passa na frente e o jogo fecha.
// Calibrado por varredura: com estes valores o Treval abre no Ano 1,3 e o Vale
// das Acácias no Ano 3,3 — cedo o bastante pra o campo bom ainda importar.
// Valores mais altos fazem o nível disparar e os desbloqueios perdem sentido.
export const XP = {
  porColheita: 16,
  porMoedaVendida: 3,
};

export function xpParaNivel(nivel) {
  return Math.round(45 * Math.pow(1.42, nivel - 1));
}

// Celulas que a colonia ganha ao virar o ano. Comprar deixou de ser o unico
// jeito de o favo crescer: o jogador que passou o ano merece espaco novo sem
// pagar por ele, e sem isso a colmeia so cresce na velocidade da carteira.
//
// A oferta nao conta como compra (`celulasCompradas` nao sobe), entao o
// presente nao encarece a proxima celula comprada.
export const PRESENTE_DO_ANO = { min: 2, max: 3 };

export const META = {
  // Sobreviver a este ano vence o jogo.
  anoFinal: 9,

  // Meta de cada ano, em moedas vendidas.
  //
  // É uma **tabela**, e não mais uma progressão geométrica, porque a produção
  // não é geométrica: ela quadruplica do Ano 1 para o 2, dobra até o Ano 4 e
  // depois estabiliza. Uma curva só não acompanha as duas fases — com
  // `valorBase 9` e `crescimento 1,78` a folga medida ia de **34× no Ano 2 a
  // 0,9× no Ano 9**: seis anos sem disputa nenhuma e um muro no fim.
  //
  // Cada número é a produção medida do jogador-robô dividida por ~1,4, depois
  // arredondado e forçado a subir todo ano (meta que cai de um ano para o
  // outro parece defeito, mesmo quando a produção cai). Ver docs/BALANCE.md.
  //
  // **A tabela é fechada pelo jogador razoável, não pelo robô.** Foi fechada
  // pelo robô uma vez e o resultado, medido, foi que quem joga bem mas não
  // ótimo perdia a partir do Ano 2 — folga de 0,44 lá e 0,75 no Ano 7.
  //
  // "Razoável" aqui é medido, não imaginado: colhe tudo, vende tudo, escala a
  // turma no melhor campo liberado, compra célula e melhoria quando sobra
  // caixa, recolhe antes do inverno. Não alimenta a ninhada e não mistura
  // florada — as duas coisas que exigem ter entendido o jogo a fundo, e que
  // juntas respondem por quase toda a distância até o robô.
  //
  // O preço dessa escolha é o especialista folgar: o robô fica com 1,6× a
  // 3,8×. Aceito de propósito — perder é o que faz a pessoa largar o jogo,
  // sobrar margem não é.
  //
  // O Ano 1 é o único em que o robô produz **menos** que o razoável: ele
  // segura mel para alimentar a ninhada em vez de vender. É investimento, e
  // aparece em dobro no Ano 2.
  //
  // Resultado: folga entre 1,3× e 1,5× em **todos** os nove anos. Nenhum ano
  // de graça, e o último é o mais apertado.
  porAno: [480, 1050, 2300, 2900, 3300, 3500, 3650, 3800, 3950],
};

export function metaDoAno(ano) {
  const i = Math.max(1, Math.round(ano)) - 1;
  if (i < META.porAno.length) return META.porAno[i];
  // Além da tabela: segue no ritmo do último degrau. Não acontece no jogo
  // como ele é hoje (a vitória vem no Ano 9), mas um desafio que aumente
  // `anoFinal` não pode cair num `undefined`.
  const [penultima, ultima] = META.porAno.slice(-2);
  const ritmo = ultima / penultima;
  return Math.round(ultima * ritmo ** (i - META.porAno.length + 1));
}

export function precoDaCelula(compradas) {
  return Math.round(CELULA.precoBase * Math.pow(CELULA.precoCrescimento, compradas));
}

// 0 = perfeito, 1 = totalmente fora da faixa. Usado por cura e eclosão.
export function desvio(medidor, valor) {
  const { ideal, min, max } = CLIMA[medidor];
  if (valor >= ideal[0] && valor <= ideal[1]) return 0;
  const fora = valor < ideal[0] ? ideal[0] - valor : valor - ideal[1];
  const alcance = valor < ideal[0] ? ideal[0] - min : max - ideal[1];
  return Math.min(1, fora / Math.max(1, alcance));
}

// Multiplicador de saúde da colmeia: 1.0 em clima perfeito.
export function saudeDoClima(clima) {
  const pior = Math.max(
    desvio('temperatura', clima.temperatura),
    desvio('umidade', clima.umidade),
    desvio('co2', clima.co2),
  );
  return 1 - pior * (1 - CELULA.penalidadeMaxCura);
}
