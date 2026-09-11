import { pilula, rotulo, larguraRotulo, FONTE } from '../render/desenho.js';
import { desenharPaisagem } from '../render/paisagens.js';
import { zona } from './zonas.js';
import { BIOMAS, ESPECIES } from '../sim/biomas.js';

// Cards de bioma. Saíram da grade genérica de chips porque o bioma é a única
// escolha que muda o jogo inteiro — campos, clima e espécie — e um retângulo
// com duas linhas de texto não dava conta de mostrar isso.
//
// Cada card traz a paisagem, o nome com a espécie, e as duas características
// que de fato mudam a partida — nessa ordem, que é a ordem em que o olho pega.
//
// Dois arranjos, escolhidos pela forma do card e não por um modo da tela:
// **deitado** quando sobra largura (a paisagem à esquerda e três linhas de
// texto ao lado) e **em pé** quando o card é estreito (a paisagem em cima, o
// nome embaixo). A paisagem nunca sai — era justamente isso que a versão
// compacta antiga perdia, e ela é metade do motivo do card existir.

const ESPACO = 8;
export const ALTURA_CARD = 84;

export function alturaDosCards(quantos = Object.keys(BIOMAS).length, colunas = 2,
  altura = ALTURA_CARD) {
  return Math.ceil(quantos / colunas) * (altura + ESPACO);
}

// Largura de card a partir da qual a paisagem cabe ao lado do texto. Abaixo
// disso o nome sobrava num fiozinho de 6px, que é pior que empilhar.
export function cardDeitado(cardL, altura) {
  return cardL >= altura * 2.1;
}

export function larguraDoCard(l, colunas) {
  return (l - ESPACO * (colunas - 1)) / colunas;
}

// Temperatura e rebrota em linguagem de jogador, não de planilha: "+7° mais
// quente" diz o que muda; "temperatura: +7" não diz.
function caracteristicas(bioma) {
  const t = bioma.clima?.temperatura ?? 0;
  const r = bioma.clima?.rebrota ?? 1;
  const fora = [];
  if (t > 0) fora.push(`${t}° mais quente`);
  else if (t < 0) fora.push(`${Math.abs(t)}° mais frio`);
  else fora.push('clima ameno');
  if (r < 0.95 || r > 1.05) fora.push(`campo repõe ${Math.round(r * 100)}%`);
  else fora.push('campo repõe normal');
  return fora;
}

export function desenharCardsDeBioma(ctx, pal, x, y, l, escolhido, zonaId, cfg = {}) {
  const colunas = cfg.colunas ?? 2;
  const altura = cfg.altura ?? ALTURA_CARD;
  const ids = Object.keys(BIOMAS);
  const cardL = larguraDoCard(l, colunas);
  const deitado = cardDeitado(cardL, altura);

  ids.forEach((id, i) => {
    const cx = x + (i % colunas) * (cardL + ESPACO);
    const cy = y + Math.floor(i / colunas) * (altura + ESPACO);
    const ativo = id === escolhido;

    pilula(ctx, cx, cy, cardL, altura);
    ctx.fillStyle = ativo ? pal.css('cheia') : pal.css('escuro', 0.08);
    ctx.fill();
    // Um aro claro no escolhido: em tela grande o amarelo do preenchido já não
    // salta sozinho contra o cartão de vidro.
    if (ativo) {
      ctx.strokeStyle = pal.css('tinta', 0.35);
      ctx.lineWidth = Math.max(1, altura * 0.02);
      ctx.stroke();
    }

    const cor = ativo ? pal.css('tinta') : pal.css('suave');
    const fraco = ativo ? pal.css('tinta', 0.75) : pal.css('suave', 0.75);
    desenharCard(ctx, id, BIOMAS[id], !deitado, cx, cy, cardL, altura, cor, fraco);

    zona(zonaId, cx, cy, cardL, altura, { id });
  });

  return alturaDosCards(ids.length, colunas, altura);
}

// Os dois arranjos num lugar só: `vertical` empilha paisagem e nome; deitado
// põe a paisagem à esquerda e três linhas de texto ao lado. Tudo em proporção
// da altura, e não em pixels, para o card encolher inteiro sem nada se
// desencontrar.
function desenharCard(ctx, id, b, vertical, cx, cy, cardL, altura, cor, fraco) {
  const pad = Math.round(altura * (vertical ? 0.08 : 0.12));
  const especie = ESPECIES[b.especie]?.nome ?? '';

  if (vertical) {
    const tam = Math.round(altura * 0.44);
    desenharPaisagem(ctx, id, cx + (cardL - tam) / 2, cy + pad, tam);
    const largura = cardL - pad * 2;
    nome(ctx, b.nome, cx + cardL / 2, cy + altura * 0.68, largura, cor,
      Math.max(7, altura * 0.145), altura * 0.018, 'center');
    miudo(ctx, especie, cx + cardL / 2, cy + altura * 0.87, largura, fraco,
      Math.max(6, Math.round(altura * 0.115)), 'center');
    return;
  }

  const tam = Math.round(altura * 0.62);
  desenharPaisagem(ctx, id, cx + pad, cy + (altura - tam) / 2, tam);
  const tx = cx + pad + tam + Math.round(altura * 0.11);
  const largura = cardL - (tx - cx) - pad;
  nome(ctx, b.nome, tx, cy + altura * 0.26, largura, cor,
    Math.max(7, altura * 0.119), altura * 0.014, 'left');
  miudo(ctx, especie, tx, cy + altura * 0.46, largura, cor,
    Math.max(7, Math.round(altura * 0.107)), 'left');
  // As características menores e mais claras: são o detalhe que se lê depois
  // de já ter reconhecido o bioma pela paisagem.
  caracteristicas(b).forEach((linha, n) => {
    miudo(ctx, linha, tx, cy + altura * (0.65 + n * 0.17), largura, fraco,
      Math.max(6, Math.round(altura * 0.095)), 'left');
  });
}

// Encolhe pra caber: "MATA ATLÂNTICA" em caixa alta não entra no espaço que
// sobra, e `rotulo` corta em silêncio em vez de avisar.
function nome(ctx, s, x, y, largura, cor, tamanho, espaco, alinhar) {
  const largo = larguraRotulo(ctx, s, tamanho, espaco);
  let t = tamanho;
  let e = espaco;
  if (largo > largura && largo > 0) {
    const f = largura / largo;
    t = Math.max(6, tamanho * f);
    e *= f;
  }
  rotulo(ctx, s, x, y, { tamanho: t, cor, espaco: e, alinhar });
}

function miudo(ctx, s, x, y, largura, cor, tamanho, alinhar) {
  if (!s) return;
  ctx.save();
  ctx.font = `600 ${tamanho}px ${FONTE}`;
  ctx.fillStyle = cor;
  ctx.textAlign = alinhar;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y, largura);
  ctx.restore();
}
