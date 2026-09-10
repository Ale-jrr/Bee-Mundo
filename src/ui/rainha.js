import { retanguloArredondado, pilula, rotulo, numero, barra, FONTE } from '../render/desenho.js';
import { zona } from './zonas.js';
import { medidas } from './layout.js';
import {
  RAINHA, idadeDaRainha, vigorDaRainha, intervaloDePostura, emInterregno, podeCoroar,
} from '../sim/rainha.js';
import { SEGUNDOS_POR_ANO } from '../sim/estacoes.js';

// Painel da rainha, aberto tocando na célula dela. É onde o jogador descobre
// que a postura caiu — e onde decide pagar o preço de trocar.
export function desenharRainha(ctx, estado, pal, L, A) {
  const m = medidas(L, A);
  const l = Math.min(400, L - m.margem * 2);
  const a = 320;
  const x = (L - l) / 2;
  const y = (A - a) / 2;

  ctx.fillStyle = 'rgba(30, 22, 10, 0.55)';
  ctx.fillRect(0, 0, L, A);
  zona('rainha:fundo', 0, 0, L, A);

  retanguloArredondado(ctx, x, y, l, a, 28);
  ctx.fillStyle = pal.css('hud', 0.98);
  ctx.fill();
  zona('rainha:cartao', x, y, l, a);

  rotulo(ctx, 'a rainha', x + 26, y + 34, { tamanho: 13, cor: pal.css('suave'), espaco: 3 });

  const anos = idadeDaRainha(estado) / SEGUNDOS_POR_ANO;
  const vigor = vigorDaRainha(estado);
  const linhas = [
    ['idade', anos < 1 ? 'menos de um ano' : `${anos.toFixed(1)} anos`],
    ['vigor', `${Math.round(vigor * 100)}%`],
    ['põe a cada', `${intervaloDePostura(estado).toFixed(0)}s`],
  ];
  linhas.forEach(([nome, valor], i) => {
    const ly = y + 78 + i * 30;
    rotulo(ctx, nome, x + 26, ly, { tamanho: 11, cor: pal.css('suave'), espaco: 1.8 });
    numero(ctx, valor, x + l - 26, ly, {
      tamanho: 15, cor: vigor < 0.6 && nome !== 'idade' ? '#b8484a' : pal.css('tinta'),
      alinhar: 'right',
    });
  });

  barra(ctx, x + 26, y + 178, l - 52, 10, vigor,
    pal.css('escuro', 0.18), vigor < 0.6 ? '#b8484a' : pal.css('cheia'));

  ctx.save();
  ctx.font = `400 12px ${FONTE}`;
  ctx.fillStyle = pal.css('suave');
  ctx.textAlign = 'center';
  ctx.fillText(vigor >= 1
    ? 'No auge. A postura vai cair com os anos.'
    : 'Rainha velha põe menos. Trocar custa mel e tempo.',
  x + l / 2, y + 212, l - 52);
  ctx.restore();

  const ba = Math.max(m.toque, 44);
  const by = y + a - ba - 26;
  const emTroca = emInterregno(estado);
  const pode = !emTroca && podeCoroar(estado);
  pilula(ctx, x + 26, by, l - 52, ba);
  ctx.fillStyle = pode ? pal.css('cheia') : pal.css('escuro', 0.1);
  ctx.fill();
  rotulo(ctx, emTroca
    ? `nova rainha em ${Math.ceil(estado.interregno)}s`
    : `coroar nova rainha · ${RAINHA.custoMel} mel`,
  x + l / 2, by + ba / 2, {
    tamanho: 11, cor: pode ? pal.css('tinta') : pal.css('suave'), espaco: 2, alinhar: 'center',
  });
  if (pode) zona('rainha:coroar', x + 26, by, l - 52, ba);

  const fx = x + l - 40, fy = y + 16;
  ctx.strokeStyle = pal.css('suave');
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(fx, fy); ctx.lineTo(fx + 16, fy + 16);
  ctx.moveTo(fx + 16, fy); ctx.lineTo(fx, fy + 16);
  ctx.stroke();
  zona('rainha:fechar', fx - 14, fy - 14, 44, 44);
}
