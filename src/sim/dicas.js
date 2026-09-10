// Dicas de primeira vez. O jogo não tem tutorial, e mecânica que aparece do
// nada no meio da partida — florada, encomenda, vespa — só é entendida por
// quem já entendeu. A dica aparece nas primeiras vezes e some depois: quem já
// sabe não precisa ver de novo, e o contador vai no save justamente pra isso.
export const DICAS = {
  florada: {
    titulo: 'florada',
    vezes: 2,
    linhas: [
      'Um campo entrou em flor por pouco tempo.',
      'Enquanto dura, ele rende bem mais néctar e',
      'a reserva dele enche na hora.',
      'Vale mandar abelhas para lá — mas confira o',
      'risco do campo antes de mudar a turma.',
    ],
  },
};

// Abre a dica se ela ainda não bateu o limite de aparições. Devolve se abriu,
// pra quem chama poder decidir o que fazer — hoje ninguém precisa.
export function mostrarDica(estado, id) {
  const regra = DICAS[id];
  if (!regra) return false;
  estado.dicasVistas = { ...(estado.dicasVistas ?? {}) };
  const vistas = estado.dicasVistas[id] ?? 0;
  if (vistas >= regra.vezes) return false;

  estado.dicasVistas[id] = vistas + 1;
  estado.dica = id;
  return true;
}

export function fecharDica(estado, id = null) {
  if (id && estado.dica !== id) return;
  estado.dica = null;
}

export function dicaAtiva(estado) {
  const id = estado?.dica;
  return id && DICAS[id] ? { id, ...DICAS[id] } : null;
}
