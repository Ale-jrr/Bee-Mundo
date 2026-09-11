import { pilula, rotulo, larguraRotulo } from '../render/desenho.js';
import { zona } from './zonas.js';
import { DESAFIOS, DESAFIO_PADRAO } from '../sim/desafios.js';
import { desafiosLiberados } from '../core/conquistas.js';

// Grade de opções em pílulas. Nasceu só para os desafios, e virou genérica
// quando a partida ganhou três eixos — duração, dificuldade e desafio. Uma
// cópia por eixo divergiria na primeira vez que alguém acrescentasse um.
//
// Duas telas usam isto (o menu e a tela de início), então `zonaId` deixa cada
// uma ter o próprio identificador de toque.

export const ALTURA_CHIP = 46;
const ESPACO = 8;

export function alturaDosChips(quantos = Object.keys(DESAFIOS).length, colunas = 2, altura = ALTURA_CHIP) {
  return Math.ceil(quantos / colunas) * (altura + ESPACO);
}

// `cfg.travado(id)` decide o que está trancado. O padrão é a regra dos
// desafios: tudo menos o comum fica fechado até a primeira vitória, porque
// eles são o motivo de rejogar.
//
// `cfg.esc` escala o texto junto com a pílula. Enquanto a fonte era fixa em 10,
// crescer o chip só aumentava o vazio em volta da palavra — a tela de início
// ficava maior sem ficar mais legível, que era o pedido.
export function desenharChips(ctx, pal, x, y, l, escolhido, zonaId, cfg = {}) {
  const tabela = cfg.tabela ?? DESAFIOS;
  const colunas = cfg.colunas ?? 2;
  const altura = cfg.altura ?? ALTURA_CHIP;
  const k = cfg.esc ?? 1;
  const liberados = desafiosLiberados();
  const travadoPor = cfg.travado ?? ((id) => id !== DESAFIO_PADRAO && !liberados);

  const ids = Object.keys(tabela);
  const chipL = (l - ESPACO * (colunas - 1)) / colunas;
  // O resumo cabe a partir de 40 de altura — medido na escala do chip, senão
  // chip grande em tela grande deixava de mostrá-lo.
  const comResumo = altura >= 40 * k;

  ids.forEach((id, i) => {
    const cx = x + (i % colunas) * (chipL + ESPACO);
    const cy = y + Math.floor(i / colunas) * (altura + ESPACO);
    const travado = travadoPor(id);
    const ativo = id === escolhido && !travado;

    pilula(ctx, cx, cy, chipL, altura);
    ctx.fillStyle = ativo ? pal.css('cheia') : pal.css('escuro', travado ? 0.04 : 0.08);
    ctx.fill();

    const cor = ativo ? pal.css('tinta') : pal.css('suave', travado ? 0.5 : 1);
    const dentro = chipL - 10 * k;
    texto(ctx, tabela[id].nome, cx + chipL / 2, cy + (comResumo ? altura * 0.37 : altura / 2),
      dentro, { tamanho: Math.max(8, Math.round(10 * k)), cor, espaco: 1.4 * k, alinhar: 'center' });
    if (comResumo) {
      texto(ctx, travado ? 'vença uma vez para abrir' : tabela[id].resumo,
        cx + chipL / 2, cy + altura * 0.7, dentro,
        { tamanho: Math.max(7, Math.round(8 * k)), cor, espaco: 1 * k, alinhar: 'center' });
    }
    if (!travado) zona(zonaId, cx, cy, chipL, altura, { id });
  });

  return alturaDosChips(ids.length, colunas, altura);
}

// `rotulo` que encolhe em vez de transbordar. "CAMPOS PERIGOSOS" não entra num
// chip de quatro colunas, e transbordar em silêncio foi o que fez a tela de
// início parecer quebrada em tela estreita.
function texto(ctx, s, x, y, largura, estilo) {
  let { tamanho, espaco } = estilo;
  const largo = larguraRotulo(ctx, s, tamanho, espaco);
  if (largo > largura && largo > 0) {
    const f = largura / largo;
    tamanho = Math.max(6, tamanho * f);
    espaco *= f;
  }
  rotulo(ctx, s, x, y, { ...estilo, tamanho, espaco });
}
