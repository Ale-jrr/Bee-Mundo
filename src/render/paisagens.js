// Paisagem de cada bioma, num quadradinho. Desenhada em código como todo o
// resto do jogo — não há um único arquivo de imagem no projeto, e não é por
// economia: forma em código escala para qualquer tela e muda de cor junto com
// a paleta sem exportar nada de novo.
//
// O que cada uma precisa entregar em ~54 px: **reconhecimento imediato**. Um
// mandacaru e uma araucária são silhuetas que ninguém confunde, e é nelas que
// a leitura se apoia — não no verde nem no céu, que são parecidos entre si.

import { retanguloArredondado } from './desenho.js';

// Cores próprias, e não da paleta da estação: o card descreve o bioma, não o
// momento da partida em que ele está sendo escolhido.
const CORES = {
  mata: { ceu: '#bcd9a0', chao: '#6f8f4e', copa: '#3f6b33', tronco: '#5a4326', sol: null },
  caatinga: { ceu: '#e8cf94', chao: '#c49a52', copa: '#6f8f52', tronco: '#8a6a3a', sol: '#f0b429' },
  cerrado: { ceu: '#d8d29a', chao: '#a89a55', copa: '#5f7a3a', tronco: '#6b5130', sol: null },
  sul: { ceu: '#a8c3c0', chao: '#5f7d63', copa: '#2f5240', tronco: '#4a3a28', sol: null },
};

export function desenharPaisagem(ctx, id, x, y, tam) {
  const c = CORES[id] ?? CORES.mata;
  ctx.save();
  retanguloArredondado(ctx, x, y, tam, tam, Math.round(tam * 0.26));
  ctx.clip();

  ctx.fillStyle = c.ceu;
  ctx.fillRect(x, y, tam, tam);

  if (c.sol) {
    ctx.beginPath();
    ctx.arc(x + tam * 0.76, y + tam * 0.24, tam * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = c.sol;
    ctx.fill();
  }

  // O chão é uma curva, não uma reta: horizonte reto em quadrado pequeno
  // parece uma barra de progresso.
  ctx.beginPath();
  ctx.moveTo(x, y + tam);
  ctx.lineTo(x, y + tam * 0.72);
  ctx.quadraticCurveTo(x + tam * 0.5, y + tam * 0.6, x + tam, y + tam * 0.74);
  ctx.lineTo(x + tam, y + tam);
  ctx.closePath();
  ctx.fillStyle = c.chao;
  ctx.fill();

  ({ mata, caatinga, cerrado, sul }[id] ?? mata)(ctx, c, x, y, tam);
  ctx.restore();
}

// Mata Atlântica: copa densa em camadas, a floresta fechada.
function mata(ctx, c, x, y, t) {
  ctx.fillStyle = c.tronco;
  ctx.fillRect(x + t * 0.44, y + t * 0.5, t * 0.07, t * 0.28);
  ctx.fillStyle = c.copa;
  for (const [cx, cy, r] of [[0.3, 0.5, 0.16], [0.62, 0.46, 0.18], [0.47, 0.38, 0.21]]) {
    ctx.beginPath();
    ctx.arc(x + t * cx, y + t * cy, t * r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Caatinga: mandacaru. Coluna com dois braços — a silhueta mais reconhecível
// do sertão, e a única do jogo que não é redonda.
function caatinga(ctx, c, x, y, t) {
  ctx.fillStyle = c.copa;
  const bx = x + t * 0.36;
  ctx.fillRect(bx, y + t * 0.3, t * 0.1, t * 0.48);
  ctx.fillRect(bx - t * 0.16, y + t * 0.46, t * 0.08, t * 0.22);
  ctx.fillRect(bx + t * 0.18, y + t * 0.4, t * 0.08, t * 0.28);
  // Arredonda as pontas dos braços.
  for (const [ax, ay] of [[bx + t * 0.05, 0.3], [bx - t * 0.12, 0.46], [bx + t * 0.22, 0.4]]) {
    ctx.beginPath();
    ctx.arc(ax, y + t * ay, t * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }
  // Arbusto seco ao lado, pra não ficar um cacto solitário no vazio.
  ctx.beginPath();
  ctx.arc(x + t * 0.76, y + t * 0.72, t * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

// Cerrado: árvore baixa de copa larga e tronco torto, e capim alto.
function cerrado(ctx, c, x, y, t) {
  ctx.strokeStyle = c.tronco;
  ctx.lineWidth = Math.max(2, t * 0.05);
  ctx.beginPath();
  ctx.moveTo(x + t * 0.46, y + t * 0.78);
  ctx.quadraticCurveTo(x + t * 0.56, y + t * 0.62, x + t * 0.46, y + t * 0.5);
  ctx.stroke();

  ctx.fillStyle = c.copa;
  ctx.beginPath();
  ctx.ellipse(x + t * 0.46, y + t * 0.44, t * 0.26, t * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = c.copa;
  ctx.lineWidth = Math.max(1.5, t * 0.035);
  for (const gx of [0.14, 0.2, 0.78, 0.85]) {
    ctx.beginPath();
    ctx.moveTo(x + t * gx, y + t * 0.82);
    ctx.lineTo(x + t * (gx + 0.03), y + t * 0.66);
    ctx.stroke();
  }
}

// Campos do Sul: araucária. Tronco alto e copa em guarda-chuva, que é o
// contorno que define a paisagem gaúcha.
function sul(ctx, c, x, y, t) {
  ctx.fillStyle = c.tronco;
  ctx.fillRect(x + t * 0.45, y + t * 0.36, t * 0.06, t * 0.42);
  ctx.fillStyle = c.copa;
  ctx.beginPath();
  ctx.moveTo(x + t * 0.2, y + t * 0.4);
  ctx.quadraticCurveTo(x + t * 0.48, y + t * 0.2, x + t * 0.76, y + t * 0.4);
  ctx.quadraticCurveTo(x + t * 0.48, y + t * 0.34, x + t * 0.2, y + t * 0.4);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + t * 0.28, y + t * 0.3);
  ctx.quadraticCurveTo(x + t * 0.48, y + t * 0.14, x + t * 0.68, y + t * 0.3);
  ctx.quadraticCurveTo(x + t * 0.48, y + t * 0.24, x + t * 0.28, y + t * 0.3);
  ctx.fill();
  // Morro atrás, que é o que faz "campo" e não "mata".
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.arc(x + t * 0.86, y + t * 0.82, t * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}
