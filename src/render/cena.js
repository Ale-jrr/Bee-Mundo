import { desenharAjuda } from '../ui/ajuda.js';
import { desenharPredador } from '../ui/predadores.js';
import { relogio } from '../sim/estacoes.js';
import { paletaAtual } from './paleta.js';
import { desenharFavo, desenharAbelha, centroDaCelula, geometriaFavo } from './favo.js';
import { desenharParticulas } from './particulas.js';
import { desenharVespas } from './vespas.js';
import { desenharOrnamentos } from './ornamentos.js';
import { retanguloArredondado, rotulo } from './desenho.js';
import { desenharHud } from '../ui/hud.js';
import { desenharRax } from '../ui/rax.js';
import { desenharDerrota, desenharVitoria } from '../ui/fim.js';
import { desenharCampos } from '../ui/campos.js';
import { desenharMenu } from '../ui/menu.js';
import { desenharHistorico } from '../ui/historico.js';
// Apelidado: `cena.js` já tem uma `desenharAbelhas` local, que é a das
// abelhas andando no favo. Esta é o painel do elenco.
import { desenharAbelhas as desenharPainelAbelhas } from '../ui/abelhas.js';
import { desenharRainha } from '../ui/rainha.js';
import { desenharInicio } from '../ui/inicio.js';
import { desenharTutorial } from '../ui/tutorial.js';
import { desenharNinhada } from '../ui/ninhada.js';
import { desenharInverno } from '../ui/inverno.js';
import { desenharEncomenda } from '../ui/encomenda.js';
import { desenharEnxame } from '../ui/enxame.js';
import { desenharFormigas } from '../ui/formigas.js';
import { desenharEscolha } from '../ui/bencaos.js';
import { desenharCamera } from '../ui/camera.js';
import { desenharDica } from '../ui/dicas.js';
import { limparZonas, zona } from '../ui/zonas.js';
import { medidas, areaDoPote } from '../ui/layout.js';

// O fundo do painel de avisos absorve o toque de fora: tocar no escuro fecha.
function zonaFundoAvisos(L, A) {
  zona('avisos:fundo', 0, 0, L, A);
}

export function desenhar(ctx, estado, L, A, dt, ui = {}) {
  limparZonas();
  const t = relogio(estado.decorrido);
  const pal = paletaAtual(t);

  // Fundo: gradiente radial suave, mais claro no alto à esquerda.
  const g = ctx.createRadialGradient(L * 0.35, A * 0.2, 40, L * 0.5, A * 0.5, Math.max(L, A) * 0.95);
  g.addColorStop(0, pal.css('fundo'));
  g.addColorStop(1, pal.css('fundoFim'));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, L, A);

  desenharParticulas(ctx, pal, t, L, A, dt);

  const { cx, cy, tam } = geometriaFavo(estado, L, A, ui.camera);
  // Enfeites atrás do favo: crescem com o que o jogador conquistou.
  desenharOrnamentos(ctx, estado, pal, cx, cy, tam);
  desenharFavo(ctx, estado, pal, cx, cy, tam);
  desenharAbelhas(ctx, estado, pal, cx, cy, tam, L, A);
  desenharAbelhasNoCampo(ctx, estado, pal, cx, cy, tam, L, A);
  // Depois das abelhas: a vespa passa por cima delas, que é a leitura certa
  // de quem está invadindo.
  desenharVespas(ctx, estado, pal, cx, cy, tam, L, A);
  desenharHud(ctx, estado, pal, t, L, A, ui);
  // Os cartões de aviso não moram mais na tela: cinco empilhados cobriam o
  // favo, que é o que o jogador quer ver. Agora ficam atrás do sino e só
  // aparecem quando ele abre.
  if (ui.painel === 'avisos') {
    ctx.fillStyle = 'rgba(30, 22, 10, 0.45)';
    ctx.fillRect(0, 0, L, A);
    zonaFundoAvisos(L, A);
    // Mesma ordem de `sim/avisos.js`: o que tem relógio correndo vem primeiro.
    let rodape = null;
    rodape = desenharEnxame(ctx, estado, pal, L, A, rodape, ui) ?? rodape;
    rodape = desenharFormigas(ctx, estado, pal, L, A, rodape, ui) ?? rodape;
    rodape = desenharPredador(ctx, estado, pal, L, A, ui, rodape) ?? rodape;
    rodape = desenharInverno(ctx, estado, pal, L, A, ui, rodape) ?? rodape;
    desenharEncomenda(ctx, estado, pal, L, A, rodape, ui);
  }
  desenharNinhada(ctx, estado, pal, L, A, ui);
  desenharCamera(ctx, pal, L, A, ui);
  desenharAviso(ctx, estado, pal, L, A);

  if (ui.painel === 'rax') desenharRax(ctx, estado, pal, t, L, A);
  if (ui.painel === 'campos') desenharCampos(ctx, estado, pal, t, L, A, ui);
  if (ui.painel === 'menu') desenharMenu(ctx, estado, pal, L, A, ui);
  if (ui.painel === 'historico') desenharHistorico(ctx, estado, pal, L, A);
  if (ui.painel === 'abelhas') desenharPainelAbelhas(ctx, estado, pal, L, A);
  if (ui.painel === 'rainha') desenharRainha(ctx, estado, pal, L, A);
  if (ui.ajudaMelhorias) desenharAjuda(ctx, pal, L, A, ui.ajudaMelhorias);
  // Depois dos painéis e antes do fim de partida: a escolha da primavera é
  // modal e precisa capturar o toque de qualquer coisa que esteja aberta.
  desenharEscolha(ctx, estado, pal, L, A);

  // A dica vem por cima de tudo, inclusive da escolha da primavera: ela existe
  // justamente pra explicar o que está na tela naquele momento.
  desenharDica(ctx, estado, pal, L, A, ui);
  if (estado.derrota) desenharDerrota(ctx, estado, pal, L, A);
  if (estado.vitoria) desenharVitoria(ctx, estado, pal, L, A);
  // A tela de início vem **por último**, por cima até do fim de partida:
  // desenhada antes, ela ficava escondida atrás da tela de derrota, que ainda
  // por cima registra uma zona de tela inteira — o jogador via "não
  // sobreviveu", tocava, e nada acontecia.
  // O tutorial fica acima de qualquer painel — o passo costuma mandar abrir um
  // — mas abaixo da tela de início, que é a única sempre por cima.
  if (ui.tela === 'jogo') desenharTutorial(ctx, estado, pal, L, A, ui);
  if (ui.tela === 'inicio') desenharInicio(ctx, estado, pal, L, A, ui);

  return { t, pal, cx, cy };
}

