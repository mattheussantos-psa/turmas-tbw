# Painel PSA — Turmas 2026

Painel das turmas The Best Weekend / The Best Day. O layout veio do arquivo
`dash-psa-turmas-2026-18.html` (artifact de uso único) e foi portado para Next.js para poder ler
o HubSpot de verdade — o que o HTML não conseguia fazer.

## Rodar

```
npm install
cp .env.example .env.local   # e preencha o HUBSPOT_TOKEN
npm run dev                  # http://localhost:3000
npm test                     # check do mapeamento do HubSpot + do relatório de avaliação
```

## De onde vem cada aba

| Aba | Fonte |
|---|---|
| Visão Geral | agregados sobre os alunos vindos do HubSpot |
| Turmas | **HubSpot ao vivo** — `/api/alunos` |
| Lista de Espera | `data/espera.json` — 33 nomes, ainda manual |
| Avaliações | `data/avaliacoes.json` + PDFs em `public/arquivos/`; aceita upload de planilha |
| KPIs | referência calculada das turmas + colunas livres do usuário |
| DRE | `data/dre.json` (fechamentos CSX de 21/09/2026) + fechamentos em `public/arquivos/` |

## A integração

Um aluno é **um negócio ganho do Funil de Vendas B2C**. O que o `/api/alunos` lê:

| Campo do painel | Origem no HubSpot |
|---|---|
| Aluno | `hs_full_name_or_email` do **contato associado** ao negócio |
| Turma | `turma_the_best_weekend_` |
| Produto | `produto_de_interesse` |
| Valor pago | `amount` |

Filtro: `pipeline = 725182862` (Funil de Vendas B2C) e `dealstage = 1105295876` (Ganho).

Além disso o painel só mostra **turmas do ano corrente** (`ANO` em `lib/hubspot.ts`, hoje 2026,
sobrescritível por `HUBSPOT_ANO`). Os rótulos citam o ano de três jeitos — `/26`, `/2026` e ` 2026` —
e os três são reconhecidos. Um rótulo **sem ano nenhum** é mantido de propósito: se criarem uma opção
nova em outro formato, ela aparece na tela em vez de sumir calada.

`The Best Weekend` é encurtado para `TBW` na exibição, porque o nome por extenso não cabe na coluna.
Cuidado: existe um `1076664460` com label "Ganho / Contrato assinado" que é do funil **B2B**.

### Scopes

A lista no `.env.example` é ponto de partida, não verificação — qual scope cada endpoint do HubSpot
exige não está documentado por completo. A fonte confiável é a própria API: em 403 ela devolve
`context.requiredGranularScopes` com os nomes exatos, e `lib/hubspot.ts` mostra isso na tela em vez
de pedir para adivinhar. Atenção ao `/crm/v3/properties`, que é endpoint de **schema** e pode exigir
`crm.schemas.deals.read` além do `crm.objects.deals.read`.

### Dois detalhes que mordem

1. **O value do enum não bate com o label.** A API devolve o *value*; o painel precisa mostrar o
   *label*. Exemplos reais: o value `The Best Weekend SP | Fevereiro 2026` tem label
   "The Best Weekend SP | **Abril** 2026"; o value `The Best Weekend SP | Julho/26` tem label
   "The Best Weekend **POA** | Julho 2026"; em produto, `Pré The Best Weekend` tem label
   "**The Best Day**" e `Amolador` é "**The Best Start**". Por isso `lib/hubspot.ts` busca as
   opções da propriedade e traduz value → label. O `test.ts` trava se isso regredir.
2. **`produto_de_interesse` é multi-seleção**, separada por `;`. Cada parte é traduzida e elas são
   juntadas com " + ".

### Cache

`/api/alunos` guarda o resultado em cache (`unstable_cache`, tag `alunos`). O botão "Atualizar do
HubSpot" chama `/api/alunos?refresh=1`, que invalida a tag e busca de novo. Entre um refresh e
outro todo mundo lê o mesmo resultado, sem bater no HubSpot a cada acesso.

## Edições

Status, nota, valor, onboarding, mentoria, DRE e KPIs são editáveis e ficam no `localStorage` do
navegador (`painel-turmas:v2`) — não são compartilhados entre pessoas nem entre máquinas. Quando
esses campos virarem propriedades de negócio no HubSpot, a gravação passa a ser lá.

## O que ficou de fora

- **Upload de fechamento na aba DRE.** Os 7 fechamentos já enviados estão em `public/arquivos/` e
  podem ser baixados, mas subir um novo precisa de um lugar para guardar o arquivo (blob store ou
  o próprio registro do HubSpot). O upload de planilha de avaliação continua funcionando, porque
  ali só as respostas ficam salvas, não o arquivo.
- **O snapshot manual** (`data/turmas.json`, 416 alunos de 02/09/2026) foi removido — os alunos
  agora vêm do CRM. Ele segue no histórico do git.
