import { pilula, rotulo } from '../render/desenho.js';
import { zona } from './zonas.js';
import { DESAFIOS, DESAFIO_PADRAO } from '../sim/desafios.js';
import { desafiosLiberados } from '../core/conquistas.js';

// Grade de desafios. Vive num módulo só porque duas telas mostram a mesma
// coisa — o menu e a tela de início — e duas cópias iam divergir na primeira
// vez que alguém acrescentasse um desafio.

export const ALTURA_CHIP = 46;
const ESPACO = 8;

export function alturaDosChips(quantos = Object.keys(DESAFIOS).length) {
  return Math.ceil(quantos / 2) * (ALTURA_CHIP + ESPACO);
}

// `zonaId` deixa cada tela usar o seu próprio identificador de toque.
export function desenharChips(ctx, pal, x, y, l, escolhido, zonaId) {
  const ids = Object.keys(DESAFIOS);
  const liberados = desafiosLiberados();
  const chipL = (l - ESPACO) / 2;

  ids.forEach((id, i) => {
    const cx = x + (i % 2) * (chipL + ESPACO);
    const cy = y + Math.floor(i / 2) * (ALTURA_CHIP + ESPACO);
    // Trancado até a primeira vitória: os desafios são o motivo de rejogar.
    const travado = id !== DESAFIO_PADRAO && !liberados;
    const ativo = id === escolhido && !travado;

    pilula(ctx, cx, cy, chipL, ALTURA_CHIP);
    ctx.fillStyle = ativo ? pal.css('cheia') : pal.css('escuro', travado ? 0.04 : 0.08);
    ctx.fill();
    rotulo(ctx, DESAFIOS[id].nome, cx + chipL / 2, cy + 17, {
      tamanho: 10, cor: ativo ? pal.css('tinta') : pal.css('suave', travado ? 0.5 : 1),
      espaco: 1.4, alinhar: 'center',
    });
    rotulo(ctx, travado ? 'vença uma vez para abrir' : DESAFIOS[id].resumo,
      cx + chipL / 2, cy + 32, {
        tamanho: 8, cor: ativo ? pal.css('tinta') : pal.css('suave', travado ? 0.5 : 1),
        espaco: 1, alinhar: 'center',
      });
    if (!travado) zona(zonaId, cx, cy, chipL, ALTURA_CHIP, { id });
  });

  return alturaDosChips(ids.length);
}
