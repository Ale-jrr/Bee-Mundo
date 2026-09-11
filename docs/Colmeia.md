# Colmeia

Jogo de apicultura em grade hexagonal. Você cuida de uma colmeia por alguns
anos: manda abelhas ao campo, transforma néctar em mel, vende, e sobrevive ao
inverno, às vespas e à meta de cada ano.

> **Onde isto vive.** O original fica em `colmeia/docs`, dentro do repositório —
> é lá que as notas são versionadas junto com o código. O vault do Obsidian
> (`obsidian - colmeia/bee mundo`) é um **espelho para leitura**, que eu
> atualizo quando você pedir. Suas próprias anotações podem ficar no vault à
> vontade: eu só sobrescrevo estas cinco notas.

---

## Por onde começar

| nota | o que é |
| --- | --- |
| [[Mapa do código]] | onde cada coisa mora — a nota mais útil quando você não lembra onde mexer |
| [[GDD]] | o documento de design: cada sistema, e **por quê** ele é assim |
| [[BALANCE]] | os números, as medições e o jogador-robô |
| [[DUVIDAS]] | decisões de mecânica que você respondeu, e o que eu tinha entendido errado |

---

## Estado atual

**v0.15.0** · 529 testes, 0 falhas · repositório em
[Ale-jrr/Bee-Mundo](https://github.com/Ale-jrr/Bee-Mundo)

Uma partida é escolhida em três eixos independentes, mais o bioma:

| eixo | opções |
| --- | --- |
| bioma | Mata Atlântica · Caatinga · Cerrado · Campos do Sul |
| duração | Curta 4 anos (~56 min) · Média 6 (~84) · Longa 9 (~126) |
| dificuldade | Tranquila 0,75× · Normal 1× · Dura 1,3× · Brutal 1,5× |
| desafio | Comum · Espaço Apertado · Campos Perigosos · Inverno Rigoroso |

Cada bioma traz seus campos, seu clima e **sua espécie de abelha** —
africanizada, jandaíra, mandaçaia ou carníola. Abelha sem ferrão não para vespa
na porta, e é isso que muda o jogo de verdade entre um bioma e outro.

---

## Como rodar

```bash
py servidor.py 5173 .
```

Abre em `http://localhost:5173`. O servidor manda `no-store` de propósito: o
`http.server` padrão faz o navegador reusar módulos ES do cache, e isso já fez
uma medição de balanço rodar contra código velho sem avisar.

**Testes** — no console do navegador, com a página aberta:

```js
for (const n of ['funcionalidades','save','regressoes','ovos','predadores','frio','inverno','robo'])
  console.log(n, await (await import(`/testes/${n}.js`)).rodar());
```

**Medir balanço** — o jogador-robô, que existe porque sonda escrita na hora
mentiu quatro vezes (a história está em [[BALANCE]]):

```js
(await import('/testes/robo.js')).medirBalanco()
```

---

## Regras da casa

São quatro, e cada uma nasceu de um problema real:

1. **`sim/` nunca importa `render/`.** A simulação não sabe que existe tela.
2. **Todos os números de balanço vivem em `sim/economia.js`.** Foi isso que fez
   desafios, dificuldades e biomas saírem baratos — cada um é um multiplicador
   aplicado em dois ou três pontos.
3. **Nada de duplicar lista.** `CAMPOS` já foi uma segunda cópia dos campos e
   divergiu em silêncio; hoje é `BIOMAS.mata.campos`.
4. **Nada de calendário escrito à mão nos testes.** `decorrido = 180` para
   dizer "inverno" quebra no dia em que a estação muda de tamanho — e quebrou.

---

## O que está aberto

- **Publicar.** O jogo não está no ar em lugar nenhum: são 736 KB de arquivos
  estáticos rodando num servidor local. GitHub Pages resolve de graça, e sem
  isso qualquer conversa sobre monetização é teoria.
- **Remedir os biomas.** Os fatores de meta foram fechados com **uma semente e
  só o Ano 1**. O inverno do sul e a rebrota lenta da caatinga mordem mais
  tarde.
- **O enxame.** Quando a colmeia divide, a outra metade vira venda. Pode virar
  núcleo que volta depois, ou colmeia de verdade — está sem decisão.
