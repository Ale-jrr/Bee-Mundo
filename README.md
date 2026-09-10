# Bee Mundo — Colmeia

Jogo de gestão de uma colmeia, em JavaScript e Canvas.

## Executar

Na pasta do projeto: `python servidor.py 5173 .`
Abra http://localhost:5173 no navegador.

## Ponto de retorno

A versão `v0.1.0-base` preserva o jogo antes das sete funcionalidades propostas em 09/09/2026. Inclui estações, alimentação no inverno, perdas por frio, vespas e guardiãs, ovos individuais e melhorias dos campos.

As próximas funcionalidades devem entrar em commits separados. Para retirar uma funcionalidade mantendo mudanças posteriores, revisar dependências e usar um commit de reversão; não apagar o histórico remoto.

O salvamento da partida está no localStorage do navegador (`colmeia:save`) e não faz parte deste repositório. O arquivo ZIP de segurança guarda o código, não a partida.

## Testes

Os módulos em `testes/` exportam `rodar()`. Os testes de save alteram o armazenamento; executar com localStorage isolado para não sobrescrever uma partida real.
