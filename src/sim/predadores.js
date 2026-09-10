import { sortear } from '../core/rng.js';
export const VESPAS = { aviso: 20, guardas: 2, intervaloMin: 100, intervaloMax: 160 };
export function enviarGuarda(estado) {
  if (!estado.ameaca) return { ok: false, motivo: 'Nenhuma vespa por perto.' };
  const guardas = estado.abelhas.filter(a => a.guarda);
  if (guardas.length >= VESPAS.guardas) return { ok: false, motivo: 'A defesa já está completa.' };
  const reservadas = estado.campos.reduce((n,c) => n+c.alocadas+c.polenAlocadas,0);
  const disponiveis = estado.abelhas.filter(a => a.papel === 'operaria' && a.estado !== 'alugada' && !a.guarda);
  const livre = disponiveis.find(a => a.estado === 'colmeia');
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
    estado.proximoAtaque = estado.decorrido + VESPAS.intervaloMin;
    return;
  }
  if (!estado.ameaca) {
    // Não iniciar um ataque que atravessaria a chegada do inverno.
    if (estado.decorrido < estado.proximoAtaque || (t.estacao.id === 'outono' && t.restamSegundos <= VESPAS.aviso)) return;
    estado.ameaca = { resta: VESPAS.aviso };
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
