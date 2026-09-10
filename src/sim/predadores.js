import { sortear } from '../core/rng.js';
import { melhorPara } from './talentos.js';
import { mostrarDica } from './dicas.js';
import { tentarEvento } from './eventos.js';
export const VESPAS = { aviso: 20, guardas: 2, intervaloMin: 240, intervaloMax: 390 };
export function enviarGuarda(estado) {
  if (!estado.ameaca) return { ok: false, motivo: 'Nenhuma vespa por perto.' };
  const guardas = estado.abelhas.filter(a => a.guarda);
  if (guardas.length >= VESPAS.guardas) return { ok: false, motivo: 'A defesa já está completa.' };
  const reservadas = estado.campos.reduce((n,c) => n+c.alocadas+c.polenAlocadas,0);
  const disponiveis = estado.abelhas.filter(a => a.papel === 'operaria' && a.estado !== 'alugada' && !a.guarda);
  // A vaga de guarda é da guardiã, quando há uma em casa.
  const livre = melhorPara(disponiveis.filter(a => a.estado === 'colmeia'), 'defesa');
  if (!livre || disponiveis.length <= reservadas) return { ok: false, motivo: 'Recolha uma coletora nos campos para defender.' };
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
    // (220 s) é maior que o trecho de ano que sobra antes do inverno seguinte
    // (180 s) — a vespa era adiada para sempre.
    estado.proximoAtaque = Math.max(estado.proximoAtaque,
      estado.decorrido + t.restamSegundos);
    return;
  }
  if (!estado.ameaca) {
    // Não iniciar um ataque que atravessaria a chegada do inverno.
    if (estado.decorrido < estado.proximoAtaque || (t.estacao.id === 'outono' && t.restamSegundos <= VESPAS.aviso)) return;
    if (!tentarEvento(estado, (espera) => { estado.proximoAtaque = estado.decorrido + espera; })) {
      return;
    }
    estado.ameaca = { resta: VESPAS.aviso };
    mostrarDica(estado, 'vespa');
    return;
  }
  estado.ameaca.resta -= dt;
  if (estado.ameaca.resta > 0) return;
  const protegida = estado.abelhas.filter(a => a.guarda).length >= VESPAS.guardas;
  let texto = 'As guardiãs espantaram a vespa!';
  if (!protegida) {
    const vitima = estado.abelhas.find(a => a.papel === 'operaria' && ['indo','coletando','voltando'].includes(a.estado));
    if (vitima) {
      estado.abelhas = estado.abelhas.filter(a => a !== vitima);
      const campo = estado.campos.find(c => c.id === vitima.campo);
      const turma = vitima.recurso === 'polen' ? 'polenAlocadas' : 'alocadas';
      if (campo) campo[turma] = Math.max(0,campo[turma]-1);
      texto = 'A vespa matou uma coletora.';
    } else texto = 'Todas em casa: a vespa foi embora.';
  }
  for (const a of estado.abelhas) if (a.guarda) a.guarda = false;
  estado.ameaca = null;
  estado.proximoAtaque = estado.decorrido + VESPAS.intervaloMin + sortear(estado)*(VESPAS.intervaloMax-VESPAS.intervaloMin);
  estado.aviso = { texto, expira: estado.decorrido + 6 };
}
