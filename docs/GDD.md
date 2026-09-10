# Colmeia — Documento de Design

**Gênero:** gestão econômica em tempo real, sessão curta, com camada idle.
**Alvo:** navegador (protótipo e validação) → Godot 4 / mobile (produto).
**Fantasia:** você é a colônia. A cota anual de mel cresce 55% ao ano.
Sobreviva até o **Ano 9** — cerca de 36 minutos de jogo.

---

## 1. Loop central

```
        ┌─ Pólen ──→ Silo ──┐
        │                   ↓
Campo ──┴─ Néctar → Célula → Cura → Colheita → RAX → Moedas → Capacidade
   ↑                                                              │
   └──────────────────────────────────────────────────────────────┘
```

As duas pernas saem do mesmo campo e disputam as mesmas abelhas. Néctar é a
matéria-prima; **pólen é o que permite transformá-la**. Sem pólen o favo pode
estar cheio de néctar e a produção de mel é zero.

1. Abelhas voam a **campos** e trazem néctar (o campo define a variedade).
2. Néctar é depositado numa **célula** livre do favo.
3. A célula **cura** o néctar em mel — velocidade ditada pelo clima interno.
4. Célula madura pode ser **colhida** → entra no pote, separado por variedade.
5. Você vende na **RAX** escolhendo o momento (preço oscila e tem viés sazonal).
6. Moedas compram células, upgrades de campo, boosts de clima e postura de ovos.
7. No virar do ano, o total vendido precisa bater a **meta**. Senão, fim de jogo.

A tensão do jogo é uma única frase: **crescer a colônia piora o clima interno**,
e clima ruim derruba a cura. Toda expansão cobra manutenção.

---

## 2. Sistemas

### 2.1 Favo (grid hexagonal)
Hexágonos *pointy-top* em coordenadas axiais `(q, r)`. Estados da célula:

| Estado | Descrição |
|---|---|
| `travada` | Comprável. Mostra o preço no centro. |
| `vazia` | Disponível para néctar ou postura. |
| `nectar` | Enchendo. Cabem 9 de néctar — três viagens. A cor vai puxando pra da variedade conforme enche. |
| `madura` | Pronta pra colher. Rende `potes` = néctar ÷ 3, então esperar encher vale mais. |
| `ninhada` | Ovo → larva → abelha nova. |

Preço de célula nova: `19 * 1.18^(n_compradas)`, arredondado.

### 2.2 Abelhas
As de dentro **não ficam paradas**: caminham de célula em célula pelo favo. A
posição (`de`, `para`, `andar`) mora na simulação, não no desenho, porque tem
consequência — a rainha põe o ovo exatamente na célula onde ela parou.

Operárias preferem o silo de pólen e as células com néctar, que é onde o mel é
feito. A cura dura **5 s**: a abelha chega com pólen numa célula que já tem
pelo menos uma carga de néctar, corre a barrinha e o mel fica pronto, gastando
pólen na proporção do néctar que fechou. Uma visita fecha a célula — não existe
cura pela metade. É nessa tarefa que o clima e a estação pesam.

Sem pólen não há cura. Para a colmeia nunca travar de vez, toda coletora de
néctar volta com **40% do pólen** que a carga dela vai consumir — a colônia
sozinha faz mel devagar, e dedicar abelhas ao pólen leva a produção ao total.
O favo mantém sempre **um silo à vista**, mesmo zerado, e quando falta pólen
com célula pronta na mesa o jogo avisa na tela. A rainha vagueia, mas quando está com um ovo pronto **vai direto à
célula vazia mais próxima**: a janela de postura é curta (só com o favo quente)
e vaguear ao acaso a fazia passar batido.

O relógio da postura só reinicia quando o ovo é de fato posto. Se não houver
célula vazia, ele fica pendente — e é por isso que **quem não colhe não cresce**:
o favo entope de mel e a rainha não tem onde pôr.

Máquina de estados: `colmeia → indo → coletando → voltando → colmeia`.
A rainha ocupa uma célula e não sai.

Oito atributos, todos escaláveis por nível (o painel de stats do jogo):

| Atributo | Efeito |
|---|---|
| velozes | −% tempo de viagem |
| eficientes | +% néctar → mel na conversão |
| supercoletoras | +% capacidade de carga por viagem |
| área do feromônio | +raio hex do buff da rainha |
| poder do feromônio | +% força do buff dentro do raio |
| resistentes | −% risco de perda em voo |
| dano | + dano em eventos de defesa |
| pote de mel | +capacidade de estoque por variedade |

### 2.3 Estações
Ciclo fixo de 4 estações. Cada estação aplica um bloco de modificadores globais
**discretos** (não interpolados) e um alvo de ambiente:

