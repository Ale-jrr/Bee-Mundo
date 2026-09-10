# Balanceamento

Todos os números vivem em `src/sim/economia.js`. Este arquivo explica o
raciocínio; o código guarda os valores. Nada aqui está fechado — a fase 4 do
roadmap é justamente rodar a curva até ela fechar.

## A pergunta central

A meta cresce ×1.6 ao ano até o Ano 15 — isso é **≈ 6.700 no ano final, ~394×
a meta do Ano 2**. A produção do jogador precisa acompanhar. As alavancas:

| Alavanca | Ganho por unidade | Teto |
|---|---|---|
| Mais células | linear | espaço do favo + preço ×1.18 por compra |
| Mais abelhas | linear | clima piora (calor + CO₂) |
| Upgrades de campo | multiplicativo, com pips | custo crescente por pip |
| Campos melhores | salto degrau | trava por nível |
| Variedade cara | ×2.3 (silvestre → acácia) | custo de troca |
| Vender na alta | até ×1.35 | exige segurar estoque |

Crescimento linear não vence ×1.6 composto. Quem tem que puxar são os
**upgrades multiplicativos e o salto de campo/variedade** — as compras lineares
só existem pra financiar as multiplicativas. Se a curva quebrar, é aí.

## Ritmo

- Estação = 60 s → ano = 4 min → jogo completo ≈ 60 min de jogo ativo.
- Volta de coleta com o campo inicial: 11,4 s ida + ~58 s coletando + 11,4 s
  volta ≈ **81 s por 5 de néctar**, por abelha.
- Célula = 5 de néctar → 1 abelha enche 1 célula por volta.
- Cura = 24 s em clima perfeito, até ~6,7× mais lenta em clima péssimo.

Com 2 abelhas alocadas, isso dá aproximadamente **1 célula madura a cada 40 s**
— cerca de 6 por ano no Ano 1, contra uma meta de 17. Ou seja: **o Ano 1 é
impossível sem expandir.** Isso é intencional; o tutorial precisa empurrar a
primeira compra de célula.

## Medido (robô jogando sozinho, semente 42, 15 anos de orçamento)

| Estratégia | Chegou ao | Abelhas | Onde travou |
|---|---|---|---|
| Turma fixa em 2, sem pólen no modelo | Ano 3 | 18 | Meta 28, vendeu 20 |
| Turma no máximo (4), sem pólen no modelo | Ano 2 | 8 | Meta 18, vendeu 13 |
| Com silo de pólen e feromônio | **Ano 4** | 28 | Meta 45, vendeu 42 |

O pólen não piorou a curva, melhorou: o bônus de feromônio (cobertura 1.0 num
favo pequeno, +30%) mais que compensa a abelha gasta na coleta de pólen. A
cobertura só começa a diluir acima de 19 células abertas, o que o robô nunca
alcançou — então esse freio ainda não foi testado de verdade.

**Prova do gargalo de pólen:** com o silo zerado e nenhuma coletora dedicada,
3 minutos de simulação com o favo cheio de néctar produziram **zero** mel; uma
célula ficou presa em cura indefinidamente.

O gargalo hoje **não é** o favo nem o mercado: é o campo. `nectarMax: 28` com
rebrota de verão devolve ~11/min, e duas coletoras já tiram ~10/min. A terceira
e a quarta abelha não têm o que colher — por isso a turma cheia rende menos, e
por isso o upgrade *Agricultura Sustentável* (+néctar máximo) tem que ser a
primeira compra multiplicativa do jogo, não um extra.

## O teto estrutural (medido com o painel de campos pronto)

Depois do painel, varri estratégias com o robô. Nenhuma passa do Ano 4:

| Estratégia | Chegou ao | Pico de abelhas | Vendeu / meta |
|---|---|---|---|
| Turma fixa em 2 | Ano 4 | 28 | 42 / 45 |
| Turma cheia + upgrades pagos | Ano 4 | 20 | 44 / 45 |
| **Todos os upgrades no máximo, de graça** | Ano 4 | 13 | 34 / 45 |
| Todas as abelhas no campo | Ano 3 | 7 | 21 / 28 |

O upgrade grátis levar o campo de 28 para 106 de néctar e a taxa de 5,2 para
15,6 e **ainda assim vender menos** derruba a hipótese de que o campo é o
gargalo. Duas outras também caíram na medição:

- **Pólen não é o gargalo.** O silo ficou vazio **0 segundos** em todas as
  partidas. Dobrar `taxaColeta` ou halvear `polenPorMel` não mudou nada.
- **Coleta não é o gargalo.** Mais coletoras pioram, porque abelha no campo não
  aquece a colmeia e a ninhada para.

O que resta, e é estrutural, não de tuning:

1. **Só existe um campo.** `estado.campos` tem um item. O painel desenha as
   linhas "NÍVEL 3" e "NÍVEL 7" — fiel à referência, mas não há dado por trás.
2. **Esse campo tem 4 slots.** A produção está travada em 4 forrageiras para
   sempre, por maior que a colônia fique.
3. **O nível nunca passa de 1.** Medido: `picoNivel: 1` em todas as partidas.
   Mesmo que os campos existissem, nada os destravaria.

A meta cresce ×1,6 ao ano, composto. Produção travada em 4 forrageiras contra
uma meta composta é impossível a partir do Ano 4 — nenhum ajuste de número
resolve isso. Faltam campos, slots e ganho de XP.

## Depois dos campos 2 e 3 + curva de XP

Robô com 35% da colônia no campo, 1 coletora de pólen, semente 42:

