import { enviarGuarda } from './sim/predadores.js';
import { novoJogo } from './core/estado.js';
import { salvar, carregar, apagar } from './core/save.js';
import { passo } from './sim/tick.js';
import { desenhar } from './render/cena.js';
import { iniciarParticulas } from './render/particulas.js';
import { geometriaFavo, limitarCamera, limitarZoom, ZOOM } from './render/favo.js';
import { zonaEm } from './ui/zonas.js';
import {
  comprarCelula, colher, vender, aplicarBoost, alocar, comprarUpgrade,
  alimentarNinhada, avisar, recolherTodas,
} from './sim/acoes.js';
import { escolherBencao } from './sim/bencaos.js';
import { fecharDica } from './sim/dicas.js';
import { dePixel, chave } from './sim/hex.js';
import { relogio } from './sim/estacoes.js';

const TICK = 1 / 30;              // passo fixo: a simulação nunca varia com o FPS
const MAX_QUADRO = 0.25;          // protege contra picos de um quadro só
const INTERVALO_SALVAR = 10;      // segundos de jogo entre salvamentos

const canvas = document.getElementById('jogo');
const ctx = canvas.getContext('2d');

const ui = {
  ajudaMelhorias: false, painel: null, rolagemCampos: 0, rolagemMax: 0, ovoSelecionado: null,
  salvoEm: null, saveFalhou: false, confirmandoNovoJogo: false,
  desafioEscolhido: null,
  // Vista do jogador sobre o favo. Não é estado de jogo — não vai pro save,
  // e recomeçar não deve herdar o enquadramento da partida anterior.
  camera: { x: 0, y: 0, zoom: 1 },
};
let L = 0, A = 0;

// Carrega o save antes do primeiro quadro; se não houver (ou estiver
// corrompido), começa um jogo novo em silêncio.
let estado;
const salvo = carregar();
if (salvo) {
  estado = salvo.estado;
  ui.salvoEm = salvo.salvoEm;
} else {
  estado = novoJogo();
}