| | Primavera | Verão | Outono | Inverno |
|---|---|---|---|---|
| Produtividade | **100%** | 90% | 80% | **70%** |
| Rebrota das flores | 70% | 45% | 25% | 8% |
| Risco de voo | +5% | 0% | +18% | +35% |
| Preços do mel | −10% | −5% | +5% | **+25%** |
| Temperatura ambiente | 18 °C | 32 °C | 24 °C | 6 °C |
| Umidade | +8% | −5% | +3% | +10% |
| CO₂ | +0 ppm | +2 ppm | +5 ppm | +8 ppm |

A primavera é o auge da florada; o inverno rende 30% menos. A `produtividade`
vale para as duas etapas — coletar no campo e trabalhar o mel no favo — porque,
quando só a coleta era sazonal, o favo estocava néctar nas estações boas e a
abelha de casa processava a fila no inverno, achatando as quatro estações. A
coleta leva o efeito cheio (é ela que quase sempre é o gargalo) e o favo leva
uma versão suave.

Consequência de design: **o inverno produz menos e paga mais.**

Consequência de design: **acumula no verão, vende no inverno.**

### 2.4 Clima da colmeia
Três medidores com faixa ideal. Derivam do ambiente da estação + população
(mais abelhas = mais calor e CO₂) e são empurrados de volta por boosts pagos.

| Medidor | Ideal | Fora da faixa |
|---|---|---|
| Temperatura | 33–36 °C | cura lenta; abaixo do mínimo a rainha para de pôr |
| Umidade | 50–65 % | mel não cura / mofo |
| CO₂ | < 800 ppm | abelhas menos eficientes |

A colônia termorregula nos dois sentidos — aquece tremendo, resfria ventilando
— mas com **autoridade limitada** (graus por abelha, até um teto). Colmeia
pequena não vence o inverno; colmeia grande não superaquece no verão. O CO₂ funciona igual: respirar sobe, abanar as asas na
entrada desce, e a ventilação também tem teto — por isso uma colônia grande
demais volta a abafar o favo mesmo ventilando.

Boosts: Ar-Condicionado (50), Aquecer a Colmeia (50), Aumentar Umidade (50),
Turbinar Abelhas (100).

### 2.5 Campos de coleta
`{ taxa/min, tempo de viagem, néctar máx, néctar atual, rebrota, risco, variedade, slots }`

Três upgrades por campo, com pips de nível e custo crescente:
- **Agricultura Sustentável** → +néctar máximo
- **Rota de Voo** → −tempo de viagem
- **OGM** → +taxa de coleta

Campos novos desbloqueiam por nível de colmeia (3, 7, 11…). Campo melhor =
mais taxa e melhor variedade, em troca de mais risco e viagem mais longa.

### 2.6 Variedades de mel
Flor Silvestre, Acácia, Trevo, Florada. Cada uma tem preço-base e volatilidade
próprios. Trocar a variedade de uma célula custa moedas (custo crescente).

### 2.7 Silo de pólen
Uma célula do favo guarda o pólen — é o hexágono com o número grande. Coletoras
dedicadas trazem pólen de fora; as abelhas de dentro gastam esse estoque para
curar néctar em mel (`polenPorMel`). Uma coletora dedicada costuma bastar, mas
zero coletoras param a colmeia inteira.

O pólen não consome o néctar do campo: o limite dele é quantas abelhas você
tira da coleta de néctar, não o estoque da flor. É a segunda decisão de
alocação do jogo, e a mais punitiva se esquecida.

### 2.8 Feromônio da rainha
A mensagem química que organiza a colônia. `raio` diz até onde alcança no favo;
`poder` diz quanto rende dentro do alcance. As operárias colhem
`1 + poder × cobertura`, onde cobertura é a fração das células abertas dentro
do raio. Expandir o favo além do alcance dilui a cobertura — **crescer o favo
tem um custo escondido**, e os dois upgrades da rainha existem pra pagá-lo.

### 2.9 RAX — Bolsa Real de Apicultura
`preço = base × (1 + viés_sazonal) × ruído`
O ruído é um passeio aleatório com reversão à média — sobe e desce, mas sempre
volta. Segurar estoque é apostar; vender na baixa é perder margem.

### 2.10 Meta anual
`meta(ano) = 11 × 1.55^(ano-1)` → 11, 17, 26, 41, 63, 98, 153, 236, **366**.
Contabiliza **valor vendido**, não mel produzido. Não bateu, acabou; bateu no
Ano 9, venceu.