| Ano | Vendido / meta | |
|---|---|---|
| 1 | 13 / 11 | ok |
| 2 | 35 / 18 | ok |
| 3 | 83 / 28 | ok |
| 4 | 134 / 45 | ok |
| 5 | 86 / 72 | ok |
| 6 | 25 / 115 | **quebrou** |

Teto foi do Ano 4 para o **Ano 6**. Nível 8, 33 abelhas. Treval abriu no Ano 1,3
e o Vale das Acácias no Ano 3,3.

XP calibrado por varredura (`porColheita: 16`, `porMoedaVendida: 3`). Abaixo
disso o Vale nunca abre; acima, o nível dispara e os desbloqueios perdem
sentido — com `porMoedaVendida: 6` o robô chegou ao nível 11 no Ano 5.

### Resolvido: o colapso do Ano 6 era o silo

Duas medições da mesma partida explicam a queda de 134 (Ano 4) para 25 (Ano 6):

- `polenMinimo: 0` — o silo zerou.
- `poteAcacia: 0` — o Vale ficou guarnecido por 656 s e **não produziu um pote**.

A cascata: uma coletora de pólen entrega 3,4/min; a cura consome 2 de pólen por
célula. No Ano 4 o favo já pede mais de 10 células/min. O silo zera, a cura
trava, as células ficam presas em `curando`, o favo lota, e o néctar que chega
do Vale não tem onde ser guardado — some. O campo mais caro do jogo passa a
render zero.

Corrigido transformando o silo em estado de célula: vários silos, criados e
destruídos durante a partida, capacidade crescendo com o favo. Resultado com o
robô alocando ~35% da colônia no campo e ~40% desses no pólen:

| Ano | Vendido / meta | |
|---|---|---|
| 1 | 13 / 11 | ok |
| 2 | 35 / 18 | ok |
| 3 | 72 / 28 | ok |
| 4 | 115 / 45 | ok |
| 5 | 232 / 72 | ok |
| 6 | 276 / 115 | ok |
| 7 | 19 / 185 | quebrou |

**Ano 6 → Ano 7-8** (varia com a semente). Pólen nunca zerou, silos foram de 1
a 4. A progressão de campos paga: acumulado por variedade em 7 anos —
acácia 30 potes / 492 moedas, trevo 24 / 246, flor silvestre 4 / 25. O campo
mais longe e mais perigoso é de longe o que sustenta a economia, como projetado.

### Resolvido: ninhada travada — eram três defeitos, não um

Medindo ritmo de eclosão por estação, o problema era maior do que parecia:

| | Primavera | Verão | Outono | Inverno |
|---|---|---|---|---|
| Temp. média (antes) | 19,5 °C | 31,4 °C | 30,5 °C | 15,6 °C |
| Ritmo de eclosão (antes) | **0,00** | 0,60 | 0,50 | **0,01** |

A eclosão estava morta em **metade do ano**, não só no inverno. E somavam-se:

1. **A rainha punha num freezer.** Postura a cada 20 s sempre que houvesse 2+
   células vazias, sem olhar se o ovo vingaria. Média de 3 a 5 ovos contra 1,4
   a 3,5 células vazias — o favo vivia entupido.
2. **A faixa ideal era inalcançável.** Calor aditivo de 0,55 °C por abelha
   exigia **50 abelhas** em casa pra chegar a 33 °C no inverno.
3. **Não existia aquecedor.** Os boosts só resfriavam. O jogador não tinha
   nenhuma alavanca contra o frio.

Correções: a rainha só põe acima de `ritmoMinimoParaPor`, entrou o boost
*Aquecer a Colmeia*, e o calor aditivo virou **termorregulação com autoridade
limitada** — a colônia empurra a temperatura em direção à faixa ideal, nos dois
sentidos, até `autoridadeMaxima` graus. Nunca ultrapassa o ideal, então colônia
grande não superaquece.

Temperatura de equilíbrio resultante:

| Estação | 2 abelhas | 10 | 20 | 40 |
|---|---|---|---|---|
| Inverno | 9 °C | 20 °C | 32 °C | 32 °C |
| Primavera | 21 °C | 32 °C | 33 °C | 33 °C |
| Verão | 33 °C | 33 °C | 33 °C | 33 °C |
| Outono | 27 °C | 33 °C | 33 °C | 33 °C |

O inverno nunca chega ao ideal por maior que seja a colônia (teto de autoridade
em 26 graus sobre um ambiente de 6 °C) — é onde o aquecedor pago se justifica.

Depois: eclosão 0,37 / 0,38 / 0,80 / 0,86 por estação, ovos caíram de 3–5 para
2,2–2,6, saúde do clima subiu de 0,40–0,80 para 0,76–0,90, nascimentos de 35
para 43. Teto: **Ano 7**, com o Ano 6 vendendo 329 contra meta de 115.

Uma regressão minha no caminho: ao subir o calor por abelha para 1,4 sem teto,
verão e outono passaram a ferver a 41 °C com saúde 0,40. A autoridade limitada
resolveu os dois extremos de uma vez.

## Provisório / a revisar

- `capacidadeNectar: 5` foi escolhido pra dar leitura visual no protótipo, não
  por balanceamento.
- `META.crescimento: 1.6` veio da leitura do gráfico de referência
  (17 → 27 → 45 → 73 → 119 dá ~1.63), embora o texto do jogo diga 50%.
  Ancorado em 11 no Ano 1, a curva sai 11, 18, 28, 45, 72, 115 — bate a
  referência do Ano 2 em diante e dá um Ano 1 de tutorial.