function redimensionar() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  L = window.innerWidth;
  A = window.innerHeight;
  canvas.width = Math.round(L * dpr);
  canvas.height = Math.round(A * dpr);
  canvas.style.width = `${L}px`;
  canvas.style.height = `${A}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  limitarCamera(ui.camera, L, A);
  iniciarParticulas(L, A);
}
window.addEventListener('resize', redimensionar);
redimensionar();

// ---------------------------------------------------------------- entrada

// Todo gesto começa igual e só se decide no movimento: parado vira toque, com
// arrasto vira rolagem (no painel de campos) ou câmera (no resto). Antes o
// toque disparava já no `pointerdown`, o que impedia qualquer arrasto sobre o
// favo — e era por isso que a colmeia ficava presa embaixo dos avisos.
const LIMIAR_ARRASTO = 6;
let arrastando = null;

canvas.addEventListener('pointerdown', (ev) => {
  ev.preventDefault();
  arrastando = {
    tipo: ui.painel === 'campos' ? 'rolagem' : 'camera',
    x: ev.clientX, y: ev.clientY, movido: 0,
  };
});

canvas.addEventListener('pointermove', (ev) => {
  if (!arrastando) return;
  const dx = ev.clientX - arrastando.x;
  const dy = ev.clientY - arrastando.y;
  arrastando.movido += Math.hypot(dx, dy);
  if (arrastando.tipo === 'rolagem') {
    rolar(-dy);
  } else if (arrastando.movido >= LIMIAR_ARRASTO && podeMoverCamera()) {
    ui.camera.x += dx;
    ui.camera.y += dy;
    limitarCamera(ui.camera, L, A);
  }
  arrastando.x = ev.clientX;
  arrastando.y = ev.clientY;
});

canvas.addEventListener('pointerup', (ev) => {
  if (arrastando && arrastando.movido < LIMIAR_ARRASTO) aoTocar(ev.clientX, ev.clientY);
  arrastando = null;
});

canvas.addEventListener('pointercancel', () => { arrastando = null; });

// Mover a vista só faz sentido com o favo à mostra: dentro de um painel ou da
// escolha da primavera o arrasto pertence ao painel.
function podeMoverCamera() {
  return !ui.painel && !estado.escolha && !estado.derrota && !estado.vitoria;
}

// Duplo clique devolve o favo ao centro. É o desfazer do arrasto, e fica no
// fundo (não sobre uma célula) pra não somar dois toques num hexágono.
canvas.addEventListener('dblclick', (ev) => {
  if (!podeMoverCamera()) return;
  if (zonaEm(ev.clientX, ev.clientY)) return;
  centralizar();
});

canvas.addEventListener('wheel', (ev) => {
  if (ui.painel === 'campos') {
    ev.preventDefault();
    rolar(ev.deltaY);
    return;
  }
  // No PC a roda faz o mesmo que os botões: é o gesto que a pessoa tenta antes
  // de procurar um botão.
  if (!podeMoverCamera()) return;
  ev.preventDefault();
  aproximar(ev.deltaY < 0 ? 1 : -1);
}, { passive: false });

function aproximar(passos) {
  ui.camera.zoom = limitarZoom(ui.camera.zoom + ZOOM.passo * passos);
}

function centralizar() {
  ui.camera.x = 0;
  ui.camera.y = 0;
  ui.camera.zoom = 1;
}

function rolar(delta) {
  ui.rolagemCampos = Math.min(ui.rolagemMax, Math.max(0, ui.rolagemCampos + delta));
}

function aoTocar(x, y) {
  // Fim de partida: qualquer toque recomeça, ganhando ou perdendo.
  if (estado.derrota || estado.vitoria) {
    recomecar();
    return;
  }
  // Escolha da primavera: só as cartas respondem, e o fundo absorve o resto —
  // senão um toque distraído mexeria no favo com o jogo parado.
  if (estado.escolha) {
    const carta = zonaEm(x, y);
    if (carta?.id === 'bencao:escolher') relatar(escolherBencao(estado, carta.dados.id));
    return;
  }
  const alvo = zonaEm(x, y);
  if (alvo) {
    // Qualquer toque fora do balão da ninhada o fecha. Fecha aqui, e não por
    // uma zona de tela cheia, que sombrearia os botões do HUD.
    if (!alvo.id.startsWith('ninhada:')) ui.ovoSelecionado = null;
    tratarZona(alvo);
  } else {
    tratarFavo(x, y);
  }
}

function tratarZona(z) {
  switch (z.id) {
    case 'dica:fechar':
      fecharDica(estado);
      break;
    case 'camera:centrar':
      centralizar();
      break;
    case 'camera:mais':
      aproximar(1);
      break;
    case 'camera:menos':
      aproximar(-1);
      break;
    case 'inverno:recolher':
      relatar(recolherTodas(estado));
      break;
    case 'encomenda:cartao':
    case 'inverno:cartao':
      break;                      // absorve o toque dentro do cartão
    case 'vespa:guarda':
      relatar(enviarGuarda(estado));
      break;
    case 'pausa':
      estado.velocidade = estado.velocidade === 0 ? 1 : 0;
      break;
    case 'rapido':
      estado.velocidade = estado.velocidade > 1 ? 1 : 3;
      break;
    case 'velocidade':
      // Botão único do layout compacto: pausado → normal → rápido → pausado.
      estado.velocidade = estado.velocidade === 0 ? 1 : estado.velocidade === 1 ? 3 : 0;
      break;
    case 'pote':
    case 'mercado':
      ui.painel = ui.painel === 'rax' ? null : 'rax';
      break;
    case 'boosts':
      ui.painel = ui.painel === 'boosts' ? null : 'boosts';
      break;
    case 'boost:comprar':
      relatar(aplicarBoost(estado, z.dados.id));
      break;
    case 'campos':
      ui.painel = ui.painel === 'campos' ? null : 'campos';
      ui.rolagemCampos = 0;
      break;
    case 'menu':
      ui.painel = ui.painel === 'menu' ? null : 'menu';
      ui.confirmandoNovoJogo = false;
      break;
    case 'menu:desafio':
      ui.desafioEscolhido = z.dados.id;
      ui.confirmandoNovoJogo = false;
      break;
    case 'menu:novo':
      // Dois toques: o primeiro arma, o segundo apaga.
      if (ui.confirmandoNovoJogo) recomecar();
      else ui.confirmandoNovoJogo = true;
      break;
    case 'menu:fechar':
    case 'menu:fundo':
      ui.painel = null;
      ui.confirmandoNovoJogo = false;
      break;
    case 'campo:alocar':
      relatar(alocar(estado, z.dados.campo, z.dados.tipo, z.dados.delta));
      break;
    case 'melhorias:info':
      ui.ajudaMelhorias = z.dados.upgrade;
      break;
    case 'melhorias:fechar':
      ui.ajudaMelhorias = false;
      break;
    case 'campo:upgrade':
      relatar(comprarUpgrade(estado, z.dados.campo, z.dados.upgrade));
      break;
    case 'ninhada:selecionar':
      ui.ovoIndividual = z.dados.id;
      break;
    case 'ninhada:alimentar': {
      const celula = estado.celulas[z.dados.chave];
      const r = alimentarNinhada(estado, celula, z.dados.potes, z.dados.ovo);
      relatar(r);
      // Nasceu: o ovo virou célula vazia e o balão perde o objeto.
      if (r.ok && r.nasceu) { ui.ovoIndividual = null; if (celula.estado !== 'ovo') ui.ovoSelecionado = null; }
      break;
    }
    case 'ninhada:cartao':
      break;                      // absorve o toque dentro do balão
    case 'campos:fechar':
    case 'campos:fundo':
      ui.painel = null;
      break;
    case 'rax:vender':
      relatar(vender(estado, z.dados.variedade, relogio(estado.decorrido).estacao, 1));
      break;
    case 'rax:fechar':
    case 'rax:fundo':
      ui.painel = null;
      break;
    default:
      break; // 'rax:cartao' e afins apenas absorvem o toque
  }
}

// Fora da UI, o toque cai no favo. O hit-test vai de pixel para coordenada
// axial em vez de testar retângulo por célula — exato e independente do zoom.
function tratarFavo(x, y) {
  const { cx, cy, tam } = geometriaFavo(estado, L, A, ui.camera);
  const { q, r } = dePixel(x - cx, y - cy, tam);
  const celula = estado.celulas[chave(q, r)];
  if (!celula) {
    ui.ovoSelecionado = null;
    return;
  }

  if (celula.estado === 'travada') relatar(comprarCelula(estado, celula));
  else if (celula.estado === 'madura') relatar(colher(estado, celula));
  else if (celula.estado === 'ovo') ui.ovoSelecionado = chave(q, r);
  else ui.ovoSelecionado = null;
}

function relatar(resultado) {
  if (resultado && !resultado.ok) avisar(estado, resultado.motivo);
}

function recomecar() {
  apagar();
  centralizar();
  estado = novoJogo(undefined, ui.desafioEscolhido ?? undefined);
  ui.painel = null;
  ui.ajudaMelhorias = false;
  ui.confirmandoNovoJogo = false;
  ui.salvoEm = null;
  ui.saveFalhou = false;
  window.colmeia = estado;
}

// ------------------------------------------------------------------ save

let desdeUltimoSave = 0;

function gravar() {
  const ok = salvar(estado);
  ui.saveFalhou = !ok;
  if (ok) ui.salvoEm = Date.now();
  desdeUltimoSave = 0;
}

// Sair da aba é o momento mais provável de perder progresso.
window.addEventListener('pagehide', gravar);
window.addEventListener('beforeunload', gravar);

// ------------------------------------------------------------- visibilidade

// Com a aba oculta o jogo fica parado — nada de progresso offline. O navegador
// às vezes só reduz o `requestAnimationFrame` em vez de suspendê-lo, então o
// laço checa `document.hidden` em vez de confiar nisso.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    gravar();
    return;
  }
  // Zera o relógio do quadro: sem isso o primeiro quadro na volta traria o
  // intervalo inteiro em que a aba esteve escondida.
  anterior = performance.now();
  acumulado = 0;
});

// ------------------------------------------------------------------ laço

let acumulado = 0;
let anterior = performance.now();

function quadro(agora) {
  const bruto = Math.min((agora - anterior) / 1000, MAX_QUADRO);
  anterior = agora;

  if (!document.hidden) {
    acumulado += bruto * estado.velocidade;
    let guarda = 0;
    while (acumulado >= TICK && guarda++ < 240) {
      passo(estado, TICK);
      acumulado -= TICK;
    }

    desdeUltimoSave += bruto;
    if (desdeUltimoSave >= INTERVALO_SALVAR) gravar();
  }

  // Abaixo disso o layout do HUD produz larguras negativas; nada a desenhar.
  if (L > 320 && A > 240) desenhar(ctx, estado, L, A, bruto, ui);
  requestAnimationFrame(quadro);
}
requestAnimationFrame(quadro);

// Ponte para depurar economia no console sem abrir o código.
window.colmeia = estado;
// A vista também: enquadramento e painéis abertos moram aqui, não no estado.
window.colmeiaUi = ui;