O crescimento é 1,55 e não 1,6 por medição: com 1,6 a meta do Ano 9 (472)
encostava no pico de produção e a partida virava sorte — só 1 de 4 sementes
vencia com a mesma estratégia. Com 1,55 são 7 de 8, e um jogador ruim ainda
morre no Ano 2.

### 2.9a Ninhada
Existe **uma ninhada por vez** no favo. A rainha põe onde está parada, cuida
daquele ovo até nascer e só então põe o próximo — os ovos não se espalham pelas
células. Por isso o ciclo (pôr + chocar) é curto: ele é o teto do crescimento da
colônia, não um detalhe.

### 2.9b O trabalho dentro do favo
A célula **não cura sozinha**. Uma operária de dentro vai ao silo, pega pólen
(~1,5 s), leva até uma célula cheia de néctar e trabalha nela **~5 s** — a
barrinha sobre a abelha é essa tarefa. Ao fim, o mel está pronto pra colher.

Isso dá emprego às abelhas de dentro, que antes só aqueciam o favo, e faz a
divisão campo/casa ser a decisão central: quem colhe néctar não faz mel.
**Mandar todas pro campo é permitido e para a produção** — é escolha do jogador.

A cada **45 s** a operária larga a tarefa e vai comer, tirando 0,06 de mel do
mesmo pote do jogador. Com fome ela não para: fica **50% mais lenta**, no
trabalho e no passo. Medido: a mesma cura leva 5,1 s saciada e 10,5 s faminta.

### 2.10b Alimentar a ninhada
A colmeia começa com **1 rainha e 2 operárias**. Tocar num ovo abre um balão com
a eclosão em % e dois botões: *dar 1 mel* e *dar 5 mel*. Cada pote adianta
`avancoPorMel` da eclosão (10%), então dez potes chocam um ovo do zero.

Gasta sempre a variedade **mais barata** disponível: o mel caro rende mais na
RAX do que dado de comer, e o jogador não deveria ter que pensar nisso.

É a ponte que faltava entre as duas metades do jogo — até aqui o mel só servia
para vender. Agora esperar é grátis e ter pressa custa produção.

### 2.11 Save e tempo parado
Autosave a cada 10 s de jogo, mais ao sair da aba (`pagehide`) e ao esconder.
Guarda em `localStorage`; se o armazenamento estiver bloqueado, o jogo segue
rodando sem salvar em vez de quebrar.

Campos guardam só a parte mutável (néctar, turmas, upgrades) — nome, taxa,
risco e slots voltam do catálogo na carga. Assim rebalancear um campo ou
acrescentar um novo vale para saves antigos em vez de ficar congelado neles.

**Não há progresso offline: com o jogo fechado, a colmeia fica parada.** Dez
dias fora equivalem a dez segundos fora. O relógio do jogo é `decorrido`, que só
anda enquanto a aba está visível — o laço checa `document.hidden` em vez de
confiar no `requestAnimationFrame`, porque o navegador às vezes apenas reduz a
frequência em vez de suspendê-lo.

A consequência de design é o ponto: **a meta anual só corre quando o jogador
está jogando.** Ninguém perde a colmeia por ter fechado a aba, e o Ano 15
mede uma hora de jogo, não uma hora de calendário. O `salvoEm` do save é
informativo (aparece no menu como "salvo há X min") e não influencia o estado.

### 2.12 Progressão
XP de colmeia por venda e por colheita → nível → desbloqueia campos, células e
slots de boost.

---

## 3. Linguagem visual

Quatro regras produzem 80% do "look":

1. **Uma paleta de ~10 cores interpolada pela estação.** Fundo, favo, sombra,
   HUD e partículas derivam dela. O jogo muda de humor sem trocar um asset.
   Modificadores mudam de forma discreta; a paleta transiciona contínua.
2. **Uma sombra longa direcional** (offset ~110/85 px, blur 70, alfa ~0.2) sob
   a silhueta unificada do favo. É a assinatura do estilo.
3. **Raio de canto exagerado** em todo painel + tipografia sans em CAIXA ALTA
   com `letter-spacing` ~0.15em nos rótulos, números em bold grande.
4. **Partículas ambientais que trocam por estação:** pétalas → pólen → folhas →
   neve. Sempre poucas, sempre lentas.

Ícones: line-art 2px monocromático, sem preenchimento. Tooltips: marrom quase
preto, texto creme, raio grande.

---

## 4. Arquitetura

```
src/
  core/   rng, estado serializável, save/migração
  sim/    hex, estações, clima, abelhas, campos, mel, mercado, meta, ações, economia
  render/ paleta, primitivas de canvas, favo, cena, partículas
  ui/     layout, zonas, hud, rax, campos
docs/     GDD.md, BALANCE.md, DUVIDAS.md
servidor.py    dev server sem cache
testes/save.js testes do save (rodar no console)
```