- Preços-base das variedades são chute inicial, só a razão entre elas importa
  por enquanto.
- Ninhada, risco de voo e aluguel já entraram; defesa não existe (ver
  `DUVIDAS.md`). Falta a alocação de turma e os upgrades de campo, que são
  justamente as alavancas que fazem a curva fechar.
- O ruído do mercado precisa escalar com `sqrt(dt)`, não com `dt`. Com `dt` a
  reversão à média domina o choque e o preço fica travado em 1.00 ± 1,6%, o que
  mata a decisão de quando vender. Corrigido; hoje a acácia oscila 0,55–1,45 e
  a flor silvestre 0,76–1,23.

## Como testar sem jogar

O núcleo é determinístico e roda ~12.000× mais rápido que o tempo real. No
console do navegador:

```js
const { passo } = await import('/src/sim/tick.js');
for (let i = 0; i < 30 * 240; i++) passo(window.colmeia, 1/30);  // 4 min de jogo
window.colmeia
```


## Investigação do Ano 7 — era vazão de pólen, não deadlock

Instrumentando ano a ano, o Ano 6 → Ano 7 mostrava:

| | Ano 6 | Ano 7 |
|---|---|---|
| Colheitas | 22 | 10 |
| Células em cura | 0 | 15 |
| Células vazias | 9 | 0 |
| Silos / pólen | 1 / 11 | 0 / 0 |

O flagrante no instante da trava (Ano 6,33): 13 células em cura, 11 coletoras de
néctar contra 3 de pólen. Néctar entrando a ~120/min exige ~48 de pólen/min, e
três coletoras a 3,4/min entregavam 10.

**A taxa de pólen era fixa em 3,4/min enquanto os campos rendem de 5,2 a
14/min.** Uma coletora de pólen valia menos que uma de néctar, e a defasagem
crescia junto com os campos melhores. Correções:

1. `celulaLivre` passou a respeitar uma reserva **condicional**: enquanto algum
   silo tiver espaço o néctar usa o favo à vontade; sem silo com espaço, precisa
   deixar células livres pra um silo nascer. (Uma reserva **fixa** de 3 células,
   tentada antes, zerou a produção — no favo inicial nunca há mais de 3 vazias.)
2. Teto de silos por favo (`celulasPorSilo: 6`). Sem ele o pólen ocupou 3 das 7
   células iniciais e o néctar não tinha onde ficar.
3. A coleta de pólen passou a **acompanhar a taxa do campo** (`fatorPolen: 0.8`)
   em vez de ser um número fixo, e `polenPorMel` caiu de 2 para 1. Uma coletora
   de pólen sustenta cerca de quatro de néctar, e o upgrade de OGM agora vale
   para os dois recursos.

Resultado em 9 partidas (sementes 42/7/99 × pólen 20/30/40%): **Ano 7 → Ano 9
em todas**, `travou: null` em todas, colônia de 44 → 68-76 abelhas.

### Próximo teto: platô de produção

Anos 6 a 8 vendem de forma consistente 370–478, enquanto a meta vai 115 → 185 →
295 → 472. A produção estabiliza em torno de 450/ano com 34-35 células e ~75
abelhas. Os suspeitos agora são o preço da célula (`1.18^n` fica proibitivo, 14
células ficam travadas até o fim) e o teto de 15 slots de forrageira somando os
três campos.

## Erro de método que custou uma medição

O `http.server` do Python manda `Last-Modified`, e o navegador passou a reusar
módulos ES do cache mesmo depois de recarregar a página. Uma rodada inteira de
balanceamento rodou contra código velho e devolveu números idênticos aos de
antes da mudança — o que só foi percebido porque a igualdade era suspeita
demais. Corrigido com `servidor.py`, que serve tudo com `no-store`.

Ao medir pelo console, importar módulo já importado devolve a versão em memória:
recarregue a página antes.

## Resolvido: HUD responsivo

Todas as medidas saíram para `src/ui/layout.js`. A barra superior agora flui das
duas bordas para o meio e a faixa de estações fica com a sobra — some quando não
cabe, em vez de invadir os vizinhos. O favo dimensiona pelo viewport e pela
própria extensão (`geometriaFavo`), então cabe em 360 px e encolhe conforme
cresce: 49 px de hexágono em 360, 62 px em 1280.

Corte em 720 px: abaixo disso os cartões de campo empilham, o clima vira três
pílulas em vez de painel com barras, e pausa/avanço viram um botão que cicla.

Alvo mínimo de toque de 44 px. Onde a decisão dependia da largura resultante e
não do modo, ela passou a ser calculada: em 768 px o modo largo ainda produzia
metades de 31 px no botão de velocidade.

**Verificado:** 55 combinações (11 tamanhos × 4 painéis, campos nas duas pontas
da rolagem) — nenhum erro, nenhuma zona fora da tela, nenhum alvo abaixo do
mínimo. Colher e comprar célula seguem funcionando com a geometria nova.

Duas sobreposições foram encontradas visualmente e vinham da mesma causa:
largura de texto **estimada** em vez de medida. `larguraRotulo()` agora mede, e
as duas linhas de turma usam a mesma largura de rótulo para alinharem entre si.


## Save

`testes/save.js` cobre 30 asserções — ida e volta, determinismo, migração,
lixo no armazenamento, progresso offline. Rodar no console:

```js
(await import('/testes/save.js')).rodar()
```

Duas invariantes que o teste protege e que já quebraram uma vez cada:

