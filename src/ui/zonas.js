// Registro de áreas clicáveis, reconstruído a cada quadro pelo próprio código
// de desenho. Manter o hit-test derivado do desenho evita a fonte clássica de
// bug de UI em canvas: coordenadas duplicadas que saem de sincronia.

export const zonas = [];

// Recorte ativo. Painéis com rolagem definem um, e as zonas registradas dentro
// dele são cortadas igual ao desenho — sem isso sobraria área clicável fora da
// janela visível, que é o bug clássico de lista rolável em canvas.
let recorte = null;

export function limparZonas() {
  zonas.length = 0;
  recorte = null;
}

export function definirRecorte(r) {
  recorte = r;
}

export function zona(id, x, y, l, a, dados = null) {
  if (recorte) {
    const x1 = Math.max(x, recorte.x);
    const y1 = Math.max(y, recorte.y);
    const x2 = Math.min(x + l, recorte.x + recorte.l);
    const y2 = Math.min(y + a, recorte.y + recorte.a);
    if (x2 <= x1 || y2 <= y1) return;
    zonas.push({ id, x: x1, y: y1, l: x2 - x1, a: y2 - y1, dados });
    return;
  }
  zonas.push({ id, x, y, l, a, dados });
}

// O último registrado ganha: painéis desenhados por cima capturam o clique.
export function zonaEm(x, y) {
  for (let i = zonas.length - 1; i >= 0; i--) {
    const z = zonas[i];
    if (x >= z.x && x <= z.x + z.l && y >= z.y && y <= z.y + z.a) return z;
  }
  return null;
}