Duas fontes únicas de verdade que evitam bug de UI em canvas: `ui/layout.js`
guarda todas as medidas de tela, e `ui/zonas.js` registra as áreas clicáveis a
partir do próprio código de desenho (com recorte, para listas roláveis).

Regra dura: **`sim/` não conhece `render/`.** Todo o núcleo é função pura sobre
o estado, com tick fixo de 1/30 s e RNG semeado. Isso dá três coisas de graça:
progresso offline por fórmula, replay determinístico pra debugar economia, e
portabilidade pra Godot sem reescrever o jogo — só o desenho.

---

## 5. Roadmap

| Fase | Entrega | Estado |
|---|---|---|
| 0 | Hex, estações, paleta, clima, render base | **feito** |
| 1 | Abelhas, coleta, cura, colheita manual, ninhada, risco de voo | **feito** |
| 2 | RAX, meta anual, virada de ano, derrota, progresso offline | **feito** |
| 3 | Painel de campos, alocação de turma (néctar + pólen), upgrades | **feito** |
| 3b | Campos 2 e 3, mais slots, curva de XP que destrave níveis | **feito** |
| 3c | Escala do silo, vazão de pólen, termorregulação | **feito** |
| 3d | HUD responsivo, favo que se dimensiona, alvos de toque | **feito** |
| 4 | Save/load, progresso offline, menu | **feito** |
| 4b | Ventilação, vitória no Ano 9, meta a 1,55 | **feito** |
| 5 | Tutorial, i18n, som, aluguel na UI | **próxima** |
| 5 | Tutorial, i18n, som, feromônio | |
| 6 | Port Godot, IAP, lojas | |

---

## 6. A tensão que emergiu dos testes

Não foi projetada, apareceu sozinha quando os sistemas rodaram juntos, e é
provavelmente a decisão mais interessante do jogo:

**Abelha na colmeia aquece a colmeia. Abelha no campo traz néctar.**

A eclosão só avança com a temperatura na faixa, e a temperatura sobe com o
número de abelhas *dentro*. Então mandar todo mundo pro campo congela a
colônia e ela para de crescer; deixar todo mundo em casa aquece bem, mas não
entra néctar. A alocação de turma vira um termostato, não um simples "mais é
melhor".

Medido: com a turma fixa em 2, a colônia chegou a 18 abelhas e ao Ano 3. Com a
turma no máximo, chegou a 8 abelhas e morreu no Ano 2.

## 7. Aberto
Ver `docs/DUVIDAS.md`.

## 8. As sete funcionalidades

Entraram todas de uma vez, cada uma com testes em `testes/funcionalidades.js`.

### 8.1 Preparar o inverno — `sim/inverno.js`, `ui/inverno.js`
Painel que aparece sozinho nos últimos 25 s do outono e some na primavera.
Mostra a previsão de consumo (`reservaInverno`), quantas coletoras ainda estão
fora e quanto falta para a mais atrasada voltar. `aTempo` compara essa volta com
o que resta de outono — é a diferença entre "ainda dá" e "essa não volta".
O botão **recolher todas** zera as turmas e traz voando quem está no ar; não
teletransporta, senão o "volta em Xs" não significaria nada.

### 8.2 Colmeia visual — `render/ornamentos.js`
Três sinais em volta do favo, um por conquista: **moldura de cera** que engrossa
com as células compradas, **contas** na borda (uma por ano sobrevivido, dando a
volta como mostrador) e **flores** (uma a cada duas melhorias de campo). Os
enfeites se penduram nas células de borda, não num círculo — o favo não é
redondo. Têm piso em pixels: escalando só por `tam`, sumiam com 1,5 px justo
quando havia mais o que mostrar.

### 8.3 Floradas temporárias — `sim/floradas.js`
A cada 90-150 s um campo aberto floresce por 25 s: taxa ×1,6, reserva ×1,5 e
enche na hora. Nunca duas ao mesmo tempo, nunca no inverno, e nunca uma que a
virada do inverno cortaria pela metade. `statsComFlorada` embrulha
`statsDoCampo` — a florada é regra com tempo, e `economia.js` só guarda
constantes. O painel de campos acende o cartão e o botão ✿ ganha selo pulsante.

### 8.4 Encomendas — `sim/encomendas.js`, `ui/encomenda.js`
Um pedido por vez: N potes de uma variedade, com prazo no fim de uma estação
("até o outono"). **Entregar é vender** — não há botão separado, e o mesmo pote
conta para a encomenda e para a meta do ano, então nunca compensa segurar mel
esperando pedido. Paga 1,5× o preço-base. Vencer não custa nada: é objetivo
extra, não segunda meta.

