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
    // Botões de ação do canto inferior direito. Encolheram quando o sino virou
    // o quarto botão: quatro no tamanho antigo tomavam a largura toda no
    // celular. O piso de 50 continua acima do alvo mínimo de toque (44).
    acao: Math.round(Math.max(50, Math.min(78, L * 0.072))),
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

// Larguras das pílulas da barra superior. Ficam aqui, e não dentro do desenho,
// porque a altura da barra depende delas: quando as pontas não deixam sobra, o
// calendário desce para uma linha própria e empurra tudo o que vem abaixo.
export function barraSuperior(m) {
  const { L, esc, margem, compacto } = m;
  const interno = Math.round(8 * esc);
  const altura = m.barra - interno * 2;

  const esquerda = margem + interno
    + Math.round((compacto ? 104 : 148) * esc) + Math.round(10 * esc)
    + Math.round((compacto ? 108 : 168) * esc);

  const lNivel = compacto ? altura : Math.round(200 * esc);
  const lVelocCheio = Math.round(100 * esc);
  const unico = compacto || lVelocCheio / 2 < 40;
  const lVeloc = unico ? Math.max(46, altura) : lVelocCheio;
  const direita = L - margem - interno
    - Math.max(40, Math.round(46 * esc)) - Math.round(6 * esc)
    - lNivel - Math.round(8 * esc)
    - lVeloc - Math.round(10 * esc);

  const sobra = direita - esquerda - Math.round(20 * esc);
  const separado = sobra < 260;
  return {
    interno, altura, esquerda, direita, lNivel, unico, lVeloc, sobra, separado,
    // O quanto a linha extra do calendário empurra o resto da tela para baixo.
    extra: separado ? 50 : 0,
  };
}

// Onde fica o bloco de clima. Mora aqui pelo mesmo motivo do vidro de mel:
// dois desenhos precisam dele — o HUD, que o desenha, e o painel de inverno,
// que se encaixa logo abaixo sem repetir a conta.
export function areaDoClima(m) {
  const { esc, margem, L } = m;
  // Deriva a folga do calendário em vez de ler um campo que o HUD grava no meio
  // do desenho: quem desenha depois do HUD criava outro objeto de medidas, sem
  // esse campo, e caía 50 px por cima do clima.
  const { extra } = barraSuperior(m);
  if (m.compacto) {
    return {
      x: margem,
      y: margem + m.barra + 8 * esc + extra,
      l: L - margem * 2,
      a: Math.max(m.toque * 0.78, Math.round(30 * esc)),
    };
  }
  return {
    x: margem + 10 * esc,
    y: margem + m.barra + 22 * esc + extra,
    l: Math.min(Math.round(350 * esc), L * 0.42),
    a: Math.round(148 * esc),
  };
}

// Divide uma faixa horizontal em n colunas com espaçamento, respeitando um
// mínimo — devolve null quando não cabe, para o chamador poder omitir o bloco.
export function colunas(largura, n, espaco, minimo) {
  const item = (largura - espaco * (n - 1)) / n;
  return item >= minimo ? item : null;
}
