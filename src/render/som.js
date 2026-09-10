// Som do jogo, inteiro em Web Audio: nenhum arquivo, nenhum download, nada pra
// versionar. São duas coisas só —
//
//   o zumbido de fundo, que engrossa e sobe conforme a colônia cresce, e é o
//   que faz a colmeia parecer viva mesmo parada;
//   três toques curtos: colher, vender e aviso.
//
// Tudo dentro de try/catch e com saída silenciosa: navegador sem Web Audio, ou
// com áudio bloqueado, tem que resultar num jogo mudo, não num jogo quebrado.

const CHAVE_MUDO = 'colmeia:mudo';

let ctx = null;
let mestre = null;
let zumbido = null;       // { osc: [], ganho, filtro }
let silenciado = lerMudo();

function lerMudo() {
  try {
    return localStorage.getItem(CHAVE_MUDO) === '1';
  } catch {
    return false;
  }
}

export function mudo() {
  return silenciado;
}

export function alternarMudo() {
  silenciado = !silenciado;
  try {
    localStorage.setItem(CHAVE_MUDO, silenciado ? '1' : '0');
  } catch { /* modo privado: a preferência não persiste, o jogo segue */ }
  if (mestre) mestre.gain.value = silenciado ? 0 : 1;
  return silenciado;
}

// O contexto só pode nascer dentro de um gesto do jogador — política de
// autoplay de todo navegador moderno. Chamado no primeiro toque na tela.
export function acordarSom() {
  try {
    if (!ctx) {
      const Contexto = window.AudioContext || window.webkitAudioContext;
      if (!Contexto) return;
      ctx = new Contexto();
      mestre = ctx.createGain();
      mestre.gain.value = silenciado ? 0 : 1;
      mestre.connect(ctx.destination);
      criarZumbido();
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    ctx = null;
  }
}

function criarZumbido() {
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 620;

  const ganho = ctx.createGain();
  ganho.gain.value = 0;
  filtro.connect(ganho);
  ganho.connect(mestre);

  // Dois osciladores levemente desafinados: sozinho, um oscilador soa como
  // aparelho ligado; desafinado, bate e vira zumbido de bicho.
  const osc = [0, 1].map((i) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 108 + i * 1.6;
    o.connect(filtro);
    o.start();
    return o;
  });

  zumbido = { osc, ganho, filtro };
}

// Chamado por quadro. A colônia manda no volume e no tom: colmeia grande zumbe
// mais grave e mais forte. Pausado, silencia — o zumbido é a colmeia
// trabalhando, não o programa aberto.
export function atualizarSom(estado) {
  if (!ctx || !zumbido || silenciado) return;
  try {
    const dentro = estado.abelhas.filter(
      (a) => a.estado === 'colmeia' || a.estado === 'rainha',
    ).length;
    const cheio = Math.min(1, dentro / 30);
    const parado = estado.velocidade === 0 || estado.derrota || estado.vitoria;

    const alvo = parado ? 0 : 0.006 + 0.03 * cheio;
    // Rampa curta: mudar em degrau estala.
    zumbido.ganho.gain.setTargetAtTime(alvo, ctx.currentTime, 0.25);
    zumbido.filtro.frequency.setTargetAtTime(520 + 420 * cheio, ctx.currentTime, 0.4);
    for (const [i, o] of zumbido.osc.entries()) {
      o.frequency.setTargetAtTime(104 + i * 1.6 + 26 * cheio, ctx.currentTime, 0.5);
    }
  } catch { /* um quadro sem som não é motivo pra derrubar o desenho */ }
}

const TOQUES = {
  colher: { freq: 660, para: 990, dur: 0.16, tipo: 'triangle', vol: 0.16 },
  vender: { freq: 520, para: 780, dur: 0.22, tipo: 'sine', vol: 0.18 },
  aviso: { freq: 300, para: 190, dur: 0.2, tipo: 'square', vol: 0.07 },
};

export function tocar(nome) {
  if (!ctx || silenciado) return;
  const t = TOQUES[nome];
  if (!t) return;
  try {
    const agora = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = t.tipo;
    o.frequency.setValueAtTime(t.freq, agora);
    o.frequency.exponentialRampToValueAtTime(t.para, agora + t.dur);
    // Ataque quase instantâneo e queda exponencial: é o envelope que separa
    // "nota" de "bipe de micro-ondas".
    g.gain.setValueAtTime(0.0001, agora);
    g.gain.exponentialRampToValueAtTime(t.vol, agora + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, agora + t.dur);
    o.connect(g);
    g.connect(mestre);
    o.start(agora);
    o.stop(agora + t.dur + 0.02);
  } catch { /* idem */ }
}

// Aba escondida: o jogo já para, o som para junto.
export function pausarSom(escondido) {
  if (!ctx) return;
  try {
    if (escondido && ctx.state === 'running') ctx.suspend();
    if (!escondido && ctx.state === 'suspended') ctx.resume();
  } catch { /* idem */ }
}