// Abelhas em viagem de coleta: saem do favo rumo aos campos e voltam. Antes
// elas simplesmente sumiam da tela enquanto estavam fora, e o jogador não tinha
// como ver que metade da colônia estava trabalhando.
function desenharAbelhasNoCampo(ctx, estado, pal, cx, cy, tam, L, A) {
  const suave = (t) => t * t * (3 - 2 * t);
  const campo = { x: L + tam * 0.8, y: A * 0.78 };

  for (const abelha of estado.abelhas) {
    let fracao;
    if (abelha.estado === 'indo') fracao = abelha.t;
    else if (abelha.estado === 'voltando') fracao = 1 - abelha.t;
    else continue;

    const partida = estado.celulas[abelha.de];
    if (!partida) continue;
    const p = centroDaCelula(partida, cx, cy, tam);
    const f = suave(Math.min(1, Math.max(0, fracao)));

    const x = p.x + (campo.x - p.x) * f;
    const y = p.y + (campo.y - p.y) * f;
    // Encolhe e desbota com a distância, pra leitura de profundidade.
    const escala = (tam / 90) * (1 - 0.35 * f);

    ctx.save();
    ctx.globalAlpha = 1 - 0.45 * f;
    desenharAbelha(ctx, x, y, escala, pal, false, null, abelha.talento);
    ctx.restore();
  }
}

// Aviso efêmero (abelha perdida, compra sem moeda) logo abaixo da barra.
function desenharAviso(ctx, estado, pal, L, A) {
  const aviso = estado.aviso;
  if (!aviso || estado.decorrido > aviso.expira) return;
  const restante = aviso.expira - estado.decorrido;
  ctx.save();
  ctx.globalAlpha = Math.min(1, restante);
  retanguloArredondado(ctx, L / 2 - 170, 96, 340, 40, 20);
  ctx.fillStyle = pal.css('escuro', 0.85);
  ctx.fill();
  rotulo(ctx, aviso.texto, L / 2, 116, {
    tamanho: 12, cor: pal.css('hud'), espaco: 2.2, alinhar: 'center',
  });
  ctx.restore();
}

// Abelhas de dentro caminham pelo favo: a posição vem da simulação (`de`,
// `para`, `andar`), então o que se vê é o que o jogo está de fato fazendo — a
// rainha põe ovo exatamente na célula onde ela parou.
function desenharAbelhas(ctx, estado, pal, cx, cy, tam, L, A) {
  const suave = (t) => t * t * (3 - 2 * t);

  for (const abelha of estado.abelhas) {
    if (abelha.estado !== 'colmeia' && abelha.estado !== 'rainha') continue;

    const de = estado.celulas[abelha.de];
    const para = estado.celulas[abelha.para] ?? de;
    if (!de) continue;

    const a = centroDaCelula(de, cx, cy, tam);
    const b = centroDaCelula(para, cx, cy, tam);
    const k = suave(Math.min(1, Math.max(0, abelha.andar)));
    const x = a.x + (b.x - a.x) * k;
    const y = a.y + (b.y - a.y) * k;

    // Sobe um pouco no meio do trajeto: dá a impressão de voo curto em vez de
    // deslizar pelo favo.
    const voo = Math.sin(k * Math.PI) * tam * 0.16;
    const flutua = Math.sin(performance.now() / 600 + abelha.id * 1.7) * 4 * (tam / 84);

    // A barrinha só aparece durante uma tarefa: pegar pólen ou curar mel.
    const progresso = abelha.trabalho ? abelha.t : null;

    // Comendo: ela sai do favo, vai até o vidro de mel e volta. O mel sai do
    // pote do jogador, então é pra lá que ela vai buscar.
    if (abelha.trabalho?.tipo === 'comer') {
      const m = medidas(L, A);
      const pote = areaDoPote(m);
      const alvo = { x: pote.x + pote.l / 2, y: pote.y + pote.a * 0.45 };
      const ida = Math.min(1, abelha.t / 0.3);
      const volta = Math.max(0, (abelha.t - 0.7) / 0.3);
      const f = suave(ida) - suave(volta);
      desenharAbelha(ctx, x + (alvo.x - x) * f, y + (alvo.y - y) * f,
        tam / 90, pal, abelha.papel === 'rainha', progresso, abelha.talento);
      continue;
    }

    desenharAbelha(ctx, x, y - voo + flutua, tam / 90, pal,
      abelha.papel === 'rainha', progresso, abelha.talento);
  }
}