- **Id de abelha vinha de um contador de módulo.** Ao carregar um save ele
  reiniciava em 1 e colidia com as abelhas existentes. Agora vive no estado.
- **Continuar de um save tem que ser idêntico a nunca ter salvado.** O RNG é
  serializado junto, então a economia não se desvia ao recarregar.
- **Ausência não avança nada.** Quatro asserções cobrem isso, incluindo relógio
  do sistema adiantado e save de dez dias atrás.

A simulação rápida (~12.000× tempo real) continua valendo para testar economia
pelo console — só não é mais usada para recuperar tempo ausente.

### Resolvido: sem progresso offline

A colmeia podia morrer com o jogo fechado — a recuperação atravessava a virada
do ano e cobrava a meta. Decisão do Mayk: **enquanto offline, o jogo fica
parado.** Progresso offline removido por completo.

Isso muda o balanceamento de forma limpa: a meta anual só corre enquanto o
jogador joga, então os números medidos pelo robô (que roda `passo` direto)
continuam valendo sem tradução. E remove uma categoria inteira de bug — não há
mais um segundo caminho de avanço de tempo pra manter em sincronia com o tick.

Verificado com um save carimbado 2 h no passado: **0,000 s avançaram** ao
carregar, e o estado voltou idêntico campo a campo.


## Ano 9 como linha de chegada

O jogo não tinha condição de vitória: `anoFinal: 15` era constante morta e só
existia derrota. Agora sobreviver ao **Ano 9** vence.

### O platô era asfixia, não falta de produção

Medindo ano a ano, a produção subia até 479 no Ano 7 e depois caía. A causa:

| Ano | CO₂ | Saúde do clima | Colheitas |
|---|---|---|---|
| 5 | 879 | 0,91 | 19 |
| 7 | 1.262 | 0,67 | 39 |
| 9 | **1.631** | **0,41** | 32 |

Cada abelha em casa somava 22 ppm sem teto, e no Ano 9 havia 58 abelhas ociosas
(todos os 15 slots de forrageira ocupados desde o Ano 6). O ideal é abaixo de
800; a cura rodava a 41% da velocidade.

Era uma assimetria minha: dei termorregulação às abelhas para o calor e deixei o
CO₂ só acumulando. Abelha real ventila o favo abanando as asas na entrada.
Corrigido com o mesmo formato — autoridade limitada:

| Abelhas em casa | 10 | 30 | 58 | 80 | 120 |
|---|---|---|---|---|---|
| CO₂ de equilíbrio | 510 | 630 | 798 | 1.260 | 2.140 |

A ventilação segura até ~58 abelhas e satura. Colônia grande demais ainda
sufoca, então a pressão contra crescer sem limite continua existindo.

Resultado: saúde do clima passa de 0,41 para 0,94–0,95 no Ano 9.

### Meta a 1,55

Com 1,6 e ventilação, o Ano 9 pedia 472 contra um pico de 450–580 — vitórias por
margens de +7, +32 e +106, ou seja, sorte. Com **1,55** o Ano 9 pede 366:

- Robô competente: **7 de 8 sementes vencem**
- Jogador ruim (turma mínima, sem upgrade): morre no **Ano 2** nas duas sementes
- Ano 1 isolado: todas as 12 sementes vendem 17–20 contra meta 11

A única derrota do robô competente foi no Ano 1, e era artefato dele — a política
de alocação punha 1 abelha no néctar em vez das 2 do padrão inicial.

### Sobrou de fora

O **aluguel de abelhas** (`acoes.alugar`) continua sem botão na interface. Com o
teto de 15 forrageiras, dezenas de abelhas ficam ociosas no fim da partida; é o
destino natural delas e precisaria de balanceamento próprio.


## Silo de pólen: ligado, mas inerte

A mecânica está montada como se espera — o pólen drena conforme as abelhas
fazem mel, e as coletoras repõem. Mas com `polenPorMel: 1` ela nunca aperta.
Numa partida completa de 9 anos, com a alocação padrão:

| Ano | Mínimo de pólen | Tempo com silo vazio |
|---|---|---|
| 1 | 7,4 | 0 s |
| 5 | 19,9 | 0 s |
| 9 | 24,3 | 0 s |

O jogador nunca precisa agir. Isolando o efeito em 5 anos:

| Custo por pote | 0 coletoras | 1 | 2 | 3 |
|---|---|---|---|---|
| **1 (atual)** | 6 potes | **47** | 45 | — |
| 2 | — | 28 | **45** | 28 |
| 3 | 2 | 16 | **33** | 29 |

Com custo 1 a decisão é binária (precisa de uma, a segunda não faz nada) — e o
jogo já começa com uma alocada. Com custo 2 o pico é o mesmo, mas errar o número
em qualquer direção custa ~38%: viraria decisão de verdade.

**Não migrei para custo 2.** Tentei, e as partidas longas quebraram — mas as
três medições seguintes foram artefato do robô de teste, que tem defeito de
ordem na alocação (tenta subir o pólen com os slots já ocupados pelo néctar, e o
pedido é recusado em silêncio). Fica registrado como hipótese não verificada, e
o robô precisa ser consertado antes de decidir.

Causa da inércia: ao consertar o travamento do Ano 7 eu mexi em duas alavancas
ao mesmo tempo — baixei o custo de 2 para 1 **e** fiz a coleta acompanhar a taxa
do campo. As duas empurraram para o mesmo lado.


## Passeio no favo e postura por posição

