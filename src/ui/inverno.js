import { retanguloArredondado, pilula, rotulo, numero, barra } from '../render/desenho.js';
import { zona } from './zonas.js';
import { medidas, areaDoClima } from './layout.js';
import { previsaoInverno } from '../sim/inverno.js';

const ALERTA = '#b8484a';

// Painel de preparação para o inverno. Aparece sozinho no fim do outono e some
// sozinho na primavera — é o único painel do jogo que o jogador não abre, e é
// de propósito: a informação que ele traz só serve enquanto ainda dá tempo de
// agir. Fora dessa janela seria mais um cartão ocupando a tela.
// Devolve a coordenada do rodapé do cartão (ou null), pra quem vier depois
// empilhar embaixo em vez de adivinhar a altura.
export function desenharInverno(ctx, estado, pal, L, A) {
  const p = previsaoInverno(estado);
  if (!p) return null;

  const m = medidas(L, A);
  const clima = areaDoClima(m);
  const { esc } = m;
  const podeRecolher = !p.inverno && p.fora > 0;

  // As alturas vêm somadas, não de um total mágico. Com total fixo, o piso de
  // escala (0,62) encolhia os textos mas não o botão, que tem alvo mínimo de
  // toque — e no celular o botão subia por cima da linha das coletoras.
  const pad = Math.max(12, Math.round(18 * esc));
  const hTitulo = Math.max(18, Math.round(24 * esc));
  const hTexto = Math.max(13, Math.round(15 * esc));
  const hBarra = Math.max(6, Math.round(8 * esc));
  const hBotao = Math.max(m.toque * 0.7, Math.round(34 * esc));
  const gap = Math.max(8, Math.round(10 * esc));

  const x = clima.x;
  const y = clima.y + clima.a + gap;
  const l = clima.l;
  const a = pad + hTitulo + hTexto + hBarra + gap + hTexto
    + (podeRecolher ? gap + hBotao : 0) + pad;

  // Some se não couber entre o clima e o vidro de mel: numa tela baixa é
  // melhor não ter o painel do que ter ele por cima do estoque.
  if (y + a > A - m.margem - Math.round(40 * esc)) return null;

  ctx.save();
  ctx.shadowColor = pal.css('sombra', 0.18);
  ctx.shadowBlur = 16 * esc;
  ctx.shadowOffsetY = 4 * esc;
  retanguloArredondado(ctx, x, y, l, a, Math.round(20 * esc));
  ctx.fillStyle = pal.css('hud', 0.95);
  ctx.fill();
  ctx.restore();
  zona('inverno:cartao', x, y, l, a);

  let cursor = y + pad;

  rotulo(ctx, p.inverno ? 'inverno' : 'preparar o inverno', x + pad, cursor + hTitulo / 2, {
    tamanho: m.rotulo, cor: pal.css('suave'), espaco: 2.4,
  });
  numero(ctx, relogioCurto(p.restam), x + l - pad, cursor + hTitulo / 2, {
    tamanho: Math.max(13, 17 * esc), cor: pal.css('tinta'), alinhar: 'right',
  });
  cursor += hTitulo;

  // Reserva: o número que importa é o que **falta**, não o que tem — por isso
  // ele vem primeiro, e em vermelho, que é o estado em que o jogador precisa
  // fazer alguma coisa.
  const faltando = p.falta > 0;
  rotulo(ctx, faltando ? `faltam ${p.falta} de mel` : 'reserva suficiente',
    x + pad, cursor + hTexto / 2, {
      tamanho: Math.max(9, 10 * esc), cor: faltando ? ALERTA : pal.css('suave'), espaco: 1.6,
    });
  numero(ctx, `${p.total.toFixed(1)}/${p.necessario}`, x + l - pad, cursor + hTexto / 2, {
    tamanho: Math.max(11, 13 * esc), cor: faltando ? ALERTA : pal.css('tinta'), alinhar: 'right',
  });
  cursor += hTexto;

  barra(ctx, x + pad, cursor, l - pad * 2, hBarra,
    p.necessario > 0 ? Math.min(1, p.total / p.necessario) : 1,
    pal.css('escuro', 0.2), faltando ? ALERTA : pal.css('cheia'));
  cursor += hBarra + gap;

  // Coletoras ainda fora. `aTempo` compara a volta da mais atrasada com o que
  // resta de outono: é a diferença entre "ainda dá" e "essa não volta".
  const texto = p.inverno
    ? 'sem coleta: a colônia vive da reserva'
    : p.fora === 0
      ? 'ninguém no campo'
      : `${p.fora} no campo · volta em ${p.voltaEm}s`;
  rotulo(ctx, texto, x + pad, cursor + hTexto / 2, {
    tamanho: Math.max(9, 10 * esc), cor: p.aTempo ? pal.css('suave') : ALERTA, espaco: 1.4,
  });
  cursor += hTexto;

  if (!podeRecolher) return y + a;
  cursor += gap;
  pilula(ctx, x + pad, cursor, l - pad * 2, hBotao);
  ctx.fillStyle = p.aTempo ? pal.css('cheia') : ALERTA;
  ctx.fill();
  rotulo(ctx, 'recolher todas', x + l / 2, cursor + hBotao / 2, {
    tamanho: Math.max(9, 11 * esc), cor: p.aTempo ? pal.css('tinta') : '#fff2ce',
    espaco: 2, alinhar: 'center',
  });
  zona('inverno:recolher', x + pad, cursor, l - pad * 2, hBotao);
  return y + a;
}

function relogioCurto(segundos) {
  const s = Math.max(0, Math.ceil(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
