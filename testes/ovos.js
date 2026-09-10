import {novoJogo} from '../src/core/estado.js';
import {passo} from '../src/sim/tick.js';
import {alimentarNinhada} from '../src/sim/acoes.js';
import {serializar,desserializar} from '../src/core/save.js';
export function rodar(){let total=0;const detalhes=[];const ok=(n,c)=>{total++;if(!c)detalhes.push(n)};
let s=novoJogo(42);s.proximaPostura=100;s.clima.temperatura=34;s.campos.forEach(c=>c.alocadas=0);let c=Object.values(s.celulas).find(c=>c.estado==='vazia');Object.assign(c,{estado:'ovo',ninhada:3,cura:.9999,ovos:[{id:1,cura:.9999},{id:2,cura:.5},{id:3,cura:.1}],proximoOvo:4});let n=s.abelhas.length;passo(s,1/30);ok('um nascimento natural',s.abelhas.length===n+1&&c.ovos.length===2);ok('progresso individual preservado',c.ovos[0].cura>.5&&c.ovos[1].cura<.11);
const antes=c.ovos[0].cura;alimentarNinhada(s,c,1,3);ok('alimenta só o selecionado',c.ovos[0].cura===antes&&c.ovos[1].cura>.2);const mel=s.pote.silvestre;ok('ovo que nasceu não consome mel',!alimentarNinhada(s,c,1,1).ok&&s.pote.silvestre===mel);
const copia=desserializar(JSON.parse(JSON.stringify(serializar(s))));ok('save preserva ids e progresso',JSON.stringify(copia.celulas[`${c.q},${c.r}`].ovos)===JSON.stringify(c.ovos));
let antigo=serializar(novoJogo(42));let cel=Object.values(antigo.celulas).find(c=>c.estado==='vazia');Object.assign(cel,{estado:'ovo',ninhada:3,cura:.4});const mig=desserializar(JSON.parse(JSON.stringify(antigo)));cel=mig.celulas[`${cel.q},${cel.r}`];ok('migração preserva os três ovos',cel.ovos.length===3&&cel.ovos.every(o=>o.cura===.4));
return{total,falhas:detalhes.length,detalhes};}
