# Mapa do código

Onde cada coisa mora. Índice em [[Colmeia]]; o porquê de cada sistema está no
[[GDD]].

São ~7.900 linhas em 57 módulos, sem build e sem dependência externa.

---

## A regra que organiza tudo

```
core/  →  estado e persistência, sem regra de jogo
sim/   →  as regras. NUNCA importa render/ nem ui/
render/→  desenha o mundo (favo, abelhas, vespas, partículas)
ui/    →  desenha painéis e registra zonas de toque
main.js→  o laço, a entrada, e a cola entre os três
```

`sim/` não sabe que existe tela. É o que permite rodar 7.560 segundos de jogo
num laço de console para medir balanço — ver [[BALANCE]].

---

## `sim/` — as regras

| arquivo | o que faz |
| --- | --- |
| **`economia.js`** | **todos os números de balanço.** Variedades, campos, clima, ninhada, silo, upgrades, `META.porAno` |
| **`tick.js`** | o passo da simulação. Clima, ninhada, passeio no favo, coleta, viagem, virada do ano |
| **`acoes.js`** | tudo que o jogador faz: colher, vender, alocar, comprar, alimentar, encomendar pendor |
| `biomas.js` | os quatro biomas, seus campos, seu clima e suas espécies |
| `desafios.js` | os três eixos de partida: desafio, duração, dificuldade |
| `estacoes.js` | o relógio. `SEGUNDOS_POR_ESTACAO` manda em quase tudo |
| `predadores.js` | vespas: aviso → voo → luta, e quem defende a porta |
| `dicas.js` | dicas de primeira vez. As de **ação** pausam o jogo; as de evento, não |
| `tutorial.js` | os 12 passos do tutorial guiado |
| `bencaos.js` | a escolha da primavera (15 cartas, valor sorteado) |
| `talentos.js` | pendor das operárias e o censo da colônia |
| `enxame.js` · `formigas.js` · `floradas.js` · `encomendas.js` · `tempo.js` | os eventos |
| `rainha.js` · `alimento.js` · `inverno.js` · `clima.js` | vigor, fome, reserva, ar |
| `eventos.js` | o espaçador global — impede dois eventos em cima do outro |
| `hex.js` | coordenadas axiais |

## `core/` — estado e persistência

| arquivo | o que faz |
| --- | --- |
| `estado.js` | `novoJogo()`, o formato do estado, helpers de célula e pólen |
| `save.js` | serializa e desserializa. **Lista branca de campos** — campo novo que não entrar aqui some no recarregamento |
| `rng.js` | gerador com semente, guardado *dentro* do estado |
| `conquistas.js` | o que sobrevive ao recomeço (melhor ano, desafios liberados) |
| `ovos.js` | identidade dos ovos dentro da ninhada |

## `render/` — o mundo

| arquivo | o que faz |
| --- | --- |
| `favo.js` | o favo, as abelhas e a câmera. `desenharAbelha` tem asa batendo e sombra |
| `cena.js` | **a ordem de desenho.** Quem fica por cima de quem — já foi causa de bug |
| `vespas.js` | as vespas atravessando a tela |
| `desenho.js` | primitivas: pílula, rótulo, `larguraRotulo` (medir antes de desenhar) |
| `paleta.js` · `particulas.js` · `ornamentos.js` · `som.js` | estação, pétalas, enfeites, áudio |

## `ui/` — painéis e toque

| arquivo | o que faz |
| --- | --- |
| `hud.js` | barra de cima, fileira de ação, boosts. Os ícones são desenhados à mão |
| `campos.js` | o painel central: turmas, vagas e melhorias |
| `inicio.js` | a tela de início e os quatro seletores de partida |
| `layout.js` | **todas as medidas de tela.** `medidas(L, A)` |
| `zonas.js` | zonas de toque, reconstruídas a cada quadro. **A última registrada ganha o hit-test** |
| `abelhas.js` · `rax.js` · `historico.js` · `ninhada.js` · `rainha.js` | os outros painéis |
| `cartao.js` · `dicas.js` · `tutorial.js` · `desafios.js` | cartões minimizáveis, dicas, tutorial, chips |

## `testes/`

Sem runner: cada arquivo exporta `rodar()` e roda no console.

| arquivo | cobre |
| --- | --- |
| `funcionalidades.js` | 391 asserções — o grosso de tudo |
| **`robo.js`** | o jogador-robô e **os testes do próprio robô** |
| `save.js` · `regressoes.js` | persistência e bugs que já voltaram |
| `predadores.js` · `frio.js` · `inverno.js` · `ovos.js` | vespas, morte no frio, inverno, ninhada |

---

## Onde mexer quando…

| quero… | mexo em |
| --- | --- |
| mudar dificuldade, preço, taxa, meta | `sim/economia.js` |
| mudar quanto tempo dura a partida | `DURACOES` em `sim/desafios.js` |
| mudar o tamanho da estação | `SEGUNDOS_POR_ESTACAO` em `sim/estacoes.js` — **remexe o balanço inteiro** |
| acrescentar um bioma ou espécie | `sim/biomas.js` |
| acrescentar um campo | `sim/biomas.js` — e **copie a forma completa**, com `sobre` e `alocadasInicial` |
| mudar o que a abelha faz dentro do favo | `proximoDestino` e `iniciarTrabalho` em `sim/tick.js` |
| acrescentar um botão | `ACOES` em `ui/hud.js` + um `case` em `main.js` |
| guardar um campo novo no save | `core/save.js`, **nos dois lugares** |
