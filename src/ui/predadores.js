import { retanguloArredondado, FONTE } from '../render/desenho.js';
import { zona } from './zonas.js';
export function desenharPredador(ctx, estado, pal, L, A) {
  if (!estado.ameaca) return;
  const l = Math.min(340,L-24), a=144, x=L-l-12, y=Math.max(86,A-a-130);
  retanguloArredondado(ctx,x,y,l,a,18);ctx.fillStyle='#fff2ce';ctx.fill();
  zona('vespa:cartao',x,y,l,a);
  ctx.save();ctx.fillStyle='#78361f';ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.font=`700 17px ${FONTE}`;
  ctx.fillText(`Vespa rondando · ${Math.ceil(estado.ameaca.resta)}s`,x+16,y+24,l-32);
  ctx.font=`400 12px ${FONTE}`;
  ctx.fillText('Duas guardiãs protegem as coletoras.',x+16,y+50,l-32);
  ctx.fillText('Ou recolha todas pelos campos (−).',x+16,y+69,l-32);
  const n=estado.abelhas.filter(a=>a.guarda).length;
  retanguloArredondado(ctx,x+12,y+88,l-24,42,12);ctx.fillStyle=n>=2?'#a7c57e':'#f5cb3e';ctx.fill();
  ctx.fillStyle='#493e22';ctx.font=`700 14px ${FONTE}`;ctx.textAlign='center';
  ctx.fillText(n>=2?'Defesa pronta · 2/2':`Enviar guarda · ${n}/2`,x+l/2,y+109);
  if(n<2)zona('vespa:guarda',x+12,y+88,l-24,42);
  ctx.restore();
}
