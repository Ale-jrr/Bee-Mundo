// Medidas da tela num lugar só. Antes cada painel carregava seus próprios
// offsets em pixel (`L - 470`, `L/2 - 160`), o que funcionava em 1280 e se
// sobrepunha em qualquer coisa mais estreita. Como o alvo é celular, tudo aqui
// deriva de largura e altura.

const LARGURA_BASE = 1280;
const ALTURA_BASE = 720;

export function medidas(L, A) {
  // A escala segue a menor das duas dimensões relativas, com piso: abaixo dele
  // o texto ficaria ilegível e é melhor reorganizar o layout do que encolher.
  const esc = Math.max(0.62, Math.min(1, Math.min(L / LARGURA_BASE, A / ALTURA_BASE)));
  // 720 separa celular e tablet-retrato (empilhado) de tablet-paisagem e
  // desktop (duas colunas). Acima disso as duas colunas cabem sem apertar.
  const compacto = L < 720;
  const estreito = L < 560;

  return {
    L, A, esc, compacto, estreito,
    margem: Math.round((compacto ? 10 : 22) * esc),
    // Alvo mínimo de toque. A barra e as pílulas de clima nunca ficam abaixo
    // disso, mesmo quando a escala pediria menos: no celular o dedo é o
    // limite, não a proporção.
    toque: 44,
    barra: Math.max(44, Math.round((compacto ? 46 : 56) * esc)),
    raio: Math.round(20 * esc),
    // Botões de ação do canto inferior direito.
    acao: Math.round(Math.max(58, Math.min(96, L * 0.085))),
    // Fonte base dos rótulos em caixa alta.
    rotulo: Math.max(9, Math.round(12 * esc)),
    numero: Math.max(13, Math.round(22 * esc)),
  };
}

// Onde fica o vidro de mel. Mora aqui porque duas coisas precisam dele: o HUD,
// que o desenha, e a cena, que manda a abelha voar até ele pra comer.
export function areaDoPote(m) {
  const l = Math.round((m.compacto ? 88 : 130) * m.esc);
  const a = Math.round(l * 1.15);
  return { x: m.margem + 6 * m.esc, y: m.A - a - m.margem - 10 * m.esc, l, a };
}

// Divide uma faixa horizontal em n colunas com espaçamento, respeitando um
// mínimo — devolve null quando não cabe, para o chamador poder omitir o bloco.
export function colunas(largura, n, espaco, minimo) {
  const item = (largura - espaco * (n - 1)) / n;
  return item >= minimo ? item : null;
}
