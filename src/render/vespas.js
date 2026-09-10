import { VESPAS } from '../sim/predadores.js';

// Vespas atravessando a tela até a colmeia. Antes o ataque era um relógio no
// canto: nada aparecia, e o jogador via só o resultado. Aqui elas vêm da
// borda direita, cada uma na sua altura, e param na entrada do favo.
//
// Puramente decorativo — a simulação já decidiu tudo (`sim/predadores.js`).
// O que este arquivo faz é tornar visível o que ela decidiu.

const CORPO = '#3a2c16';
const LISTRA = '#e8a020';
const ASA = '#f4ead0';

export function desenharVespas(ctx, estado, pal, cx, cy, tam, L, A) {
  const ameaca = estado.ameaca;
  if (!ameaca || ameaca.fase === 'aviso') return;

  const agora = performance.now();
  const porta = tam * 2.1;

  for (const v of ameaca.vespas) {
    const partida = { x: L + tam * 0.9, y: A * (0.12 + (v.faixa ?? 0.5) * 0.62) };
    const rumo = Math.atan2(cy - partida.y, cx - partida.x);
    const chegada = { x: cx - Math.cos(rumo) * porta, y: cy - Math.sin(rumo) * porta };

    let x;
    let y;
    let escala = tam / 78;

    if (v.estado === 'dentro') {
      // Entrou: circula por cima do favo, que é o estrago acontecendo.
      const volta = agora / 700 + v.id;
      x = cx + Math.cos(volta) * tam * 0.85;
      y = cy + Math.sin(volta) * tam * 0.7;
    } else if (v.estado === 'lutando') {
      // Barrada na porta: treme no lugar contra a guardiã.
      const treme = Math.sin(agora / 55 + v.id) * tam * 0.09;
      x = chegada.x + treme;
      y = chegada.y + Math.cos(agora / 47 + v.id) * tam * 0.06;
      escala *= 0.95;
    } else {
      const f = suave(Math.min(1, Math.max(0, v.t ?? 0)));
      x = partida.x + (chegada.x - partida.x) * f;
      y = partida.y + (chegada.y - partida.y) * f;
      // Sobe e desce enquanto voa, senão parece um adesivo deslizando.
      y += Math.sin(agora / 160 + v.id * 2) * tam * 0.12 * (1 - f * 0.5);
      escala *= 0.7 + 0.3 * f;
    }

    const angulo = v.estado === 'voando' ? rumo : Math.sin(agora / 300 + v.id) * 0.3;
    desenharVespa(ctx, x, y, escala, angulo, v.estado === 'dentro');
  }
}

function suave(t) {
  return t * t * (3 - 2 * t);
}

// Uma vespa: corpo mais magro e mais escuro que o da abelha, cintura marcada
// e ferrão à mostra. A leitura tem que ser imediata mesmo pequena — não pode
// ser confundida com uma abelha da própria colmeia.
function desenharVespa(ctx, x, y, escala, angulo, alerta) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angulo);
  ctx.scale(escala, escala);

  if (alerta) {
    ctx.beginPath();
    ctx.arc(0, 0, 44, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(184, 72, 74, 0.22)';
    ctx.fill();
  }

  // Asas: mais longas e mais transparentes que as da abelha.
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = ASA;
  for (const lado of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(-4, lado * 16, 26, 9, lado * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = CORPO;
  // Cabeça
  ctx.beginPath();
  ctx.ellipse(20, 0, 11, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // Tórax
  ctx.beginPath();
  ctx.ellipse(4, 0, 13, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cintura fina — é o que separa vespa de abelha à primeira vista.
  ctx.fillRect(-10, -2.5, 8, 5);
  // Abdome pontudo
  ctx.beginPath();
  ctx.moveTo(-8, -11);
  ctx.quadraticCurveTo(-30, -9, -40, 0);
  ctx.quadraticCurveTo(-30, 9, -8, 11);
  ctx.closePath();
  ctx.fill();

  // Listras do abdome
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-8, -11);
  ctx.quadraticCurveTo(-30, -9, -40, 0);
  ctx.quadraticCurveTo(-30, 9, -8, 11);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = LISTRA;
  for (const dx of [-14, -24, -33]) ctx.fillRect(dx, -14, 5, 28);
  ctx.restore();

  // Antenas
  ctx.strokeStyle = CORPO;
  ctx.lineWidth = 2;
  for (const lado of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(26, lado * 4);
    ctx.quadraticCurveTo(36, lado * 10, 40, lado * 6);
    ctx.stroke();
  }

  ctx.restore();
}

// Fração do ataque já percorrida, de 0 a 1. O HUD usa para a barrinha.
export function progressoDoAtaque(ameaca) {
  if (!ameaca) return 0;
  const total = VESPAS.aviso + VESPAS.voo + VESPAS.luta;
  const gastoAntes = ameaca.fase === 'aviso' ? 0
    : ameaca.fase === 'voo' ? VESPAS.aviso
      : VESPAS.aviso + VESPAS.voo;
  const daFase = ameaca.fase === 'aviso' ? VESPAS.aviso
    : ameaca.fase === 'voo' ? VESPAS.voo : VESPAS.luta;
  return Math.min(1, (gastoAntes + (daFase - Math.max(0, ameaca.resta))) / total);
}
