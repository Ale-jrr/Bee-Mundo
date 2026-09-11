// Ciclo de estações. Os modificadores são DISCRETOS: mudam de golpe na virada.
// Só a paleta transiciona de forma contínua (ver render/paleta.js).

// Duração da estação: 3 min e meio. Passou por 60 e 90 antes disto. A cada
// aumento a mesma coisa melhora — a decisão ganha tempo de mostrar
// consequência dentro da própria estação, em vez de o efeito só aparecer
// depois da virada.
//
// Com 210 o ano tem 14 minutos e os nove anos, pouco mais de duas horas. É
// uma partida longa de propósito: quem quiser encurtar mexe em
// `META.anoFinal`, não aqui — encurtar a estação é o que apertava tudo.
//
// Quase tudo deriva daqui (fome de inverno, prazo de encomenda, idade da
// rainha), então mexer neste número remexe o balanço inteiro — ver
// docs/BALANCE.md para a medição de antes e depois.
export const SEGUNDOS_POR_ESTACAO = 210;
export const SEGUNDOS_POR_ANO = SEGUNDOS_POR_ESTACAO * 4;

// `produtividade` é o rendimento da estação de ponta a ponta. A primavera é o
// auge da florada e o inverno rende **30% menos que ela** — a razão entre as
// duas é o que importa (0,84 / 1,20 = 0,70), não o valor absoluto. A escala
// ficou acima de 1 porque consolidar o antigo bônus de coleta da primavera
// dentro deste número tirava 25% da produção do ano.
//
// Ela vale para as duas etapas — coletar no campo e trabalhar o mel dentro do
// favo — porque, quando só a coleta era sazonal, o favo estocava néctar nas
// estações boas e a abelha de casa ia processando a fila no inverno, achatando
// as quatro estações. Cada etapa recebe a *raiz* do valor, de modo que o
// produto das duas dê exatamente o número desta tabela. Aplicando o valor cheio
// nas duas, o inverno caía para 54% em vez de 70%.
export const ESTACOES = [
  {
    id: 'primavera', nome: 'Primavera',
    produtividade: 1.20, risco: +0.05, rebrota: 0.70, preco: -0.10,
    // 18°C fazia da primavera um segundo inverno para a ninhada: a colmeia
    // inicial não aquecia o favo até a faixa de eclosão, e quem mandava as
    // coletoras pro campo esfriava ainda mais — coletar impedia crescer. Com
    // 24 a rainha põe desde o primeiro dia, que é o que uma primavera é numa
    // colmeia de verdade: a estação em que a colônia se monta.
    temperatura: 24, umidade: +8, co2: +0,
  },
  {
    id: 'verao', nome: 'Verão',
    produtividade: 1.08, risco: 0.00, rebrota: 0.45, preco: -0.05,
    temperatura: 32, umidade: -5, co2: +2,
  },
  {
    id: 'outono', nome: 'Outono',
    produtividade: 0.96, risco: +0.18, rebrota: 0.25, preco: +0.05,
    temperatura: 24, umidade: +3, co2: +5,
  },
  {
    id: 'inverno', nome: 'Inverno',
    produtividade: 0.84, risco: +0.35, rebrota: 0.08, preco: +0.25,
    temperatura: 6, umidade: +10, co2: +8,
  },
];

// Tudo derivado de um único número: segundos decorridos desde o início do jogo.
// Isso é o que torna o progresso offline uma fórmula em vez de uma simulação.
// A coleta no campo carrega o efeito cheio da estação: é ela que quase sempre
// é o gargalo, então é dela que sai o número que o jogador sente.
export function fatorDeColeta(estacao) {
  return estacao.produtividade;
}

// O trabalho dentro do favo varia de leve — o suficiente pra o favo não estocar
// néctar numa estação boa e despejar mel numa ruim, mas sem dobrar o efeito da
// coleta. Dividir o efeito igualmente entre as duas etapas (raiz quadrada de
// cada) fazia só metade dele aparecer: o inverno media 82% em vez de 70%.
export function fatorDoFavo(estacao) {
  const PICO = 1.2;
  return 0.7 + 0.3 * (estacao.produtividade / PICO);
}

export function relogio(decorrido) {
  const totalEstacoes = Math.floor(decorrido / SEGUNDOS_POR_ESTACAO);
  const indice = totalEstacoes % 4;
  const progresso = (decorrido % SEGUNDOS_POR_ESTACAO) / SEGUNDOS_POR_ESTACAO;
  return {
    ano: Math.floor(decorrido / SEGUNDOS_POR_ANO) + 1,
    indice,
    proximoIndice: (indice + 1) % 4,
    estacao: ESTACOES[indice],
    proxima: ESTACOES[(indice + 1) % 4],
    progresso,
    progressoAno: (decorrido % SEGUNDOS_POR_ANO) / SEGUNDOS_POR_ANO,
    restamSegundos: SEGUNDOS_POR_ESTACAO - (decorrido % SEGUNDOS_POR_ESTACAO),
  };
}
