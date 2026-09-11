import { pilula, rotulo, larguraRotulo, FONTE } from '../render/desenho.js';
import { desenharPaisagem } from '../render/paisagens.js';
import { zona } from './zonas.js';
import { BIOMAS, ESPECIES } from '../sim/biomas.js';

// Cards de bioma. Saíram da grade genérica de chips porque o bioma é a única
// escolha que muda o jogo inteiro — campos, clima e espécie — e um retângulo
// com duas linhas de texto não dava conta de mostrar isso.
//
// Cada card traz três informações, na ordem em que o olho pega: a paisagem,
// o nome com a espécie, e as duas características que de fato mudam a partida.

const ESPACO = 8;
export const ALTURA_CARD = 84;

export function alturaDosCards(quantos = Object.keys(BIOMAS).length, colunas = 2) {
  return Math.ceil(quantos / colunas) * (ALTURA_CARD + ESPACO);
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
  if (r < 0.95) fora.push(`campo repõe ${Math.round(r * 100)}%`);
  else if (r > 1.05) fora.push(`campo repõe ${Math.round(r * 100)}%`);
  else fora.push('campo repõe normal');
  return fora;
}

export function desenharCardsDeBioma(ctx, pal, x, y, l, escolhido, zonaId, colunas = 2) {
  const ids = Object.keys(BIOMAS);
  const cardL = (l - ESPACO * (colunas - 1)) / colunas;

  ids.forEach((id, i) => {
    const b = BIOMAS[id];
    const cx = x + (i % colunas) * (cardL + ESPACO);
    const cy = y + Math.floor(i / colunas) * (ALTURA_CARD + ESPACO);
    const ativo = id === escolhido;

    pilula(ctx, cx, cy, cardL, ALTURA_CARD);
    ctx.fillStyle = ativo ? pal.css('cheia') : pal.css('escuro', 0.08);
    ctx.fill();

    const pad = Math.round(ALTURA_CARD * 0.12);
    // A paisagem não ocupa o card inteiro em altura: o nome do bioma é longo
    // ("Mata Atlântica", "Campos do Sul") e precisa da largura que sobra.
    const tam = Math.round(ALTURA_CARD * 0.62);
    desenharPaisagem(ctx, id, cx + pad, cy + (ALTURA_CARD - tam) / 2, tam);

    const tx = cx + pad + tam + Math.round(ALTURA_CARD * 0.11);
    const largura = cardL - (tx - cx) - pad;
    const cor = ativo ? pal.css('tinta') : pal.css('suave');

    // Encolhe pra caber: "MATA ATLÂNTICA" em caixa alta não entra no espaço
    // que sobra, e `rotulo` corta em silêncio em vez de avisar.
    let tamNome = 10;
    let espNome = 1.2;
    const largoNome = larguraRotulo(ctx, b.nome, tamNome, espNome);
    if (largoNome > largura) {
      const f = largura / largoNome;
      tamNome = Math.max(7, tamNome * f);
      espNome *= f;
    }
    rotulo(ctx, b.nome, tx, cy + ALTURA_CARD * 0.26, {
      tamanho: tamNome, cor, espaco: espNome,
    });

    ctx.save();
    ctx.font = `600 9px ${FONTE}`;
    ctx.fillStyle = ativo ? pal.css('tinta') : pal.css('suave');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(ESPECIES[b.especie]?.nome ?? '', tx, cy + ALTURA_CARD * 0.46, largura);
    ctx.restore();

    // As características em cinza claro, menores: são o detalhe que se lê
    // depois de já ter reconhecido o bioma pela paisagem.
    ctx.save();
    ctx.font = `400 8px ${FONTE}`;
    ctx.fillStyle = ativo ? pal.css('tinta', 0.75) : pal.css('suave', 0.75);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    caracteristicas(b).forEach((linha, n) => {
      ctx.fillText(linha, tx, cy + ALTURA_CARD * (0.65 + n * 0.17), largura);
    });
    ctx.restore();

    zona(zonaId, cx, cy, cardL, ALTURA_CARD, { id });
  });

  return alturaDosCards(ids.length, colunas);
}
