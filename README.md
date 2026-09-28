# Painel PSA — Turmas 2026

Painel das turmas The Best Weekend / The Best Day de 2026. O layout veio do arquivo
`dash-psa-turmas-2026-18.html` (artifact de uso único) e foi portado para Next.js para poder ler
o HubSpot de verdade — o que o HTML não conseguia fazer.

## Rodar

```
npm install
npm run dev     # http://localhost:3000
npm test        # check do relatório de avaliação + dos agregados do snapshot
```

## Abas

| Aba | Fonte do dado |
|---|---|
| Visão Geral | agregados calculados sobre `data/turmas.json` |
| Turmas | `data/turmas.json` — snapshot dos negócios do HubSpot de 02/09/2026 |
| Lista de Espera | `data/espera.json` — 33 nomes, ainda manual |
| Avaliações | `data/avaliacoes.json` + PDFs em `public/arquivos/`; aceita upload de planilha |
| KPIs | referência calculada das turmas + colunas livres do usuário |
| DRE | `data/dre.json` (fechamentos CSX de 21/09/2026) + fechamentos em `public/arquivos/` |

## Estado do dado

`data/turmas.json` é um **snapshot manual** de 416 negócios do pipeline "Funil de Vendas B2C"
com stage Ganho, tirado em 02/09/2026. A integração ao vivo ainda não está ligada: quando estiver,
só `lib/dados.ts` muda — o resto do painel lê dali.

Dois detalhes do snapshot que importam:

- **143 dos 416 registros não têm `hubspot_id`** (são os marcados como "não encontrado") e há 3 ids
  repetidos entre pessoas diferentes. Por isso a identidade da linha é a posição no snapshot
  (`lib/dados.ts`, campo `key`), não o id do negócio. O `test.mjs` trava se isso regredir.
- 90 registros estão sem valor pago preenchido.

## Edições

Status, nota, valor, onboarding, mentoria, DRE e KPIs são editáveis e ficam no `localStorage` do
navegador (`painel-turmas:v1`) — não são compartilhados entre pessoas nem entre máquinas. Quando
esses campos virarem propriedades de negócio no HubSpot, a gravação passa a ser lá.

## O que ficou de fora do porte

- **Upload de fechamento na aba DRE.** No HTML os arquivos iam em base64 para o storage do artifact.
  Aqui os fechamentos já enviados estão servidos em `public/arquivos/` e podem ser baixados, mas
  subir um novo pelo painel precisa de um lugar para guardar o arquivo (blob store ou o próprio
  registro do HubSpot). Upload de planilha de avaliação continua funcionando, porque ali só as
  respostas ficam salvas, não o arquivo.
