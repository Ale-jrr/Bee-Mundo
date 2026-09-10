// Conquistas: o pouco que sobrevive a um jogo novo. Mora fora do save da
// partida de propósito — recomeçar apaga a colmeia, não o que o jogador já
// provou que sabe fazer.
//
// Existe por causa dos desafios: eles eram o motivo de rejogar, mas estavam
// disponíveis desde o primeiro minuto, então vencer não desbloqueava nada.
export const CHAVE = 'colmeia:conquistas';

const VAZIO = { venceu: false, melhorAno: 0 };

export function ler() {
  try {
    const texto = localStorage.getItem(CHAVE);
    return texto ? { ...VAZIO, ...JSON.parse(texto) } : { ...VAZIO };
  } catch {
    return { ...VAZIO };
  }
}

function gravar(dados) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
    return true;
  } catch {
    return false;
  }
}

export function registrarVitoria() {
  return gravar({ ...ler(), venceu: true });
}

// Guarda até onde o jogador chegou, mesmo perdendo: é o que dá sentido a
// perder no Ano 6 depois de ter parado no 4.
export function registrarAno(ano) {
  const dados = ler();
  if (ano <= dados.melhorAno) return false;
  return gravar({ ...dados, melhorAno: ano });
}

export function desafiosLiberados() {
  return ler().venceu;
}

export function apagarConquistas() {
  try {
    localStorage.removeItem(CHAVE);
    return true;
  } catch {
    return false;
  }
}