### 8.5 Bênção da primavera — `sim/bencaos.js`, `ui/bencaos.js`
Toda virada de ano abre **três cartas** e pausa a simulação até o jogador
escolher. Duas regras dão a variedade:

1. **O baralho é grande**: quinze cartas para nove escolhas, então nenhuma
   partida vê tudo e duas partidas não veem o mesmo.
2. **O valor é sorteado na hora da oferta**, dentro da faixa de cada carta.
   "Rota Curta 9%" e "Rota Curta 15%" são a mesma carta e decisões diferentes —
   é isso que impede a terceira primavera de parecer a primeira.

| Campo | Favo | Colônia | Bolsa |
|---|---|---|---|
| Rota Curta (coleta) | Mãos de Cera (tempo do mel) | Rainha Fértil (eclosão) | Bom Negociante (preço) |
| Vento a Favor (viagem) | Passo Firme (andar no favo) | Corpo Quente (aquecer o favo) | Freguesia Fiel (encomendas) |
| Guardiãs Atentas (risco) | Pólen Farto (custo do mel) | Boca Pequena (consumo de mel) | |
| Terra Fértil (duração da florada) | Feromônio Forte (organização) | Cera Isolante (inverno) | |
| | Cera de Sobra (preço da célula) | | |

Teto de 3 níveis por carta, e o estado guarda o **total somado** (não o nível
vezes um valor fixo): com valor sorteado, duas escolhas da mesma carta podem
valer 9% e 15%, e recalcular pelo nível perderia isso. Save antigo, que
guardava só o nível, é convertido em vez de descartado.

A carta mostra o valor da oferta e, se a bênção já foi escolhida antes, quanto
ela já rende acumulado — repetir tem que ser decisão informada.

### 8.6 Desafios — `sim/desafios.js`
Escolhidos no menu, valem para a próxima partida: **espaço apertado** (célula
+80%), **campos perigosos** (risco ×2) e **inverno rigoroso** (inverno −30%).
Cada um é um multiplicador em dois ou três pontos — foi para isso que a regra de
"nenhum número mágico espalhado" existia.

### 8.7 Personalidade — `sim/talentos.js`
Quatro em dez operárias nascem comuns; as outras nascem **batedora** (coleta
+25%), **ceroma** (trabalho no favo +25%) ou **guardiã** (metade do risco de
voo). Marca colorida nas costas, elenco somado no cabeçalho do painel de campos.
O jogador escolhe **quantas** vão ao campo; qual vai é ofício da colmeia — a
vaga do campo é da batedora e a da guarda é da guardiã.

### 8.8 Câmera — `render/favo.js`, `ui/camera.js`
O favo era fixo no centro, e cartão de aviso em cima dele não tinha como sair
da frente. Agora **arrastar move a vista**; o toque curto (menos de 6 px) segue
sendo toque, então comprar e colher continuam iguais. O deslocamento é limitado
a 42% da tela pra ninguém empurrar o favo pra fora e ficar sem referência.

Voltar ao centro: **duplo clique no fundo** (não sobre célula nem sobre painel,
pra não somar dois toques num hexágono) ou o botão **centralizar**, que só
aparece quando a vista saiu do lugar — no celular é ele que faz o papel do
duplo clique.

A câmera entra em `geometriaFavo`, que é a mesma função que o desenho e o
hit-test do toque usam. Se cada um tivesse a sua origem, tocar numa célula
depois de mover a vista acertaria a célula errada — há teste varrendo o favo
inteiro com a vista deslocada pra travar isso.

**Zoom** de 0,8 a 1,6, em passos de 0,15: faixa curta de propósito, porque o
favo já se ajusta sozinho à tela — o zoom existe para o favo grande, em que a
célula encosta no mínimo (22 px) e os números ficam difíceis de ler no celular.
Botões **+** e **−** encostados na borda direita, acima da fileira de ações; no
PC a roda do mouse faz o mesmo. O zoom multiplica o tamanho do hexágono depois
do ajuste automático e escala em torno do centro do favo, que por isso não sai
do lugar. **Centralizar** zera as duas coisas, deslocamento e zoom.

Não vai pro save: enquadramento é vista, não estado de jogo.

### 8.9 Dicas de primeira vez — `sim/dicas.js`, `ui/dicas.js`
O jogo não tem tutorial, e mecânica que aparece do nada no meio da partida só é
entendida por quem já entendeu. A dica da **florada** aparece nas duas primeiras
vezes em que um campo floresce e nunca mais — o contador (`dicasVistas`) vai no
save justamente pra isso.

