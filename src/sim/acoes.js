import { ovosDaCelula, sincronizarOvos } from '../core/ovos.js';
import { relogio } from './estacoes.js';
import { mostrarDica } from './dicas.js';
// Ações do jogador. Funções puras sobre o estado, sem canvas e sem eventos —
// o mesmo caminho serve pro clique, pro tutorial e pros testes de economia.
// Toda ação devolve { ok, motivo } para a UI dar retorno sem duplicar regra.

import {
  VARIEDADES, CELULA, BOOSTS, XP, ALUGUEL, UPGRADES, NINHADA,
  precoDaCelula, xpParaNivel, custoUpgrade, vagasDoCampo, MISTURA,
} from './economia.js';
import { vizinhos, chave } from './hex.js';
import { celulasArray, criarAbelha } from '../core/estado.js';
import { registrarEntrega } from './encomendas.js';
import { bonusBencao, descontoBencao } from './bencaos.js';
import { regraDoDesafio } from './desafios.js';
import { sortearTalento } from './talentos.js';
import { RAINHA, podeCoroar, emInterregno } from './rainha.js';

const falha = (motivo) => ({ ok: false, motivo });

// Feedback efêmero na tela. Fica no estado para o render não precisar de um
// canal próprio de eventos.
export function avisar(estado, texto, segundos = 3) {
  estado.aviso = { texto, expira: estado.decorrido + segundos };
}

const sucesso = (extra = {}) => ({ ok: true, ...extra });

export function comprarCelula(estado, celula) {
  if (celula.estado !== 'travada') return falha('Essa célula já é sua.');
  const preco = Math.round(precoDaCelula(estado.celulasCompradas)
    * descontoBencao(estado, 'cera') * regraDoDesafio(estado, 'precoCelula'));
  if (estado.moedas < preco) return falha(`Faltam ${Math.ceil(preco - estado.moedas)} moedas.`);

  estado.moedas -= preco;
  estado.celulasCompradas += 1;
  celula.estado = 'vazia';
  celula.variedade = null;
  celula.nectar = 0;
  celula.cura = 0;

  abrirVizinhas(estado, celula);
  mostrarDica(estado, 'acaoCelula');
  return sucesso({ preco });
}

// Comprar uma célula revela as vizinhas ainda desconhecidas — é assim que o
// favo cresce em vez de já nascer com o tabuleiro inteiro à mostra.
function abrirVizinhas(estado, celula) {
  for (const v of vizinhos(celula.q, celula.r)) {
    const k = chave(v.q, v.r);
    if (estado.celulas[k]) continue;
    estado.celulas[k] = { q: v.q, r: v.r, estado: 'travada', variedade: null, nectar: 0, cura: 0, polen: 0, ninhada: 0, potes: 0 };
  }
}

export function colher(estado, celula) {
  if (celula.estado !== 'madura') return falha('Essa célula ainda não está madura.');
  const variedade = celula.variedade;
  const potes = Math.max(1, celula.potes ?? 1);

  estado.pote[variedade] = (estado.pote[variedade] ?? 0) + potes;
  celula.estado = 'vazia';
  celula.variedade = null;
  celula.nectar = 0;
  celula.cura = 0;
  celula.potes = 0;

  ganharXp(estado, XP.porColheita * potes);
  mostrarDica(estado, 'acaoColher');
  return sucesso({ variedade, potes });
}

// Junta um pote de cada variedade de campo num pote de florada.
export function misturar(estado) {
  const faltando = MISTURA.entrada.filter((v) => Math.floor(estado.pote[v] ?? 0) < 1);
  if (faltando.length) {
    const nomes = faltando.map((v) => VARIEDADES[v].nome).join(', ');
    return falha(`Falta ${nomes} no vidro.`);
  }
  for (const v of MISTURA.entrada) estado.pote[v] -= 1;
  estado.pote[MISTURA.saida] = (estado.pote[MISTURA.saida] ?? 0) + 1;
  mostrarDica(estado, 'acaoMisturar');
  return sucesso({ variedade: MISTURA.saida });
}

export function precoDeVenda(estado, variedade, estacao) {
  const base = VARIEDADES[variedade].base;
  const sazonal = 1 + (estacao?.preco ?? 0);
  return base * sazonal * (estado.mercado[variedade] ?? 1) * bonusBencao(estado, 'negocio');
}

export function vender(estado, variedade, estacao, quantidade = Infinity) {
  const disponivel = Math.floor(estado.pote[variedade] ?? 0);
  const n = Math.min(disponivel, quantidade);
  if (n <= 0) return falha('Não há mel dessa variedade no pote.');

  const valor = precoDeVenda(estado, variedade, estacao) * n;
  estado.pote[variedade] -= n;
  estado.moedas += valor;
  estado.vendidoNoAno += valor;
  ganharXp(estado, valor * XP.porMoedaVendida);

  // Vender pressiona o preço pra baixo: despejar o pote inteiro custa margem.
  estado.mercado[variedade] = Math.max(0.55, (estado.mercado[variedade] ?? 1) - 0.035 * n);

  // Entregar encomenda é vender: quem vende não precisa saber que ela existe.
  const recompensa = registrarEntrega(estado, variedade, n);
  mostrarDica(estado, 'acaoVender');
  return sucesso({ n, valor, recompensa });
}

