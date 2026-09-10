// Identidades locais persistentes: selecionar um ovo não troca o alvo ao nascer outro.
export function ovosDaCelula(c) {
  if (!Array.isArray(c.ovos)) {
    c.ovos = c.estado === 'ovo' ? Array.from({length: Math.max(1,c.ninhada ?? 1)}, (_,i) => ({id:i+1,cura:c.cura ?? 0})) : [];
    c.proximoOvo = c.ovos.length + 1;
  }
  return c.ovos;
}
export function sincronizarOvos(c) {
  c.ninhada = c.ovos.length;
  c.cura = Math.max(0,...c.ovos.map(o=>o.cura));
  if (!c.ovos.length) c.estado = 'vazia';
}
