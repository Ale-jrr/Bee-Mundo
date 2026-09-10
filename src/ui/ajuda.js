import { retanguloArredondado, FONTE } from '../render/desenho.js';
import { zona } from './zonas.js';
import { UPGRADES } from '../sim/economia.js';
export function desenharAjuda(ctx, pal, L, A, id) {
  const regra = UPGRADES[id];
  if (!regra) return;
  ctx.fillStyle='rgba(30,22,10,0.65)';ctx.fillRect(0,0,L,A);
  zona('melhorias:fechar',0,0,L,A);
  const l=Math.min(430,L-24), a=Math.min(290,A-24), x=(L-l)/2,y=(A-a)/2;
  retanguloArredondado(ctx,x,y,l,a,20);ctx.fillStyle=pal.css('hud');ctx.fill();
  zona('melhorias:cartao',x,y,l,a);
  ctx.save();ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle=pal.css('tinta');
  ctx.font=`700 20px ${FONTE}`;ctx.fillText(regra.nome,x+20,y+20,l-40);
  let cursor=y+62;
  function texto(s,negrito=false){
    ctx.font=`${negrito?700:400} 13px ${FONTE}`;
    let linha='';
    for(const palavra of s.split(' ')){
      const proxima=linha?linha+' '+palavra:palavra;
      if(ctx.measureText(proxima).width>l-40&&linha){ctx.fillText(linha,x+20,cursor);cursor+=18;linha=palavra;}else linha=proxima;
    }
    ctx.fillText(linha,x+20,cursor);cursor+=22;
  }
  const descricoes = {
    sustentavel: `+${Math.round(UPGRADES.sustentavel.ganho*100)}% da capacidade inicial de néctar por nível. O campo também regenera mais néctar.`,
    rota: 'Cada nível reduz a viagem em 10% sobre o tempo anterior. Não reduz o risco de morte.',
    ogm: `+${Math.round(UPGRADES.ogm.ganho*100)}% da taxa inicial de coleta de néctar e pólen por nível.`,
  };
  texto(descricoes[id]);
  cursor+=12;
  texto(`Cada bolinha é um nível desta melhoria, até ${regra.max}. Vale só para este campo. A próxima compra custa mais.`);
  const by=y+a-48;
  retanguloArredondado(ctx,x+20,by,l-40,34,10);ctx.fillStyle=pal.css('cheia');ctx.fill();
  ctx.fillStyle=pal.css('tinta');ctx.font=`700 14px ${FONTE}`;ctx.textAlign='center';ctx.fillText('Entendi',x+l/2,by+9);
  zona('melhorias:fechar',x+20,by,l-40,34);ctx.restore();
}

