# Dúvidas de mecânica — respondidas

Índice em [[Colmeia]] · o design completo no [[GDD]]

Respostas do Mayk em 2026-09-09. Todas já implementadas.

| # | Pergunta | Resposta | Onde vive |
|---|---|---|---|
| 1 | Colheita | **Manual.** Célula madura pisca e espera o toque; colher esvazia a célula e põe 1 no pote. | `acoes.colher` |
| 2 | Ninhada | **Automática, limitada por clima.** A rainha põe sozinha; a eclosão só avança com temperatura na faixa. | `tick.atualizarNinhada` |
| 3 | Defesa | **Não existe combate.** "Dano" e "resistentes" afetam só o risco de perda em voo. | `tick.atualizarAbelhas` |
| 4 | Aluguel | **Polinização paga.** A abelha sai por 90 s e volta com moedas. | `acoes.alugar` |

| 5 | Feromônio | **Mensagem química que comanda as operárias**, mantendo a união da colônia. | `tick.coberturaFeromonio` |
| 6 | O hexágono com número | **Não era preço: é o silo de pólen.** Coletoras trazem de fora e guardam; as de dentro gastam pra fazer mel. Uma coletora dedicada basta. | `estado.silo`, `tick.atualizarCelulas` |

## Onde eu tinha lido errado

O `19 → 18` das telas de referência eu havia catalogado como "o preço da célula
cai?". Não caía preço nenhum: era **o silo sendo consumido**. Eu tinha modelado
aquele hexágono como célula travada à venda, o que jogava fora o sistema
inteiro de pólen. Corrigido — agora célula travada mostra moeda + preço pequeno
e o número grande no favo é sempre o silo.

## Suposição minha, aberta a correção

A sua descrição do feromônio é biológica, não é uma regra de jogo. Traduzi como:
**cobertura**. O feromônio alcança `raio` hexágonos a partir da rainha; as
operárias rendem `1 + poder × (células dentro do raio / células abertas)`.
Assim "controlar, organizar e manter a união" vira mecânica: quando o favo
cresce além do alcance da rainha, a colônia perde coesão e rende menos, e os
dois upgrades (`área` e `poder`) existem pra recuperar isso.

Se na sua cabeça o feromônio fazia outra coisa — acelerar a cura das células
vizinhas, por exemplo — é uma linha pra trocar.

## Decisão revista

O custo em néctar por ovo foi invenção minha, não estava na sua resposta, e
travava o jogo: num favo pequeno, ter célula vazia e ter néctar guardado nunca
acontecem ao mesmo tempo — nenhuma abelha nascia em 12 minutos de simulação.
Removido. O freio agora é só o que você pediu: **temperatura**. E ele se
autorregula, porque abelha na colmeia esquenta a colmeia.

## Resolvido: o silo é uma célula, e o favo cresce

O silo não é uma estrutura única — é **um estado de célula**, igual a néctar ou
ninhada. Qualquer hexágono do favo vira silo quando chega pólen, e volta a ser
célula vazia quando é esvaziado. Como o favo cresce, a capacidade de pólen
cresce junto. Foi assim que a mecânica passou a escalar.

Eu tinha implementado errado: um silo só, fixo em `(1,-1)`, capacidade 24, que
nunca era criado nem destruído. Isso travava o jogo no Ano 6.

Regras atuais:

| | |
|---|---|
| Capacidade | 12 de pólen **por célula** de silo |
| Vira silo | célula vazia, quando chega pólen e não há silo com espaço |
| Deixa de ser silo | quando é totalmente esvaziada pela cura |
| Guarda | completa os silos existentes antes de ocupar célula nova |
| Consome | esvazia primeiro os silos menos cheios, pra devolver célula ao favo |
| Guarda-corpo | nunca converte a última célula vazia — o néctar precisa de espaço |

Medido numa partida de 7 anos: os silos foram de **1 a 4** conforme o favo foi
de 18 para 32 células, a capacidade de 12 para 48, e o pólen **nunca zerou**.
