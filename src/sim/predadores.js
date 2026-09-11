import { sortear } from '../core/rng.js';
import { mostrarDica } from './dicas.js';
import { tentarEvento } from './eventos.js';
import { VARIEDADES } from './economia.js';
import { especieDefende } from './biomas.js';

// Vespas. Antes o ataque era abstrato: um relógio corria, o jogador mandava
// duas abelhas "de guarda", e no fim uma coletora **que estava no campo**
// morria. Era estranho por dois motivos — a vespa nunca aparecia na tela, e
// quem morria era quem estava longe de casa.
//
// Agora a vespa invade. Ela vem voando até a entrada da colmeia, e quem
// defende é quem está **dentro**: as guardiãs, que já nascem com esse pendor,
// param na porta sozinhas. O jogador não precisa mandar ninguém — mas pode
// pôr mais alguém na porta se as guardiãs não bastarem.
//
// Isso vira a decisão de cabeça pra baixo, de propósito: colmeia vazia é
// colmeia indefesa. Deixar todo mundo no campo rende néctar e deixa a porta
// aberta.
//
// Três fases, e a `ameaca` guarda em qual está:
//
//   aviso — as vespas foram avistadas; dá tempo de recolher gente
//   voo   — elas atravessam a tela até a entrada
//   luta  — o que acontece na porta; o estrago é aplicado no fim
export const VESPAS = {
  aviso: 22,
  voo: 9,
  luta: 5,
  intervaloMin: 240,
  intervaloMax: 390,
  // Quantas vêm por ataque. Cresce com o ano: no Ano 1 vem uma, e o teto sobe
  // devagar até três. Uma colmeia de vinte abelhas não pode temer uma vespa
  // só pelo resto do jogo.
  minimo: 1,
  maximo: 3,
  porAno: 0.34,
};

function quantasVespas(estado) {
  const teto = Math.min(VESPAS.maximo,
    VESPAS.minimo + Math.floor(Math.max(0, (estado.ano ?? 1) - 1) * VESPAS.porAno));
  return VESPAS.minimo + Math.floor(sortear(estado) * (teto - VESPAS.minimo + 1));
}

// Quem está na porta. Guardiã em casa entra sozinha — é o pendor dela, e o
// jogador não deveria ter que lembrar disso toda vez. `guarda` é o reforço
// que ele pôs à mão.
export function defensoras(estado) {
  // Abelha sem ferrão não para vespa na porta: no bioma dela, a defesa é
  // manter gente dentro, não montar guarda.
  if (!especieDefende(estado)) return [];
  return (estado.abelhas ?? []).filter((a) => a.papel === 'operaria'
    && a.estado === 'colmeia'
    && (a.guarda || a.talento === 'defesa'));
}

// Quantas vespas ainda passariam. É o número que o cartão mostra.
export function vespasSemDefesa(estado) {
  if (!estado.ameaca) return 0;
  return Math.max(0, estado.ameaca.vespas.length - defensoras(estado).length);
}

// Reforço: põe mais uma operária de casa na porta. Continua existindo porque
// nem toda colmeia tem guardiã na hora certa — mas agora é reforço, não a
// única defesa.
export function enviarGuarda(estado) {
  if (!estado.ameaca) return { ok: false, motivo: 'Nenhuma vespa por perto.' };
  // Sem ferrão não há o que pôr na porta: o botão some em vez de não fazer nada.
  if (!especieDefende(estado)) {
    return { ok: false, motivo: 'Esta abelha não tem ferrão: recolha as coletoras.' };
  }
  if (estado.ameaca.fase === 'luta') return { ok: false, motivo: 'Tarde demais: já estão na porta.' };
  if (!vespasSemDefesa(estado)) return { ok: false, motivo: 'A porta já está coberta.' };

  const naPorta = new Set(defensoras(estado));
  const livre = (estado.abelhas ?? []).find((a) => a.papel === 'operaria'
    && a.estado === 'colmeia' && !naPorta.has(a));
  if (!livre) return { ok: false, motivo: 'Não há abelha em casa. Recolha uma turma dos campos.' };

  livre.guarda = true;
  livre.trabalho = null;
  livre.t = 0;
  return { ok: true };
}