Não pausa: a florada está acontecendo agora, e parar o jogo pra ler sobre ela
seria contraditório. Fecha com um toque em qualquer ponto do cartão, e some
sozinha quando a florada acaba, porque aí ela perdeu o assunto.

Acrescentar dica para outra mecânica é só uma entrada em `DICAS` mais a chamada
de `mostrarDica` onde ela acontece.

### 8.10 A ninhada se transforma — `render/favo.js`
O ovo era uma elipse parada que só ganhava opacidade, e ninhada parada é a
coisa mais sem vida do favo: dava pra olhar duas vezes e não saber se tinha
andado. Agora cada cria atravessa **ovo → larva → abelha** conforme a própria
eclosão avança:

| Progresso | O que se vê |
|---|---|
| até ~30% | elipse creme, fina e quase imóvel |
| ~30-50% | engorda e começa a puxar para o amarelo |
| ~50% | listras aparecem, recortadas no corpo |
| ~62% | a cabeça escura surge — vira bicho, não semente |
| ~78% | asas brotam por trás |
| 100% | abelha, e nasce |

O ritmo também conta: a cria respira devagar no começo e se mexe cada vez mais
perto de nascer, com fase própria por célula e por ovo — três crias respirando
em uníssono pareceriam um relógio, não uma ninhada.

## 9. As catorze ideias

### 9.1 Polinização paga — `ui/campos.js`
A mecânica existia inteira em `acoes.js` desde sempre e **nunca teve botão**.
Agora fecha a lista do painel de campos: manda uma operária para fora por 90 s e
ela volta com 26 moedas certas. É a única renda que não passa pelo mel, e o
preço é o corpo que faria mel — por isso mora junto das turmas, não na bolsa.

### 9.2 CO₂ e umidade passaram a valer — `sim/clima.js`
Os dois desviavam bastante (CO₂ passa de 800 ppm em 17-32% de uma partida e
chega a 2.000; umidade fica fora da faixa em 51% do tempo) e quase não tinham
consequência. Agora cada medidor tem **um** efeito próprio e nomeável:

| Medidor | O que ele mexe |
|---|---|
| temperatura | ninhada: postura e eclosão |
| CO₂ | ritmo das abelhas dentro do favo (−35% no pior caso) |
| umidade | com que rapidez a fome chega (−25% no intervalo) |

Com isso os boosts **Ventilar** e **Umidificar**, que eram promessa falsa,
passam a ter razão de existir.

### 9.3 Histórico dos anos — `ui/historico.js`
`estado.historico` guardava meta, vendido e se bateu, ano a ano, e a única
coisa que lia isso eram as continhas de cera. Virou tabela, aberta pelo menu,
com o ano em curso em cinza no fim.

### 9.4 Posto Avançado — quarta melhoria de campo
Os campos somavam 15 vagas fixas e a colônia passa de cem abelhas. Cada nível
de posto abre **uma vaga** no campo, até quatro, com custo subindo 85% por
nível: crescer a colônia volta a ter para onde ir, sem virar automático.

### 9.5 Enxameação — `sim/enxame.js`
Passando de 3,2 operárias por célula aberta, a colmeia se prepara para
enxamear e dá 30 s. Duas saídas de verdade: comprar célula (a pressão passa e
ninguém sai) ou deixar partir — metade das operárias vai embora e **o enxame é
vendido** a 22 moedas por abelha. Não é punição, é a colônia grande cobrando
espaço.

### 9.6 Chuva e seca — `sim/tempo.js`
A estação era o mesmo número do primeiro ao último segundo. Agora, a cada
100-180 s, uma janela de 18 s vira o tempo, e cada tipo ataca um lado
diferente: **chuva** derruba a coleta a 15%; **seca** derruba a rebrota a 8% e
o néctar acumulado acaba. Aparece na própria faixa da estação, em vermelho.

### 9.7 Mel misturado — `MISTURA` em `economia.js`
A variedade `florada` existia no catálogo e nenhum campo produzia. Virou o
produto da mistura: um pote de cada variedade de campo vira um pote de florada,
que vale 34 contra 29 das três somadas — e concentra valor em menos potes, o
que importa porque cada venda empurra o preço daquela variedade para baixo. O
custo real é ter as três ao mesmo tempo, ou seja, guarnecer os três campos.

### 9.8 A rainha envelhece — `sim/rainha.js`
Era o único elemento da colmeia que não mudava nunca. Agora tem dois anos de
auge e mais quatro de declínio até 35% de vigor — a postura vai de 8 s para
23 s. Coroar uma nova custa 6 de mel e **25 s sem postura** enquanto ela
amadurece. O painel abre tocando na célula da rainha.