Ao reduzir para 2 operárias, o favo ficou visualmente vazio: o campo pedia 3
vagas (2 néctar + 1 pólen), as duas saíam sempre, e abelha em voo não é
desenhada. Sobrava só a rainha.

Medido, Ano 1 com meta 11:

| Alocação inicial | Vendeu | Mín. abelhas visíveis |
|---|---|---|
| 2 néctar + 1 pólen | 12–13 | 1 (só a rainha) |
| 1 néctar + 1 pólen | 12–13 | 1 |
| **1 néctar + 0 pólen** | 11–13 | **2** |

Adotado 1 + 0. O padrão de turma saiu para o catálogo `CAMPOS` — estava
duplicado em `estado.js` e `save.js`, que é como dois lugares divergem.

Dois defeitos apareceram ao ligar o passeio:

- **Operária travada.** `proximoDestino` podia devolver a célula onde ela já
  estava; com um silo só, ela o escolhia sempre e ficava imóvel em cima dele.
- **Zero ovos em 300 s.** Amarrar a postura à posição da rainha somou três
  condições raras. Das 480 amostras: 422 com o favo frio demais, 45 com a rainha
  fora de célula vazia, 13 sem espaço — **nenhuma** com as três juntas.

A correção não foi afrouxar a regra, e sim dar intenção à rainha: o relógio da
postura fica pendente até ela pôr, e enquanto pendente ela caminha direto para a
vazia mais próxima. Verificado: os 3 ovos de uma partida saíram exatamente na
célula onde ela estava.


## Mel passa a ser feito pelas abelhas

A cura deixou de ser automática: uma operária de dentro busca pólen e trabalha
a célula por ~5 s. Duas calibrações foram necessárias:

- **Fracionar a cura em três visitas não funciona.** Triplicava o custo de pólen
  (1 por visita) e levava ~48 s por célula; o Ano 2 vendia 8 contra meta 17. Uma
  visita por célula devolve o custo a 1 pólen e ~16 s.
- **Abelha com tarefa não pode passear.** Com a pausa aleatória entre cada passo,
  a produção não fechava. Carregando pólen (ou a rainha com ovo pronto) ela vai
  direto, sem pausa.

Resultado com 30% da colônia em casa: **3 de 3 sementes vencem** no Ano 9.

### Fome

A cada 45 s a operária come 0,06 do pote do jogador. Faminta fica 50% mais
lenta — medido, a mesma cura passa de 5,1 s para 10,5 s.

Uma primeira versão fazia a abelha faminta **parar**, e o resultado era brutal:
vendendo tudo, a colmeia ficava 1.200–1.920 s travada e morria no Ano 5. Com a
lentidão de 50% no lugar da parada, vender tudo volta a ser viável (3/3 vencem).

**Efeito colateral honesto:** justamente por ser suave, guardar reserva de mel
hoje não compensa — vender tudo rende mais que segurar. A fome é um imposto
leve, não ainda uma decisão.


## O tempo de fazer mel

Reclamação de que demorava. Decompondo um pote, o culpado não era a colmeia:

| Etapa | Antes |
|---|---|
| Coletando néctar no campo | 57,7 s |
| Ida e volta ao campo | 22,8 s |
| Trabalho na colmeia | 7–10 s |

**O campo respondia por 90% da espera.** E era isso que também causava o
"a abelha carrega o pólen e não faz o mel": o néctar levava 80 s pra chegar, e
nesse intervalo ela ficava com a bolsa cheia sem ter onde entregar.

Onde a abelha de casa gastava o tempo: **58% andando, 26% parada, 13%
trabalhando** — a tarefa de 5 s era a menor parte de tudo.

Mudanças:

- `cargaBase` 5 → 3 e `capacidadeNectar` 5 → 3: uma viagem enche uma célula
- Taxas dos campos subiram (5,2 → 6,6 · 9 → 11 · 14 → 17) e as viagens encurtaram
- `segundosPorCelula` 1,6 → 0,7
- `capacidadePolen: 3` — três células por ida ao silo, em vez de uma
- Pausa de ociosa **subiu** (0,8-2,6 → 1,5-4 s): com pausa curta a abelha
  vibrava de um lado pro outro carregando pólen, o que parecia estar travada

Uma primeira tentativa cortou a viagem de campo pela metade (80,5 → 40,5 s) e o
resultado ficou rápido demais — pote a cada 30 s e o Ano 9 vencido por 720-810
contra 366, sem disputa. O meio-termo:

| | Original | Rápido demais | Adotado |
|---|---|---|---|
| Viagem de campo | 80,5 s | 40,5 s | **47,7 s** |
| Primeiro pote | 73 s | 45 s | **51 s** |
| Pote a cada | ~55 s | ~30 s | **~36 s** |

A abelha de casa passou de 58% andando / 13% trabalhando para
**20% trabalhando, 19% andando, 58% descansando**.

### A meta acompanha

`META.crescimento` acompanha a velocidade do campo: 1,55 na original, 1,65 se a
coleta dobrasse. Com o meio-termo, **1,60**: 11, 18, 29, 46, 74, 118, 189, 302,
**472**. Com 30% da colônia em casa, 3 de 3 sementes vencem (657-739).


## A tarefa de fazer mel em 20 s

Pedido: pegar o pólen é rápido, fazer o mel leva 20 s. `segundosPegarPolen: 1`,
`segundosCurar: 20`.

Só que a duração era multiplicada pela saúde do clima crua, que no pior caso
deixa a tarefa **6,7× mais lenta** — os 20 s viravam **41 s de mediana**. O
clima continua pesando, mas agora dentro de `0,6 + 0,4 × saúde`: atrapalha sem
descolar do número prometido.

