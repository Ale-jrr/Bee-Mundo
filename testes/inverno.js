import {novoJogo} from '../src/core/estado.js';
import {passo} from '../src/sim/tick.js';
import {vender,alugar} from '../src/sim/acoes.js';
import {serializar,desserializar} from '../src/core/save.js';
export function rodar(){
const detalhes=[];let total=0;const ok=(n,c)=>{total++;if(!c)detalhes.push(n)};
let s=novoJogo(42);s.decorrido=180;s.pote.silvestre=10;
passo(s,1/30);ok('sem novas saídas no inverno',s.abelhas.every(a=>!a.campo));ok('sem aluguel no inverno',!alugar(s).ok);
const coletora=s.abelhas[1];Object.assign(coletora,{estado:'coletando',campo:s.campos[0].id,carga:1});passo(s,1/30);ok('coletora esquecida morre',!s.abelhas.includes(coletora));
const a=s.abelhas[1];
Object.assign(a,{fome:45,trabalho:{tipo:'comer',resta:.001,total:2}});const antes=s.pote.silvestre;passo(s,1/30);ok('refeição de inverno desconta imediatamente',Math.abs(antes-s.pote.silvestre-.75)<1e-8);
s.pote.silvestre=0;Object.assign(a,{fome:45,trabalho:{tipo:'comer',resta:.001,total:2}});passo(s,1/30);ok('sem mel continua faminta',a.fome>=45);
s.decorrido=240;s.ano=2;s.campos[0].alocadas=1;passo(s,1/30);ok('primavera retoma reservas',s.abelhas.some(a=>a.estado==='indo'));
s=novoJogo(42);s.pote.silvestre=3.5;vender(s,'silvestre',null,1);ok('venda parcial preserva reserva',s.pote.silvestre===2.5);
const d=serializar(s);d.consumoDeMel=.5;const novo=desserializar(d);ok('migração desconta dívida antiga',novo.pote.silvestre===2&&novo.consumoDeMel===0);const outro=desserializar(JSON.parse(JSON.stringify(serializar(novo))));ok('migração não desconta duas vezes',outro.pote.silvestre===2);
return{total,falhas:detalhes.length,detalhes};}
