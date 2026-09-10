import {novoJogo} from '../src/core/estado.js';
import {atualizarPredadores,enviarGuarda} from '../src/sim/predadores.js';
import {relogio} from '../src/sim/estacoes.js';
import {serializar,desserializar} from '../src/core/save.js';
import {passo} from '../src/sim/tick.js';
export function rodar(){let total=0;const detalhes=[];const ok=(n,c)=>{total++;if(!c)detalhes.push(n)};
const criar=()=>{const s=novoJogo(42);s.decorrido=100;atualizarPredadores(s,relogio(100),1/30);return s;};
let s=criar();ok('aviso antes de dano',s.ameaca.resta===20&&s.abelhas.length===3);
Object.assign(s.abelhas[1],{campo:s.campos[0].id,estado:'coletando'});s.ameaca.resta=.01;passo(s,1/30);ok('uma coletora perdida',s.abelhas.length===2&&s.campos[0].alocadas===0);ok('intervalo tranquilo',s.proximoAtaque>=s.decorrido+100&&!s.ameaca);
s=criar();s.campos[0].alocadas=0;ok('envia guarda',enviarGuarda(s).ok);ok('envia segunda',enviarGuarda(s).ok);ok('limite de duas',!enviarGuarda(s).ok);
passo(s,1/30);ok('guardas não produzem nem saem',s.abelhas.filter(a=>a.guarda).every(a=>a.estado==='colmeia'&&!a.trabalho));
const copia=desserializar(JSON.parse(JSON.stringify(serializar(s))));ok('save preserva defesa e prazo',copia.ameaca.resta===s.ameaca.resta&&copia.abelhas.filter(a=>a.guarda).length===2);
s.ameaca.resta=.01;passo(s,1/30);ok('defesa protege e libera guardas',s.abelhas.length===3&&s.abelhas.every(a=>!a.guarda));
s=criar();s.campos[0].alocadas=0;s.ameaca.resta=.01;passo(s,1/30);ok('recolher todas evita dano',s.abelhas.length===3);
s=criar();s.decorrido=180;atualizarPredadores(s,relogio(180),1/30);ok('sem vespas no inverno',!s.ameaca);
return{total,falhas:detalhes.length,detalhes};}
