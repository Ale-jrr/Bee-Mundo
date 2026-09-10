import { retanguloArredondado, FONTE } from '../render/desenho.js';
import { zona } from './zonas.js';
import { medidas, areaDoClima } from './layout.js';
import { estaMinimizado, botaoMinimizar, pilulaMinimizada, recuoDoBotao } from './cartao.js';
import { defensoras, vespasSemDefesa } from '../sim/predadores.js';

const ALERTA = '#b8484a';
const SEGURO = '#3f8a63';

// Cartão da vespa. Mudou junto com a mecânica: não mostra mais "guardas 0/2"
// como se o jogador tivesse que montar a defesa do zero. As guardiãs em casa
// já estão na porta — o cartão diz **se isso basta**, e só oferece o reforço
// quando não basta.
export function desenharPredador(ctx, estado, pal, L, A, ui = {}, topo = null) {
  const ameaca = estado.ameaca;
  if (!ameaca) return null;

  const m = medidas(L, A);
  const clima = areaDoClima(m);
  const { esc } = m;
  const gap = Math.max(8, Math.round(10 * esc));

  const vespas = ameaca.vespas?.length ?? 1;
  const naPorta = defensoras(estado).length;
  const passariam = vespasSemDefesa(estado);
  const coberta = passariam === 0;

  const titulo = vespas === 1 ? 'Uma vespa vem vindo' : `${vespas} vespas vêm vindo`;
  const fase = ameaca.fase === 'aviso' ? `chegam em ${Math.ceil(ameaca.resta)}s`
    : ameaca.fase === 'voo' ? 'voando até a entrada'
      : 'na porta';

  if (estaMinimizado(ui, 'vespa')) {
    return pilulaMinimizada(ctx, pal, m, clima.x, (topo ?? clima.y + clima.a) + gap,
      clima.l, 'vespa',
      `vespa ${fase} · porta ${naPorta}/${vespas}`, coberta ? SEGURO : ALERTA);
  }

  const pad = Math.max(12, Math.round(18 * esc));
  const hTitulo = Math.max(18, Math.round(24 * esc));
  const hTexto = Math.max(13, Math.round(15 * esc));
  const hBotao = Math.max(m.toque * 0.7, Math.round(34 * esc));
  const podeReforcar = !coberta && ameaca.fase !== 'luta';

  const x = clima.x;
  const y = (topo ?? clima.y + clima.a) + gap;
  const l = clima.l;
  const a = pad + hTitulo + hTexto * 2 + (podeReforcar ? gap + hBotao : 0) + pad;
  if (y + a > A - m.margem - Math.round(40 * esc)) return null;

  ctx.save();
  ctx.shadowColor = pal.css('sombra', 0.18);
  ctx.shadowBlur = 16 * esc;
  ctx.shadowOffsetY = 4 * esc;
  retanguloArredondado(ctx, x, y, l, a, Math.round(20 * esc));
  ctx.fillStyle = pal.css('hud', 0.95);
  ctx.fill();
  ctx.restore();
  zona('vespa:cartao', x, y, l, a);
  botaoMinimizar(ctx, pal, m, x, y, l, 'vespa');

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let cursor = y + pad;

  ctx.fillStyle = coberta ? SEGURO : ALERTA;
  ctx.font = `700 ${Math.max(12, Math.round(14 * esc))}px ${FONTE}`;
  ctx.fillText(titulo, x + pad, cursor + hTitulo / 2, l - pad * 2 - recuoDoBotao(m) - Math.round(52 * esc));
  ctx.textAlign = 'right';
  ctx.fillText(fase, x + l - pad - recuoDoBotao(m), cursor + hTitulo / 2);
  ctx.textAlign = 'left';
  cursor += hTitulo;

  ctx.fillStyle = pal.css('suave');
  ctx.font = `400 ${Math.max(10, Math.round(12 * esc))}px ${FONTE}`;
  ctx.fillText(`Na porta: ${naPorta} — precisa de ${vespas}. Guardiãs entram sozinhas.`,
    x + pad, cursor + hTexto / 2, l - pad * 2);
  cursor += hTexto;
  ctx.fillText(coberta
    ? 'A entrada está coberta.'
    : `${passariam === 1 ? 'Uma vespa passa' : `${passariam} vespas passam`} e ataca quem está dentro.`,
  x + pad, cursor + hTexto / 2, l - pad * 2);
  cursor += hTexto;
  ctx.restore();

  if (!podeReforcar) return y + a;

  cursor += gap;
  retanguloArredondado(ctx, x + pad, cursor, l - pad * 2, hBotao, Math.round(12 * esc));
  ctx.fillStyle = pal.css('cheia');
  ctx.fill();
  ctx.save();
  ctx.fillStyle = pal.css('tinta');
  ctx.font = `700 ${Math.max(10, Math.round(12 * esc))}px ${FONTE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Pôr mais uma na porta', x + l / 2, cursor + hBotao / 2, l - pad * 2 - 8);
  ctx.restore();
  zona('vespa:guarda', x + pad, cursor, l - pad * 2, hBotao);

  return y + a;
}