Medido depois: **fazer mel 23,2 s de mediana**, pegar pólen 1 s.

A fome segue dobrando isso, que é a regra combinada.

### Ajuste de meta

A tarefa mais longa custou ~10% de produção e o Ano 2 empatou com a meta
(17,5 vendidos contra 18) — sorteio logo no começo. `META.valorBase` 11 → 10:
**10, 16, 26, 41, 66, 105, 168, 268, 429**.

4 de 4 sementes vencem com 30% da colônia em casa (578-702 contra 429), e 2 de 2
com 45%.


## Passo da abelha

`segundosPorCelula` foi de 1,6 → 0,7 quando a tarefa de mel durava 5 s e a
caminhada dominava o ciclo. Com a tarefa em 20 s isso ficou corrido de se ver.

Voltar direto pra 1,2 custou produção demais — a semente 42 passou a morrer no
Ano 2 (9 contra meta 16). **1,0** dá o mesmo visual calmo sem esse custo:

| Passo | Visual | Partidas |
|---|---|---|
| 0,7 | corrido | vence |
| 1,2 | bom | 1 de 4 morre no Ano 2 |
| **1,0** | bom | **5 de 5 vencem** (450-658 contra 429) |

Divisão do tempo da abelha de casa: 28% trabalhando, 29% andando, 40%
descansando.


## As estações estavam invertidas

Medida a produção por estação ao longo de 8 anos, o **inverno era a estação que
mais produzia** (5,50 potes/min contra 4,37 do verão), apesar de ter −60% de
coleta. As quatro estações ficavam dentro de 26% umas das outras.

Causa: desde que as abelhas passaram a fazer o mel, o gargalo virou o trabalho
de dentro, que não tinha nenhum fator sazonal. O favo funcionava como pulmão —
estocava néctar nas estações boas e a abelha de casa processava a fila no
inverno.

Correção: `produtividade` por estação (**100 / 90 / 80 / 70**, primavera no
topo), aplicada às duas etapas. Duas tentativas antes de acertar:

- **Valor cheio nas duas etapas:** o inverno caía para 54% em vez de 70% —
  o efeito se multiplicava por si mesmo.
- **Raiz quadrada em cada etapa:** o inverno subia para 82% — como a coleta é
  quase sempre o gargalo, só metade do efeito aparecia.
- **Adotado:** efeito cheio na coleta, suave no favo (`0,7 + 0,3 × p/1,2`).

Medido em regime isolado (campo sempre cheio, sem fome):
**100% / 97% / 87% / 80%**. A dispersão real é maior porque a rebrota das flores
também é sazonal (70% na primavera, 8% no inverno) e o campo esgota.

O antigo campo `coleta` saiu: ele dobrava o efeito e não era exibido em lugar
nenhum.

### Meta base para 9

As duas mudanças custaram ~5% de ritmo e o **Ano 2** — onde a colônia ainda é
minúscula — passou a matar 2 de 7 sementes. `META.valorBase` 10 → 9:
**9, 14, 23, 37, 59, 94, 151, 241, 387**. Agora 7 de 8 sementes vencem
(498-788 contra 387); a que falha ainda cai no Ano 2.


## Uma ninhada por vez

Regra: a rainha cuida de um ovo até nascer antes de pôr o próximo — a ninhada
não se espalha pelo favo.

Sozinha, a regra estrangula a colônia: com postura a cada 20 s e eclosão de
50 s, o ciclo inteiro vira o teto do crescimento e a colmeia empaca em **4-6
abelhas**. Nenhuma das 6 sementes vencia.

O ciclo precisou encolher junto:

| Postura / eclosão | Colônia final | Vitórias |
|---|---|---|
| 20 s / 50 s | 4-6 | 0 de 6 |
| 10 s / 25 s | 13-20 | 0 de 3 |
| **8 s / 15 s** | **25-56** | **8 de 8** |
| 5 s / 10 s | 104-124 | 3 de 3, colônia inchada |

Com 8/15 a colônia chega a um tamanho parecido com o de antes (era 45-55) e a
taxa de vitória subiu de 7/8 para **8 de 8**.

### Até três abelhas na mesma ninhada

A rainha soma ovos na ninhada existente até o limite de três, e as três nascem
juntas. Isso triplicou o crescimento: a colônia foi a **129 abelhas** no Ano 9,
contra as 25-56 que o resto do jogo espera — e as partidas ficaram tão longas
que os testes estouravam o tempo.

A incubação teve que alongar na mesma proporção: **15 s → 45 s**. Com 65 s a
colônia cai para 6-19 e metade das sementes morre.

Resultado: colônias de 24-53, nascimentos sempre em lotes de 3, sempre uma
única célula de ninhada.


## Célula parcial pode virar mel

A célula não precisa mais estar cheia: basta ter néctar para a abelha trabalhar
nela. Verificado — uma célula com 1 de 3 de néctar vira mel.

A capacidade da célula subiu para **9** — três viagens — para a regra ter efeito
real. Com carga igual à capacidade, uma entrega já enchia e não existiam células
parciais.

Isso obrigou uma segunda decisão: **o rendimento passou a ser proporcional ao
néctar**. Curar uma célula pela metade dá metade do mel. Sem isso, curar cedo
daria o mesmo pote por um terço do néctar e esperar nunca compensaria.

