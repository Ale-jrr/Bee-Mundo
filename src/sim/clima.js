import { desvio } from './economia.js';

// Consequências do clima que não são a ninhada.
//
// A temperatura sempre mandou na ninhada, mas CO₂ e umidade só entravam pela
// "saúde do clima", que é o pior dos três medidores e mexe só no tempo da
// cura — na prática, duas barras e dois boosts (Ventilar e Umidificar) que o
// jogador olhava sem nunca ter razão pra usar. Medido numa partida inteira: o
// CO₂ passa de 800 ppm em 17% a 32% do tempo e chega a 2.000, e a umidade fica
// fora da faixa em 51% do tempo. Os dois desviam bastante — o que faltava era
// consequência, e é isso que este módulo dá.
//
// Cada medidor ganha **um** efeito próprio e nomeável, pra barra querer dizer
// alguma coisa específica em vez de somar num número genérico:
//
//   temperatura → ninhada (postura e eclosão)   [em tick.js]
//   co2         → ritmo das abelhas dentro do favo
//   umidade     → com que rapidez a fome chega
export const AR = {
  // Ar abafado atrasa quem trabalha dentro. Trinta e cinco por cento no pior
  // caso: dá pra sentir sem transformar CO₂ alto em morte súbita da colmeia.
  co2NoRitmo: 0.35,
  // Fora da faixa de umidade a abelha se desgasta e come mais cedo. Vinte e
  // cinco por cento encurta as refeições de 45 s para ~34 s no pior caso.
  umidadeNaFome: 0.25,
};

// Multiplicador do ritmo de tudo o que acontece dentro do favo: andar de
// célula em célula e trabalhar o mel.
export function ritmoDoAr(clima) {
  return 1 - AR.co2NoRitmo * desvio('co2', clima.co2);
}

// Quantos segundos a abelha aguenta entre uma refeição e outra, já com o
// desgaste do ar seco (ou úmido demais) descontado.
export function limiteDeFome(clima, base) {
  return base * (1 - AR.umidadeNaFome * desvio('umidade', clima.umidade));
}
