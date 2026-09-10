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
  alimentarNinhada, avisar, recolherTodas, alugar, misturar,
} from './sim/acoes.js';
import { escolherBencao } from './sim/bencaos.js';
import { fecharDica } from './sim/dicas.js';
import { coroarRainha } from './sim/acoes.js';
import { vedarEntrada } from './sim/formigas.js';
import { registrarVitoria, registrarAno } from './core/conquistas.js';
import { acordarSom, atualizarSom, tocar, alternarMudo, pausarSom } from './render/som.js';
import { alternarMinimizado } from './ui/cartao.js';
import { avisosAtivos } from './sim/avisos.js';
import { DESAFIO_PADRAO } from './sim/desafios.js';
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
  // Quais cartões o jogador encolheu. Enquadramento, não estado de jogo.
  minimizados: {},
  // Avisos que ele já abriu: é o que faz o sino parar de piscar.
  avisosVistos: [],
  // 'inicio' enquanto a tela de abertura estiver aberta; 'jogo' depois. O
  // relógio da simulação só anda em 'jogo'.
  tela: 'inicio',
  temSave: false,
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
  ui.temSave = true;
  ui.desafioEscolhido = estado.desafio ?? DESAFIO_PADRAO;
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
  // Política de autoplay: o áudio só pode nascer dentro de um gesto.
  acordarSom();
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
  if (ui.tela === 'inicio') {
    const alvo = zonaEm(x, y);
    if (alvo) tratarInicio(alvo);
    return;
  }
  // Fim de partida: qualquer toque volta para a tela de início, com a colmeia
  // encerrada ainda no lugar — quem quiser recomeçar decide lá.
  if (estado.derrota || estado.vitoria) {
    ui.tela = 'inicio';
    ui.painel = null;
    return;
  }
  // Escolha da primavera: só as cartas respondem, e o fundo absorve o resto —
  // senão um toque distraído mexeria no favo com o jogo parado.
  if (estado.escolha) {
    const carta = zonaEm(x, y);
    // A dica fica por cima do modal e tem que poder sair da frente.
    if (carta?.id === 'dica:fechar') fecharDica(estado);
    else if (carta?.id === 'bencao:escolher') relatar(escolherBencao(estado, carta.dados.id));
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

function tratarInicio(z) {
  switch (z.id) {
    case 'inicio:continuar':
      ui.tela = 'jogo';
      break;
    case 'inicio:novo':
      recomecar();
      ui.tela = 'jogo';
      break;
    case 'inicio:desafio':
      ui.desafioEscolhido = z.dados.id;
      break;
    case 'inicio:som':
      alternarMudo();
      break;
    default:
      break;                      // o cartão e o fundo absorvem o toque
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
    case 'cartao:alternar':
      alternarMinimizado(ui, z.dados.id);
      break;
    case 'formigas:vedar':
      relatar(vedarEntrada(estado));
      break;
    case 'formigas:cartao':
    case 'enxame:cartao':
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
      // 3 → 6 → 10 → 1. Do Ano 6 em diante 3× já parece devagar, e o passo
      // fixo de 1/30 s aguenta: a 10× são cinco passos por quadro a 60 fps.
      estado.velocidade = proximaVelocidade(estado.velocidade);
      break;
    case 'velocidade':
      // Botão único do layout compacto: pausado → 1× → 3× → 6× → 10× → pausado.
      estado.velocidade = estado.velocidade === 0 ? 1
        : estado.velocidade === 10 ? 0 : proximaVelocidade(estado.velocidade);
      break;
    case 'pote':
    case 'mercado':
      ui.painel = ui.painel === 'rax' ? null : 'rax';
      break;
    case 'avisos':
      ui.painel = ui.painel === 'avisos' ? null : 'avisos';
      // Abrir marca tudo como visto: o sino para de piscar até chegar algo
      // que ainda não estava lá.
      if (ui.painel === 'avisos') ui.avisosVistos = avisosAtivos(estado);
      break;
    case 'avisos:fundo':
      ui.painel = null;
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
    case 'rainha:coroar':
      relatar(coroarRainha(estado));
      break;
    case 'rainha:fechar':
    case 'rainha:fundo':
      ui.painel = null;
      break;
    case 'rainha:cartao':
      break;                      // absorve o toque dentro do cartão
    case 'menu:som':
      alternarMudo();
      break;
    case 'menu:historico':
      ui.painel = 'historico';
      break;
    case 'historico:fechar':
    case 'historico:fundo':
      ui.painel = 'menu';
      break;
    case 'historico:cartao':
      break;                      // absorve o toque dentro da tabela
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
    case 'aluguel:enviar':
      relatar(alugar(estado));
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
    case 'rax:misturar':
      relatar(misturar(estado));
      break;
    case 'rax:vender': {
      const r = vender(estado, z.dados.variedade, relogio(estado.decorrido).estacao, 1);
      if (r.ok) tocar('vender');
      relatar(r);
      break;
    }
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

  if (celula.estado === 'rainha') ui.painel = 'rainha';
  else if (celula.estado === 'travada') relatar(comprarCelula(estado, celula));
  else if (celula.estado === 'madura') {
    const r = colher(estado, celula);
    if (r.ok) tocar('colher');
    relatar(r);
  }
  else if (celula.estado === 'ovo') ui.ovoSelecionado = chave(q, r);
  else ui.ovoSelecionado = null;
}

const VELOCIDADES = [1, 3, 6, 10];

function proximaVelocidade(atual) {
  const i = VELOCIDADES.indexOf(atual);
  return VELOCIDADES[(i + 1) % VELOCIDADES.length] ?? 1;
}

function relatar(resultado) {
  if (resultado && !resultado.ok) {
    avisar(estado, resultado.motivo);
    tocar('aviso');
  }
}

function recomecar() {
  apagar();                     // só a partida: conquistas ficam
  centralizar();
  ui.temSave = false;
  vitoriaRegistrada = false;
  ultimoAnoVisto = 0;
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
let vitoriaRegistrada = false;
let ultimoAnoVisto = 0;

function gravar() {
  const ok = salvar(estado);
  ui.saveFalhou = !ok;
  if (ok) ui.salvoEm = Date.now();
  desdeUltimoSave = 0;
}

// Sair da aba é o momento mais provável de perder progresso.
// Sair da aba é o momento mais provável de perder progresso — mas não há o
// que salvar se o jogador nem entrou na partida.
const gravarSeJogando = () => { if (ui.tela === 'jogo') gravar(); };
window.addEventListener('pagehide', gravarSeJogando);
window.addEventListener('beforeunload', gravarSeJogando);

// ------------------------------------------------------------- visibilidade

// Com a aba oculta o jogo fica parado — nada de progresso offline. O navegador
// às vezes só reduz o `requestAnimationFrame` em vez de suspendê-lo, então o
// laço checa `document.hidden` em vez de confiar nisso.
document.addEventListener('visibilitychange', () => {
  pausarSom(document.hidden);
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

  if (!document.hidden && ui.tela === 'jogo') {
    acumulado += bruto * estado.velocidade;
    let guarda = 0;
    while (acumulado >= TICK && guarda++ < 240) {
      passo(estado, TICK);
      acumulado -= TICK;
    }

    // Conquistas sobrevivem ao recomeço, então são gravadas fora do save.
    if (estado.vitoria && !vitoriaRegistrada) {
      vitoriaRegistrada = true;
      registrarVitoria();
    }
    if (estado.ano !== ultimoAnoVisto) {
      ultimoAnoVisto = estado.ano;
      registrarAno(estado.ano);
    }

    desdeUltimoSave += bruto;
    if (desdeUltimoSave >= INTERVALO_SALVAR) gravar();
    ui.temSave = true;
  }

  // Abaixo disso o layout do HUD produz larguras negativas; nada a desenhar.
  atualizarSom(estado);
  if (L > 320 && A > 240) desenhar(ctx, estado, L, A, bruto, ui);
  requestAnimationFrame(quadro);
}
requestAnimationFrame(quadro);

// Ponte para depurar economia no console sem abrir o código.
window.colmeia = estado;
// A vista também: enquadramento e painéis abertos moram aqui, não no estado.
window.colmeiaUi = ui;