E uma terceira: a abelha escolhe a **célula mais cheia** entre as disponíveis.
Sem isso ela curava a primeira que via, com 3 de 9, e nenhuma célula chegava a
encher — a escolha de esperar não existiria. Medido: a maioria das colheitas sai
com 3 potes.

## Risco de estação multiplica, não soma

O painel anunciava "0% risco" no Bosque das Campainhas, mas a estação somava o
risco dela por cima — abelhas morriam no outono num campo vendido como seguro. E
perder 1 das 2 operárias iniciais costuma ser fatal: era a causa das derrotas no
Ano 2.

`risco = risco_do_campo × (1 + risco_da_estação)`. Campo de 0% fica 0% o ano
todo; campo perigoso fica mais perigoso na estação ruim.

Efeito: as derrotas saíram do Ano 2 e foram para o Ano 9 — passaram a acontecer
na linha de chegada, não no tutorial. 6 de 7 sementes vencem, colônias de 22-50.


## Produção estava lenta demais de sentir

Queixa jogando: "a produção de mel não está indo". Medido, era verdade —
**1 pote por minuto**, primeiro pote aos 66 s.

Duas medições erradas minhas antes de achar a causa:

- Contei **células** maduras em vez de **potes**. Com capacidade 9 cada célula
  rende até 3, então o número de células enganava.
- Testei aumentar a capacidade da célula achando que era ela. Não é: 3, 6 ou 9
  dão os mesmos **5 potes em 300 s**. A capacidade só muda se o mel vem de
  pouco em pouco ou em lotes.

O gargalo era a coletora única e a viagem de 48 s. Dobrando a velocidade dos
campos (viagem 48 s → 28 s): **9 potes em 5 min**, e a primeira colheita aos
74 s já rende 3 potes de uma vez.

Aumentar a carga por viagem foi testado e **piora** (3 potes): a viagem fica
longa demais e o mel demora ainda mais a aparecer.

### Meta acompanhou de novo

Produção quase triplicou; o Ano 9 pedia 387 contra 1.100 produzidos.
`crescimento` 1,60 → **1,78**: 9, 16, 29, 51, 90, 161, 286, 510, **907**.

5 de 6 sementes vencem (margens de 17% a 44%), e a derrota é no Ano 9 — na
linha de chegada, não no tutorial.

## Viagens visíveis

As abelhas somem do favo quando vão ao campo, e comiam paradas onde estavam.
Agora a viagem de coleta é desenhada saindo do favo rumo aos campos (encolhendo
e desbotando com a distância) e a abelha com fome voa até o **vidro de mel** e
volta — que é de onde o mel sai de fato.

## A cura encurtou para 5 s

A tarefa de cura era o único relógio dentro da colmeia, e nenhuma duração
funcionava **enquanto a coleta era lenta**. Medido em 300 s, semente 42, sem
mexer nas turmas:

| Cura | Potes/300 s | 1ª colheita | Tempo sem néctar no favo |
|---|---|---|---|
| 20 s | 9 | 74 s | 18% |
| 15 s | 7 | 45 s | 14% |
| 10 s | 7 | 41 s | 29% |

Encurtar adiantava o primeiro pote e **reduzia** o total: com a tarefa curta a
abelha de dentro passa na frente da coleta e fica esperando néctar (é o que a
última coluna mostra). Alongar fazia o contrário. Não havia número certo porque
o relógio estava do lado errado do gargalo.

O erro era procurar o número certo no lugar errado. Com as viagens de campo
encurtadas 25% (Campainhas 28 s → 20,6 s, Treval 32 → 24,2, Acácias 40 → 30), a
duração da cura **para de importar** — três sementes, 300 s cada, todas dão o
mesmo total:

| Cura | Potes/300 s | 1ª colheita | Tempo sem néctar |
|---|---|---|---|
| instantânea | 12 | 22 s | 53% |
| 3 s | 12 | 26 s | 43% |
| **5 s** | **12** | **28 s** | **36%** |
| 8 s | 12 | 31 s | 24% |

O total é o mesmo porque a coleta é o gargalo em todas: o que a cura muda é
onde a espera aparece. Até 5 s ela cabe nos vãos entre as entregas e custa 6 s
no primeiro pote; a partir de 8 s começa a atrasar e o mel volta a sair aos
trancos (+2 de uma vez aos 115 s).

Ficou em **5 s**, que é o tempo pedido no projeto original: barrinha visível,
mel sem fila. Comparado com o começo desta investigação: 9 potes → **12**, e o
primeiro sai aos 28 s em vez de 74 s.

Quem limita agora é a coleta — 36% do tempo o favo está sem néctar fechável. É
o gargalo certo, porque é o único em que o jogador manda: quantas abelhas em
qual campo, quantas no pólen.

Custo do pólen virou proporcional (`polenPorMel: 2` por célula cheia) para que
fechar meia célula custe meio pólen; sem isso a abelha fecharia célula de 1 de
néctar e tiraria um pote inteiro dela. Por garantia ela também só fecha célula
que já tenha uma carga (3 de néctar).

### O que isso fez com a curva

Com o robô colhendo, vendendo, comprando célula e melhoria: **6 de 6 sementes
vencem** (antes 5 de 6), colônia de 35 a 63 abelhas, e o Ano 9 continua sendo o
aperto — meta 907 contra 1.368 a 1.481 produzidos por um robô que joga perfeito.
`META.crescimento` segue em 1,78.

### Teto conhecido: 15 vagas de campo