// Turma do campo. Néctar e pólen dividem os mesmos slots, então subir um
// obriga a descer o outro — é aí que mora a decisão.
export function alocar(estado, campoId, tipo, delta) {
  const campo = estado.campos.find((c) => c.id === campoId);
  if (!campo) return falha('Campo desconhecido.');

  if (!['polen', 'nectar'].includes(tipo) || !Number.isInteger(delta)) return falha('Alocação inválida.');
  if (delta > 0 && estado.nivel < campo.nivelMin) return falha('Campo ainda bloqueado.');

  const chaveTipo = tipo === 'polen' ? 'polenAlocadas' : 'alocadas';
  const alvo = campo[chaveTipo] + delta;
  if (alvo < 0) return falha('Já está em zero.');

  const outro = tipo === 'polen' ? campo.alocadas : campo.polenAlocadas;
  if (alvo + outro > vagasDoCampo(campo)) return falha('Não há vaga livre neste campo.');

  // Mandar todas pro campo é permitido — e para a produção, porque ninguém
  // fica dentro pra transformar néctar em mel. É escolha do jogador.
  const operarias = estado.abelhas.filter((a) => a.papel === 'operaria' && a.estado !== 'alugada' && !a.guarda).length;
  const reservadas = estado.campos.reduce((n, c) => n + c.alocadas + c.polenAlocadas, 0);
  // Reduções continuam possíveis em saves com reservas antigas excessivas.
  if (delta > 0 && reservadas + delta > operarias) return falha('Você não tem abelhas suficientes.');

  campo[chaveTipo] = alvo;

  // Primeira vez que o jogador escala alguém: a viagem e o silo são a
  // dinâmica inteira do jogo, e até aqui nada explicava nenhum dos dois.
  if (delta > 0) mostrarDica(estado, tipo === 'polen' ? 'acaoPolen' : 'acaoNectar');

  // Ao reduzir, manda de volta pra colmeia as que sobraram desse recurso.
  if (delta < 0) {
    const emCampo = estado.abelhas.filter(
      (a) => a.campo === campoId && a.recurso === tipo,
    );
    for (const abelha of emCampo.slice(alvo)) {
      abelha.estado = 'colmeia';
      abelha.campo = null;
      abelha.carga = 0;
      abelha.t = 0;
    }
  }
  return sucesso();
}

// Coroa uma rainha nova. O custo é mel — o mesmo que iria para a meta — e uma
// janela sem postura enquanto ela amadurece.
export function coroarRainha(estado) {
  if (emInterregno(estado)) return falha('A nova rainha ainda está amadurecendo.');
  if (!podeCoroar(estado)) return falha(`São ${RAINHA.custoMel} de mel para criar uma rainha.`);

  let resta = RAINHA.custoMel;
  const baratas = Object.keys(VARIEDADES).sort((a, b) => VARIEDADES[a].base - VARIEDADES[b].base);
  for (const id of baratas) {
    const tira = Math.min(Math.floor(estado.pote[id] ?? 0), resta);
    estado.pote[id] -= tira;
    resta -= tira;
    if (resta <= 0) break;
  }

  estado.rainhaDesde = estado.decorrido + RAINHA.interregno;
  estado.interregno = RAINHA.interregno;
  estado.proximaPostura = RAINHA.interregno;
  mostrarDica(estado, 'acaoRainha');
  return sucesso();
}

// Recolhe a colônia inteira dos campos de uma vez. Existe por causa do
// inverno: sem isso o jogador teria que zerar campo por campo no painel, com o
// relógio correndo. As que estão no ar **voltam voando**, com a carga que já
// pegaram — teletransportar seria mais simples, mas aí o "quanto tempo resta
// para recolher" deixaria de significar alguma coisa.
export function recolherTodas(estado) {
  let recolhidas = 0;
  for (const campo of estado.campos) {
    recolhidas += campo.alocadas + campo.polenAlocadas;
    campo.alocadas = 0;
    campo.polenAlocadas = 0;
  }
  let voltando = 0;
  for (const abelha of estado.abelhas) {
    if (abelha.estado === 'indo' || abelha.estado === 'coletando') {
      abelha.estado = 'voltando';
      abelha.t = 0;
      voltando++;
    } else if (abelha.estado === 'voltando') {
      voltando++;
    }
  }
  if (!recolhidas && !voltando) return falha('Não há ninguém nos campos.');
  mostrarDica(estado, 'acaoRecolher');
  return sucesso({ recolhidas, voltando });
}

