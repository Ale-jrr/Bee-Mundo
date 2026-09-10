import {novoJogo} from '../src/core/estado.js';
import {passo} from '../src/sim/tick.js';
import {alocar} from '../src/sim/acoes.js';
export function rodar(){
let total=0;const detalhes=[];const ok=(n,c)=>{total++;if(!c)detalhes.push(n)};
for(const situacao of ['indo','coletando','voltando']){
const s=novoJogo(42);s.decorrido=180-1/60;const a=s.abelhas[1];Object.assign(a,{estado:situacao,campo:s.campos[0].id,t:.99,carga:2});passo(s,1/30);
ok(situacao+' morre na virada',!s.abelhas.includes(a));ok('reserva removida '+situacao,s.campos[0].alocadas===0);ok('avisa morte '+situacao,s.aviso.texto.includes('frio'));
const n=s.abelhas.length;passo(s,1/30);ok('sem mortes repetidas '+situacao,s.abelhas.length===n);
}
let s=novoJogo(42);s.decorrido=179;const a=s.abelhas[1];Object.assign(a,{estado:'coletando',campo:s.campos[0].id});ok('recolher aceito',alocar(s,s.campos[0].id,'nectar',-1).ok);for(let i=0;i<60;i++)passo(s,1/30);ok('recolhida sobrevive',s.abelhas.includes(a)&&a.estado==='colmeia');
s=novoJogo(42);s.decorrido=180;Object.assign(s.abelhas[1],{estado:'alugada',restaAluguel:50});passo(s,1/30);ok('rainha casa e aluguel preservados',s.abelhas.length===3);
s=novoJogo(42);s.decorrido=125;passo(s,1/30);ok('aviso no outono',s.aviso.texto.includes('recolha'));
return{total,falhas:detalhes.length,detalhes};}