### 9.9 Urzal da Neblina — quarto campo
Os três campos eram a mesma ideia em três intensidades: mais longe = mais rico
= mais perigoso. O Urzal quebra o padrão — é o mais rápido do jogo (52/min),
perto (6 s) e sem risco, mas guarda pouco (55) e se recompõe a um quarto da
velocidade. Rende muito por pouco tempo e obriga a mudar a turma de lugar.

### 9.10 Formigas — `sim/formigas.js`
A vespa ataca as abelhas; a formiga ataca o **vidro**. Enquanto a fila estiver
aberta ela leva mel (~2 potes em 25 s), e vedar a entrada custa 12 moedas.
Ameaças de natureza diferente de propósito: uma custa produção, a outra custa
dinheiro, e as duas custam atenção.

### 9.11 Dicas para todas as mecânicas
O sistema de dicas de primeira vez passou a cobrir florada, tempo virado,
enxame, formigas, encomenda, vespa, inverno e a bênção da primavera. A da
primavera é desenhada **por cima** do modal — é a única que explica algo que
está bloqueando a tela.

### 9.12 Som — `render/som.js`
Web Audio puro, sem nenhum arquivo. Um zumbido de dois osciladores
desafinados, que engrossa e sobe com a população e cala quando o jogo está
pausado, mais três toques curtos (colher, vender, aviso). Nasce no primeiro
toque na tela, por causa da política de autoplay, e se cala junto com a aba.
Botão de ligar/desligar no menu, preferência guardada no navegador.

### 9.13 Velocidades 6× e 10×
O ciclo era 1× → 3×; do Ano 6 em diante 3× já parece devagar. Agora é
1 → 3 → 6 → 10. O passo fixo de 1/30 s aguenta: a 10× são cinco passos por
quadro a 60 fps.

### 9.14 Desafios travados — `core/conquistas.js`
Eles eram o motivo de rejogar e estavam disponíveis desde o primeiro minuto.
Agora abrem com a primeira vitória. As conquistas moram **fora do save da
partida**: recomeçar apaga a colmeia, não o que o jogador já provou.

### 9.15 O sino de avisos — `sim/avisos.js`
Com inverno, enxame, formigas, vespa e encomenda podendo acontecer ao mesmo
tempo, cinco cartões empilhados cobriam o favo — que é justamente o que o
jogador quer olhar. Eles saíram da tela e foram para trás de um **sino** na
fileira de ações.

- O sino traz um **contador** com quantos avisos estão valendo.
- **Pisca** enquanto houver aviso que o jogador ainda não abriu, e só por causa
  dos urgentes (enxame, formigas, vespa) — a encomenda entra na conta mas não
  faz piscar, porque perder o prazo dela não custa nada.
- Abrir marca tudo como visto; um aviso que chega **depois** volta a piscar.
- Dentro do painel os cartões empilham na ordem de urgência: enxame → formigas
  → vespa → inverno → encomenda. O da vespa, que morava solto no canto de baixo
  e caía por cima da encomenda, entrou na mesma coluna.

O aviso efêmero no alto da tela continua aparecendo a cada evento: é o "algo
aconteceu"; o sino é o "o que ainda está acontecendo".

### 9.16 Cartões minimizáveis — `ui/cartao.js`
Todo cartão que aparece sozinho tem um **−** no canto. Minimizado, ele vira uma
pílula com o título, o número que importa e um ponto da cor do cartão — dá pra
distinguir enxame de formiga sem ler. Um toque devolve o cartão inteiro.

Não é fechar, é encolher: a informação continua valendo enquanto o aviso durar,
e some sozinha quando ele acabar. O estado de aberto/fechado mora na `ui`, como
a câmera — não vai pro save nem sobrevive a um recomeço.

### 9.17 Tela de início — `ui/inicio.js`
O jogo abria já correndo: quem voltava depois de um tempo caía no meio de uma
partida sem saber em que pé estava, e quem queria recomeçar tinha que achar o
menu. Agora abre numa tela de início, com o favo parado atrás.

Ela faz três coisas que nenhuma outra tela fazia:

1. **Deixa escolher antes de o relógio andar.** `ui.tela` fica em `inicio` até o
   jogador entrar, e o laço só chama `passo()` em `jogo`. Continuar mostra em
   que ponto a partida está (ano, estação, abelhas).
2. **Mostra o desafio da próxima partida antes dela começar**, que é o único
   momento em que essa escolha tem sentido. A grade é a mesma do menu, num
   módulo só (`ui/desafios.js`) — duas cópias divergiriam no primeiro desafio
   novo.
3. **Dá o primeiro toque na tela**, que é o que a política de autoplay do
   navegador exige para o som poder existir. O botão de som está ali também.

