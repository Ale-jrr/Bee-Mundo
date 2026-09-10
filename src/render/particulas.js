// Partículas ambientais. Poucas, lentas, e trocando de forma por estação.
// Custa quase nada e é metade da sensação de "estação" do jogo.

const FORMAS = { primavera: 'petala', verao: 'polen', outono: 'folha', inverno: 'neve' };
const QUANTIDADE = 26;

let itens = [];

export function iniciarParticulas(l, a) {
  itens = Array.from({ length: QUANTIDADE }, () => nova(l, a, true));
}

function nova(l, a, espalhar) {
  return {
    x: Math.random() * l,
    y: espalhar ? Math.random() * a : -20,
    vx: -12 - Math.random() * 18,
    vy: 14 + Math.random() * 26,
    giro: (Math.random() - 0.5) * 1.6,
    angulo: Math.random() * Math.PI * 2,
    tam: 3 + Math.random() * 4,
    fase: Math.random() * Math.PI * 2,
  };
}

export function desenharParticulas(ctx, pal, t, l, a, dt) {
  const forma = FORMAS[t.estacao.id];
  ctx.save();
  for (const p of itens) {
    p.angulo += p.giro * dt;
    p.fase += dt * 1.4;
    p.x += (p.vx + Math.sin(p.fase) * 14) * dt;
    p.y += p.vy * dt;
    if (p.y > a + 30 || p.x < -30) Object.assign(p, nova(l, a, false), { x: Math.random() * (l + 120) });

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angulo);
    ctx.fillStyle = pal.css('particula', forma === 'polen' ? 0.55 : 0.85);
    if (forma === 'folha') {
      ctx.beginPath();
      ctx.ellipse(0, 0, p.tam * 1.5, p.tam * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = pal.css('particula', 0.9);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-p.tam * 1.5, 0); ctx.lineTo(p.tam * 1.5, 0); ctx.stroke();
    } else if (forma === 'petala') {
      ctx.beginPath();
      ctx.ellipse(0, 0, p.tam * 1.3, p.tam * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.tam * (forma === 'neve' ? 0.8 : 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}
