import { pilula, rotulo } from '../render/desenho.js';
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
export function desenharChips(ctx, pal, x, y, l, escolhido, zonaId, cfg = {}) {
  const tabela = cfg.tabela ?? DESAFIOS;
  const colunas = cfg.colunas ?? 2;
  const altura = cfg.altura ?? ALTURA_CHIP;
  const liberados = desafiosLiberados();
  const travadoPor = cfg.travado ?? ((id) => id !== DESAFIO_PADRAO && !liberados);

  const ids = Object.keys(tabela);
  const chipL = (l - ESPACO * (colunas - 1)) / colunas;
  const comResumo = altura >= 40;

  ids.forEach((id, i) => {
    const cx = x + (i % colunas) * (chipL + ESPACO);
    const cy = y + Math.floor(i / colunas) * (altura + ESPACO);
    const travado = travadoPor(id);
    const ativo = id === escolhido && !travado;

    pilula(ctx, cx, cy, chipL, altura);
    ctx.fillStyle = ativo ? pal.css('cheia') : pal.css('escuro', travado ? 0.04 : 0.08);
    ctx.fill();

    const cor = ativo ? pal.css('tinta') : pal.css('suave', travado ? 0.5 : 1);
    rotulo(ctx, tabela[id].nome, cx + chipL / 2, cy + (comResumo ? 17 : altura / 2), {
      tamanho: 10, cor, espaco: 1.4, alinhar: 'center',
    });
    if (comResumo) {
      rotulo(ctx, travado ? 'vença uma vez para abrir' : tabela[id].resumo,
        cx + chipL / 2, cy + 32, { tamanho: 8, cor, espaco: 1, alinhar: 'center' });
    }
    if (!travado) zona(zonaId, cx, cy, chipL, altura, { id });
  });

  return alturaDosChips(ids.length, colunas, altura);
}
