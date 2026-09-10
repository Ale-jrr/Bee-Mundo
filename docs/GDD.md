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