Somando os três campos há 15 vagas (4 + 5 + 6). O robô termina com 35 a 63
abelhas e a maior parte **sem nada pra fazer**: com a cura em 5 s, duas ou três
de dentro dão conta de fechar tudo que chega. Crescer a colônia depois disso só
melhora o clima do favo. Quem ainda faz a produção subir é a melhoria de campo
(OGM leva o Ano 8 de ~1.100 para ~1.500). Se um dia a colônia grande precisar
voltar a importar, o lugar de mexer é o número de vagas, não o tempo de tarefa.

## O que estava difícil não era a cura

Depois de encurtar a cura para 5 s o jogo continuou pesado, e a medição do
**jogador que não mexe nas turmas** (colhe e vende, mas não aloca ninguém no
pólen) mostrou por quê:

| | Antes | Depois |
|---|---|---|
| Potes em 12 min | 12 | **34** |
| Último pote | 236 s, e nunca mais | fluxo contínuo |
| Partida sem pólen algum | 67% | 3% |
| Célula pronta travada por falta de pólen | 67% | 2% |
| Fim | derrota no Ano 2, 0 vendido | vivo no Ano 4 |

O favo começa com 8 de pólen e nada o repõe sem uma coletora dedicada. Aos
236 s o estoque acabava, a abelha passava direto pela célula cheia e **o mel
parava para sempre** — e o silo, único mostrador de pólen da tela, sumia do
favo junto, porque a célula voltava a ser vazia ao zerar. Nada dizia o que
faltava. É isso que se sente como "a cura está difícil": a cura simplesmente
não acontece.

Três correções:

1. **Pólen de carona** (`SILO.polenDeCarona: 0.4`) — toda coletora de néctar
   volta com 40% do pólen que a carga dela vai consumir, como abelha de
   verdade. A colmeia nunca para; dedicar abelhas ao pólen leva de 40% a 100%,
   então a escolha continua valendo.
2. **O último silo não some.** Zerado, fica no favo mostrando `0`.
3. **Aviso na tela** quando há célula pronta e zero pólen: *"Sem pólen: mande
   uma abelha buscar"*, 4 s, com 16 s de descanso entre repetições.

Nota de método: a primeira medição disto estava errada e foi refeita. A sonda
colhia mas não vendia, então perdia o Ano 1, e `passo` congela na derrota — os
"6 minutos sem mel" eram em parte a simulação parada, não o jogo.

### A curva depois disso

6 de 6 sementes vencem. O Ano 1 sai de 16 para ~85 vendidos: o começo deixou de
ser um funil. O fim continua apertado — o Ano 9 pede 907 e a semente mais fraca
produz 925 no Ano 8. `META.crescimento` segue em 1,78.

## O jogo estava invencível — e não era pelas funcionalidades novas

Ao medir as sete funcionalidades, o robô perdia no **Ano 2 com 2 abelhas** em
6 de 6 sementes. Antes de mexer em nada, rodei o mesmo robô contra o commit
`v0.1.0-base` extraído do git, servido em paralelo na porta 5174: **mesma
derrota, mesmas 2 abelhas**. O problema já estava lá.

A cadeia, medida passo a passo numa partida:

| Momento | O que acontece |
|---|---|
| 120 s | A vespa mata a coletora e **zera a turma do campo** |
| 180 s | A virada do inverno mata a última operária que estava fora |
| 180-340 s | Só a rainha. Sem operária não há coleta nem mel |
| 340 s | A primeira ninhada finalmente eclode — Ano 2 já foi |

E por que a ninhada demorava 260 s para nascer: `toleranciaGraus: 5` zerava a
eclosão abaixo de **28 °C**, e uma colônia de duas ou três abelhas tem 2,8-4,2 °C
de autoridade térmica — o favo só passa de 28 °C no pico do verão. Perder uma
operária congelava a ninhada, e sem ninhada não havia como recuperar a operária.

Duas correções, nesta ordem:

1. **Recolher antes do inverno** (funcionalidade 8.1). Ensinando o robô a usar o
   painel novo, o resultado saiu de 0 de 6 sobrevivendo ao Ano 2 para 1 vitória
   e a maioria chegando ao Ano 3 — várias por um fio (29/29, 15/16). O painel não
   é conforto: é a saída de uma armadilha que estava matando a partida.
2. **`toleranciaGraus` 5 → 7.** O frio passa a **atrasar** a ninhada em vez de
   matá-la. O inverno continua parando tudo (favo a 9-15 °C), que é a regra que
   interessa.

### Curva final

Robô que colhe, vende, compra célula e melhoria, escolhe bênção e **recolhe
antes do inverno**:

| Semente | Fim | Colônia | Ano 8 vendido (meta 510) |
|---|---|---|---|
| 1 | vitória | 88 | 1.114 |
| 7 | vitória | 130 | 1.236 |
| 42 | vitória | 99 | 945 |
| 99 | vitória | 128 | 983 |
| 123 | vitória | 151 | 1.089 |
| 777 | vitória | 176 | 1.074 |

6 de 6 vencem e o Ano 9 continua sendo o aperto: pede 907 contra 945-1.236
produzidos por um robô que joga perfeito. `META.crescimento` segue em **1,78**.

Os três desafios são vencíveis por esse mesmo robô, com colônia menor no mais
duro: *campos perigosos* fecha em 79 abelhas contra 88-99 do modo comum.

### O que ainda não foi medido

O robô recolhe as coletoras em **toda** virada de inverno, o que um jogador
humano vai esquecer às vezes. A margem do Ano 9 (8% a 36%) não tem folga para
muitos esquecimentos — se na prática ficar difícil demais, o lugar de mexer é
`META.crescimento`, não a tolerância da ninhada.