export function atualizarPredadores(estado, t, dt) {
  if (estado.proximoAtaque == null) estado.proximoAtaque = estado.decorrido + VESPAS.intervaloMin;

  if (t.estacao.id === 'inverno') {
    estado.ameaca = null;
    for (const a of estado.abelhas) if (a.guarda) a.guarda = false;
    // Só empurra para depois do inverno, sem zerar o relógio: reagendar um
    // intervalo inteiro aqui tornava o ataque impossível, porque o intervalo
    // é maior que o trecho de ano que sobra antes do inverno seguinte — a
    // vespa era adiada para sempre.
    estado.proximoAtaque = Math.max(estado.proximoAtaque, estado.decorrido + t.restamSegundos);
    return;
  }

  if (!estado.ameaca) {
    // Não iniciar um ataque que atravessaria a chegada do inverno.
    if (estado.decorrido < estado.proximoAtaque) return;
    if (t.estacao.id === 'outono' && t.restamSegundos <= VESPAS.aviso + VESPAS.voo) return;
    if (!tentarEvento(estado, (espera) => { estado.proximoAtaque = estado.decorrido + espera; })) return;

    const quantas = quantasVespas(estado);
    estado.ameaca = {
      fase: 'aviso',
      resta: VESPAS.aviso,
      vespas: Array.from({ length: quantas }, (_, i) => ({
        id: i,
        // Faixa de entrada: espalha as vespas na borda pra não virem
        // empilhadas uma em cima da outra.
        faixa: (i + 0.5) / quantas + (sortear(estado) - 0.5) * 0.12,
        t: 0,
        estado: 'esperando',
      })),
      barradas: 0,
      baixas: 0,
      levou: 0,
    };
    mostrarDica(estado, 'vespa');
    return;
  }

  const ameaca = estado.ameaca;
  ameaca.resta -= dt;

  if (ameaca.fase === 'voo') {
    const passado = 1 - Math.max(0, ameaca.resta) / VESPAS.voo;
    for (const v of ameaca.vespas) if (v.estado === 'voando') v.t = Math.min(1, passado);
  }

  if (ameaca.resta > 0) return;

  if (ameaca.fase === 'aviso') {
    ameaca.fase = 'voo';
    ameaca.resta = VESPAS.voo;
    for (const v of ameaca.vespas) v.estado = 'voando';
    return;
  }

  if (ameaca.fase === 'voo') {
    resolverPorta(estado, ameaca);
    ameaca.fase = 'luta';
    ameaca.resta = VESPAS.luta;
    return;
  }

  aplicarEstrago(estado, ameaca);
}

// Na chegada: cada defensora segura uma vespa. As que sobram entram. O
// estrago só acontece no fim da luta — aqui só se decide quem passou.
function resolverPorta(estado, ameaca) {
  const naPorta = defensoras(estado);
  ameaca.barradas = Math.min(naPorta.length, ameaca.vespas.length);
  ameaca.vespas.forEach((v, i) => {
    v.estado = i < ameaca.barradas ? 'lutando' : 'dentro';
    v.t = 1;
  });
}

function aplicarEstrago(estado, ameaca) {
  const dentro = ameaca.vespas.filter((v) => v.estado === 'dentro').length;
  let mortas = 0;
  let levou = 0;

  for (let i = 0; i < dentro; i++) {
    // Quem morre é quem está em casa: a vespa entrou no favo. As que estão
    // no campo escaparam — e é essa a inversão em relação à regra antiga.
    const naPorta = new Set(defensoras(estado));
    const vitima = estado.abelhas.find((a) => a.papel === 'operaria'
      && a.estado === 'colmeia' && !naPorta.has(a));
    if (vitima) {
      estado.abelhas = estado.abelhas.filter((a) => a !== vitima);
      mortas++;
      continue;
    }
    // Colmeia sem ninguém dentro: a vespa saqueia o vidro em vez de matar.
    const baratas = Object.keys(VARIEDADES)
      .sort((a, b) => VARIEDADES[a].base - VARIEDADES[b].base)
      .find((v) => Math.floor(estado.pote[v] ?? 0) >= 1);
    if (baratas) { estado.pote[baratas] -= 1; levou++; }
  }

  for (const a of estado.abelhas) if (a.guarda) a.guarda = false;
  estado.ameaca = null;
  estado.proximoAtaque = estado.decorrido + VESPAS.intervaloMin
    + sortear(estado) * (VESPAS.intervaloMax - VESPAS.intervaloMin);
  estado.aviso = { texto: textoDoAtaque(ameaca.barradas, mortas, levou), expira: estado.decorrido + 6 };
}

function textoDoAtaque(barradas, mortas, levou) {
  if (!mortas && !levou) {
    return barradas === 1 ? 'A guardiã barrou a vespa na porta!'
      : `As guardiãs barraram ${barradas} vespas na porta!`;
  }
  const partes = [];
  if (mortas) partes.push(`${mortas === 1 ? 'matou uma abelha' : `matou ${mortas} abelhas`}`);
  if (levou) partes.push(`${levou === 1 ? 'levou 1 pote' : `levou ${levou} potes`}`);
  const dano = partes.join(' e ');
  return barradas ? `Barrou ${barradas}, mas a vespa ${dano}.` : `A vespa entrou e ${dano}.`;
}