O rodapé guarda o que a colmeia já provou: *sobreviva a 9 anos* na primeira
vez, *melhor até agora: ano N* depois de perder, *colmeia vencedora* depois de
vencer.

Fim de partida passou a voltar para cá em vez de recomeçar no toque: a colmeia
encerrada continua na tela até o jogador decidir. Como `Continuar` some quando
há derrota ou vitória, a única saída é começar de novo — mas por escolha, não
por um toque distraído.

### 9.18 Correção: perder e não conseguir recomeçar
A tela de início entrou desenhada **antes** da tela de fim de partida. Como a
tela de derrota registra uma zona de tela inteira (`derrota:reiniciar`) e a
última zona registrada ganha o hit-test, o que acontecia era:

1. o jogador perdia e via "a colmeia não sobreviveu ao ano N";
2. tocava — o toque ia para a tela de início, que estava **atrás** e invisível;
3. o tratador da tela de início não conhecia `derrota:reiniciar` e engolia o
   toque em `default`.

Resultado: a partida travava na tela de derrota. Duas correções, e as duas
valem por si:

- a tela de início passou a ser desenhada **por último**, acima até do fim de
  partida — ela é a única tela que precisa estar sempre por cima;
- o tratador da tela de início passou a entender `derrota:reiniciar` e
  `vitoria:reiniciar` como "começar de novo", para o caso de a zona vencer o
  hit-test por algum outro caminho.

Há teste travando a ordem de desenho: ele lê `render/cena.js` e verifica que
`desenharInicio` aparece depois de `desenharDerrota` e `desenharVitoria`.

### 9.19 Tutorial guiado — `sim/tutorial.js`, `ui/tutorial.js`

Quem chegava sem conhecer o jogo não entendia o que estava vendo. O botão
**tutorial · aprender jogando**, na tela de início, começa uma partida normal
com um roteiro de **12 passos** por cima dela.

Não é um texto que se fecha e esquece. Cada passo pede **uma** coisa e só sai
da frente quando ela acontece:

| tipo | como avança |
| --- | --- |
| `leitura` | explica e espera o toque em **entendi** |
| `acao` | pede algo e espera acontecer — `concluido(estado, ui, marca)` decide |

O roteiro: boas-vindas → abrir os campos → mandar uma coletora → ver o néctar
chegar → por que néctar não é mel (o silo de pólen) → esperar o mel → colher →
vender → a meta do ano → o inverno → o sino → fim. No fim `estado.tutorial`
vira `null` e **a mesma partida continua** — não existe "modo tutorial" para
depois recomeçar do zero.

Detalhes que o roteiro exigiu:

- **`comecarTutorial` zera as turmas dos campos.** O passo pede que o jogador
  mande a primeira coletora; se ela já estivesse escalada, o passo estaria
  cumprido antes de ser lido.
- **`marca`** guarda um valor tirado no início do passo para comparar depois.
  `colher` usa isso: guarda o mel no vidro e espera ele subir — mais confiável
  que procurar a célula que sumiu.
- **`avancarTutorial` é chamado do laço de `main.js`, não do `passo()`.** Alguns
  passos olham se um painel está aberto, e `sim/` não conhece a interface.
- **O cartão é desenhado por último, acima de qualquer painel** — o passo
  costuma mandar abrir um painel, então a instrução não pode sumir atrás dele.
  Fica abaixo só da tela de início (§ 9.18).
- **Passo de ação não tem botão de avançar**, e no lugar dele fica
  *pular tutorial*: ninguém pode ficar preso.
- O tutorial **sobrevive ao save**: recarregar no meio não perde o lugar.

Tempo do roteiro inteiro, medido com um jogador ideal: **23 a 26 s** de jogo
(sementes 42, 7 e 123).

#### O alerta de "todas foram pro campo"

A colônia começa com a rainha e **duas** operárias. Mandar as duas para o campo
é permitido de propósito (ver o comentário em `alocar`, `sim/acoes.js`): sem
ninguém dentro, o néctar empilha e nada vira mel — é escolha do jogador.

Só que quem está no tutorial toca o `+` duas vezes **sem saber disso**, e o
passo *espere o mel* fica parado. Medido: com 1 coletora o primeiro mel sai em
**22,8 s**; com 2, em **146,4 s** — e a tela não diz por quê.

Por isso um passo pode ter `alerta(estado)`, que devolve linhas desenhadas em
vermelho dentro do cartão. O de *espere o mel* dispara quando todas as
operárias estão reservadas para campos e manda tirar uma do néctar.

> A regra do jogo não mudou — só deixou de ser invisível para quem está
> aprendendo.