export function comprarUpgrade(estado, campoId, upgradeId) {
  const campo = estado.campos.find((c) => c.id === campoId);
  const regra = UPGRADES[upgradeId];
  if (!campo || !regra) return falha('Melhoria desconhecida.');

  const nivel = campo.upgrades[upgradeId] ?? 0;
  if (nivel >= regra.max) return falha('Essa melhoria já está no máximo.');

  const custo = custoUpgrade(upgradeId, nivel);
  if (estado.moedas < custo) return falha(`Faltam ${Math.ceil(custo - estado.moedas)} moedas.`);

  estado.moedas -= custo;
  campo.upgrades[upgradeId] = nivel + 1;
  mostrarDica(estado, 'acaoUpgrade');
  return sucesso({ nivel: nivel + 1, custo });
}

// Alimentar a ninhada: cada pote de mel adianta a eclosão de um ovo. Gasta
// primeiro a variedade mais barata — o mel caro é melhor vendido na RAX do que
// dado de comer, e o jogador não deveria precisar pensar nisso.
export function alimentarNinhada(estado, celula, potes = 1, ovoId = null) {
  if (!celula || celula.estado !== 'ovo') return falha('Só é possível alimentar um ovo.');

  const ovos = ovosDaCelula(celula);
  const ovo = ovoId == null ? ovos[0] : ovos.find(o => o.id === ovoId);
  if (!ovo) return falha('Esse ovo já nasceu.');
  if (!Number.isInteger(potes) || potes <= 0) return falha('Quantidade inválida.');
  const disponivel = Object.values(estado.pote).reduce((n, v) => n + Math.floor(v), 0);
  if (disponivel <= 0) return falha('Não há mel no pote.');

  const gastar = Math.min(potes, disponivel);
  const baratas = Object.keys(VARIEDADES).sort((a, b) => VARIEDADES[a].base - VARIEDADES[b].base);
  let resta = gastar;
  for (const variedade of baratas) {
    if (resta <= 0) break;
    const tira = Math.min(Math.floor(estado.pote[variedade] ?? 0), resta);
    estado.pote[variedade] -= tira;
    resta -= tira;
  }

  mostrarDica(estado, 'acaoNinhada');
  ovo.cura += gastar * NINHADA.avancoPorMel;
  sincronizarOvos(celula);
  if (ovo.cura >= 1) {
    eclodirNinhada(estado, celula);
    return sucesso({ gastou: gastar, nasceu: true });
  }
  return sucesso({ gastou: gastar, nasceu: false });
}

export function eclodirNinhada(estado, celula) {
  const ovos = ovosDaCelula(celula);
  const prontos = ovos.filter(o => o.cura >= 1);
  celula.ovos = ovos.filter(o => o.cura < 1);
  sincronizarOvos(celula);
  for (const ovo of prontos) nascerAbelha(estado);
}

export function alugar(estado) {
  if (relogio(estado.decorrido).estacao.id === 'inverno') return falha('No inverno as abelhas ficam na colmeia.');
  const disponiveis = estado.abelhas.filter((a) => a.papel === 'operaria' && a.estado !== 'alugada' && !a.guarda).length;
  const reservadas = estado.campos.reduce((n, c) => n + c.alocadas + c.polenAlocadas, 0);
  if (disponiveis <= reservadas) return falha('As operárias disponíveis já estão reservadas para os campos.');
  const livre = estado.abelhas.find((a) => a.papel === 'operaria' && a.estado === 'colmeia' && !a.guarda);
  if (!livre) return falha('Nenhuma operária disponível na colmeia.');
  livre.estado = 'alugada';
  livre.restaAluguel = ALUGUEL.duracao;
  livre.campo = null;
  livre.t = 0;
  mostrarDica(estado, 'acaoAlugar');
  return sucesso();
}

export function aplicarBoost(estado, id) {
  const boost = BOOSTS[id];
  if (!boost) return falha('Boost desconhecido.');
  if (estado.moedas < boost.custo) return falha(`Faltam ${Math.ceil(boost.custo - estado.moedas)} moedas.`);

  estado.moedas -= boost.custo;
  for (const [medidor, delta] of Object.entries(boost.delta ?? {})) {
    estado.clima[medidor] += delta;
  }
  mostrarDica(estado, 'acaoBoost');
  if (boost.duracao) {
    estado.turbo = { resta: boost.duracao, multiplicador: boost.multiplicador ?? 1 };
  }
  return sucesso();
}

export function ganharXp(estado, quantidade) {
  estado.xp += quantidade;
  let limite = xpParaNivel(estado.nivel);
  while (estado.xp >= limite) {
    estado.xp -= limite;
    estado.nivel += 1;
    limite = xpParaNivel(estado.nivel);
  }
}

export function nascerAbelha(estado) {
  // As duas primeiras operárias nascem comuns (em `novoJogo`); daqui pra
  // frente cada uma sorteia o próprio pendor.
  const abelha = criarAbelha('operaria', estado.proximoIdAbelha++, sortearTalento(estado));
  estado.abelhas.push(abelha);
  return abelha;
}

export function celulaEm(estado, q, r) {
  return estado.celulas[chave(q, r)] ?? null;
}

export function totalNoPote(estado) {
  return Object.values(estado.pote).reduce((s, v) => s + v, 0);
}

export function celulasMaduras(estado) {
  return celulasArray(estado).filter((c) => c.estado === 'madura');
}
