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
//
// A altura vem de fora: a tela de início encolhe tudo junto quando não cabe, e
// card de altura fixa era exatamente o que impedia esse encolhimento de
// funcionar — a escala caía e o cartão continuava do mesmo tamanho.

const ESPACO = 8;
export const ALTURA_CARD = 84;

export function alturaDosCards(quantos = Object.keys(BIOMAS).length, colunas = 2,
  altura = ALTURA_CARD) {
  return Math.ceil(quantos / colunas) * (altura + ESPACO);
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

export function desenharCardsDeBioma(ctx, pal, x, y, l, escolhido, zonaId,
  colunas = 2, altura = ALTURA_CARD) {
  const ids = Object.keys(BIOMAS);
  const cardL = (l - ESPACO * (colunas - 1)) / colunas;
  // Proporções do card, e não pixels: assim ele encolhe inteiro e nada se
  // desencontra quando a tela é curta.
  const k = altura / ALTURA_CARD;

  ids.forEach((id, i) => {
    const b = BIOMAS[id];
    const cx = x + (i % colunas) * (cardL + ESPACO);
    const cy = y + Math.floor(i / colunas) * (altura + ESPACO);
    const ativo = id === escolhido;

    pilula(ctx, cx, cy, cardL, altura);
    ctx.fillStyle = ativo ? pal.css('cheia') : pal.css('escuro', 0.08);
    ctx.fill();

    const pad = Math.round(altura * 0.12);
    // A paisagem não ocupa o card inteiro em altura: o nome do bioma é longo
    // ("Mata Atlântica", "Campos do Sul") e precisa da largura que sobra.
    const tam = Math.round(altura * 0.62);
    desenharPaisagem(ctx, id, cx + pad, cy + (altura - tam) / 2, tam);

    const tx = cx + pad + tam + Math.round(altura * 0.11);
    const largura = cardL - (tx - cx) - pad;
    const cor = ativo ? pal.css('tinta') : pal.css('suave');

    // Encolhe pra caber: "MATA ATLÂNTICA" em caixa alta não entra no espaço
    // que sobra, e `rotulo` corta em silêncio em vez de avisar.
    let tamNome = Math.max(7, 10 * k);
    let espNome = 1.2 * k;
    const largoNome = larguraRotulo(ctx, b.nome, tamNome, espNome);
    if (largoNome > largura) {
      const f = largura / largoNome;
      tamNome = Math.max(6, tamNome * f);
      espNome *= f;
    }
    rotulo(ctx, b.nome, tx, cy + altura * 0.26, {
      tamanho: tamNome, cor, espaco: espNome,
    });

    ctx.save();
    ctx.font = `600 ${Math.max(7, Math.round(9 * k))}px ${FONTE}`;
    ctx.fillStyle = cor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(ESPECIES[b.especie]?.nome ?? '', tx, cy + altura * 0.46, largura);
    ctx.restore();

    // As características menores e mais claras: são o detalhe que se lê depois
    // de já ter reconhecido o bioma pela paisagem.
    ctx.save();
    ctx.font = `400 ${Math.max(6, Math.round(8 * k))}px ${FONTE}`;
    ctx.fillStyle = ativo ? pal.css('tinta', 0.75) : pal.css('suave', 0.75);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    caracteristicas(b).forEach((linha, n) => {
      ctx.fillText(linha, tx, cy + altura * (0.65 + n * 0.17), largura);
    });
    ctx.restore();

    zona(zonaId, cx, cy, cardL, altura, { id });
  });

  return alturaDosCards(ids.length, colunas, altura);
}
