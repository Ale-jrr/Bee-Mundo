import { novoJogo } from '../src/core/estado.js';
import * as A from '../src/sim/acoes.js';
import * as S from '../src/core/save.js';
import { passo } from '../src/sim/tick.js';

// Sem localStorage: pode rodar no navegador sem modificar a partida salva.
export function rodar() {
  let total = 0;
  const detalhes = [];
  const ok = (nome, valor) => { total++; if (!valor) detalhes.push(nome); };
  const cenario = () => {
    const s = novoJogo(42);
    s.campos.forEach(c => { c.alocadas = 0; c.polenAlocadas = 0; });
    return s;
  };
  let s = cenario();
  let c = Object.values(s.celulas).find(c => c.estado === 'vazia');
  Object.assign(c, { estado: 'ovo', ninhada: 3, cura: 0.95 });
  const inicial = s.abelhas.length;
  A.alimentarNinhada(s, c, 1);
  ok('alimentação faz nascer só o ovo escolhido', s.abelhas.length === inicial + 1);
  ok('outros ovos permanecem incubando', c.estado === 'ovo' && c.ninhada === 2 && c.ovos.every(o => o.cura === 0.95));
  ok('alimentação cobra um pote', s.pote.silvestre === 2);
  ok('ids únicos após nascimento', new Set(s.abelhas.map(a => a.id)).size === s.abelhas.length);
  s = cenario(); s.nivel = 10;
  ok('primeira reserva aceita', A.alocar(s, s.campos[0].id, 'nectar', 2).ok);
  ok('segunda reserva excedente recusada', !A.alocar(s, s.campos[1].id, 'polen', 1).ok);
  ok('recusa não muda reserva', s.campos[1].polenAlocadas === 0);
  ok('aluguel respeita reservas', !A.alugar(s).ok);
  A.alocar(s, s.campos[0].id, 'nectar', -1);
  ok('reserva liberada permite aluguel', A.alugar(s).ok);
  ok('alugada não conta como disponível', !A.alocar(s, s.campos[1].id, 'nectar', 1).ok);
  s.campos[1].alocadas = 3;
  ok('reserva antiga excessiva pode diminuir', A.alocar(s, s.campos[1].id, 'nectar', -1).ok);
  s = cenario();
  c = Object.values(s.celulas).find(c => c.estado === 'vazia');
  Object.assign(c, { estado: 'nectar', nectar: 9, variedade: 'silvestre' });
  const a = s.abelhas[1];
  Object.assign(a, { de: `${c.q},${c.r}`, para: `${c.q},${c.r}`, polen: 0.01, trabalho: { tipo: 'cura', resta: 0.001, total: 5 } });
  passo(s, 1/30);
  ok('pólen insuficiente não produz mel', c.estado === 'nectar' && a.polen === 0.01);
  Object.assign(a, { polen: 2, trabalho: { tipo: 'cura', resta: 0.001, total: 5 } });
  passo(s, 1/30);
  ok('pólen suficiente produz três potes', c.estado === 'madura' && c.potes === 3);
  ok('custo integral de pólen', a.polen === 0);
  // Reabastecimento com sobra abaixo do custo de uma célula cheia.
  s = cenario();
  c = Object.values(s.celulas).find(c => c.estado === 'vazia');
  Object.assign(c, { estado: 'nectar', nectar: 9, variedade: 'silvestre' });
  s.abelhas = s.abelhas.slice(0, 2);
  s.abelhas[1].polen = 1.2;
  for (let i=0; i<30*50; i++) passo(s, 1/30);
  ok('operária com saldo parcial busca pólen e conclui mel', c.estado === 'madura');
  const dados = S.serializar(novoJogo(42));
  dados.mercado = { inexistente: 1, silvestre: 'inválido', acacia: -5, trevo: 100, florada: null };
  s = S.desserializar(dados);
  ok('variedade desconhecida removida', !('inexistente' in s.mercado));
  ok('valores inválidos recuperam padrão', s.mercado.silvestre === 1 && s.mercado.florada === 1);
  ok('preços respeitam limites', s.mercado.acacia === 0.55 && s.mercado.trevo === 1.45);
  try { for (let i=0; i<300; i++) passo(s,1/30); ok('save recuperado continua simulação', true); }
  catch { ok('save recuperado continua simulação', false); }
  return { total, falhas: detalhes.length, detalhes };
}
