// Check do painel: roda com `npm test`, sem framework.
// Cobre as duas lógicas que quebram calado: o mapeamento dos negócios do HubSpot (onde o value do
// enum não bate com o label) e o alinhamento de perguntas entre dias de avaliação.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ehDoAno, montarAlunos } from "./lib/hubspot.ts";

// ---- mapeamento dos negócios vindos do HubSpot ----
{
  // Rótulos reais da propriedade, lidos do portal 49656171 em 09/10/2026. O descasamento entre
  // value e label é de verdade: o value que diz "Fevereiro 2026" tem label "Abril 2026".
  const turmaLabel = new Map([
    ["The Best Weekend SP | Fevereiro 2026", "The Best Weekend SP | Abril 2026"],
    ["The Best Weekend SP | Julho/26", "The Best Weekend POA | Julho 2026"],
    ["TBW POA | Outubro/26", "TBW POA | Outubro/26"],
  ]);
  const produtoLabel = new Map([
    ["Pré The Best Weekend", "The Best Day"],
    ["Amolador", "The Best Start"],
    ["TBW Weekend (Presencial)", "TBW Weekend (Presencial)"],
    ["The Best Weeks (Semestral)", "The Best Weeks (Semestral)"],
    ["Ecossistema", "Ecossistema"],
  ]);

  const brutos = [
    {
      id: "1",
      properties: {
        turma_the_best_weekend_: "The Best Weekend SP | Fevereiro 2026",
        produto_de_interesse: "TBW Weekend (Presencial)",
        amount: "10000",
        dealname: "Fulano | TBW | em definição",
      },
    },
    {
      id: "2",
      properties: {
        turma_the_best_weekend_: "The Best Weekend SP | Julho/26",
        produto_de_interesse: "Pré The Best Weekend;Ecossistema",
        amount: "",
        dealname: "Beltrano | algo",
      },
    },
    // "Não se aplica" não é turma: este não pode aparecer no painel.
    {
      id: "3",
      properties: {
        turma_the_best_weekend_: "Não se aplica",
        produto_de_interesse: "Ecossistema",
        amount: "4500",
        dealname: "Sicrano | weeks",
      },
    },
    // Turma sem rótulo conhecido cai no próprio value, em vez de virar vazio.
    {
      id: "4",
      properties: {
        turma_the_best_weekend_: "TBW POA | Outubro/26",
        produto_de_interesse: "Amolador",
        amount: "7000",
        dealname: "",
      },
    },
    // A turma também é multi-seleção: valor composto tem que traduzir parte por parte, senão cai
    // na tela sem tradução nenhuma (foi o que aconteceu na primeira carga real).
    {
      id: "5",
      properties: {
        turma_the_best_weekend_: "The Best Weekend SP | Fevereiro 2026;TBW POA | Outubro/26",
        produto_de_interesse: "TBW Weekend (Presencial)",
        amount: "9000",
        dealname: "Duplo | TBW",
      },
    },
  ];

  const nomes = new Map([
    ["1", "Fulano da Silva"],
    ["2", "Beltrano Souza"],
  ]);

  const alunos = montarAlunos(brutos, nomes, turmaLabel, produtoLabel, "49656171");

  assert.equal(alunos.length, 4, '"Não se aplica" deveria ter ficado de fora');
  const porId = Object.fromEntries(alunos.map((a) => [a.key, a]));

  // O que mais importa: a turma mostrada é o LABEL, não o value.
  assert.equal(porId["1"].turma, "TBW SP | Abril 2026");
  assert.equal(porId["2"].turma, "TBW POA | Julho 2026");

  // Produto multi-seleção: cada parte traduzida, juntas num rótulo só.
  assert.equal(porId["2"].produto, "The Best Day + Ecossistema");

  // Turma multi-seleção: cada parte traduzida, nenhuma crua.
  assert.equal(porId["5"].turma, "TBW SP | Abril 2026 + TBW POA | Outubro/26");
  assert.equal(porId["4"].produto, "The Best Start");

  // Nome vem do contato associado; sem contato, cai no nome do negócio.
  assert.equal(porId["1"].name, "Fulano da Silva");
  assert.equal(porId["4"].name, "(sem contato associado)");

  // Valor vazio vira null (campo em branco), não zero — zero mentiria na soma de receita.
  assert.equal(porId["1"].amount, 10000);
  assert.equal(porId["2"].amount, null);

  assert.equal(porId["1"].hubspot_url, "https://app.hubspot.com/contacts/49656171/record/0-3/1");
  assert.equal(porId["1"].status, "ok");

  // Cada negócio tem id próprio, então a chave da linha nunca colide.
  assert.equal(new Set(alunos.map((a) => a.key)).size, alunos.length);
}

// ---- recorte do ano e encurtamento do rótulo ----
{
  // Os três formatos de ano que aparecem nos rótulos reais do HubSpot.
  assert.equal(ehDoAno("TBW POA | Dezembro/26", 2026), true);
  assert.equal(ehDoAno("TBW - POA/Agosto/2026", 2026), true);
  assert.equal(ehDoAno("TBW POA | Julho 2026", 2026), true);
  assert.equal(ehDoAno("TBW 2026", 2026), true);

  // Fora do ano: 2025 e 2027 saem.
  assert.equal(ehDoAno("TBW | dezembro/25", 2026), false);
  assert.equal(ehDoAno("TBW | outubro/25", 2026), false);
  assert.equal(ehDoAno("TBW | Lista de espera/27", 2026), false);

  // "/2026" não pode ser lido como o ano 20 por causa dos dois primeiros dígitos.
  assert.equal(ehDoAno("TBW - POA/Agosto/2026", 2020), false);

  // Rótulo composto entra se qualquer parte for do ano.
  assert.equal(ehDoAno("TBW SP | Abril 2026 + Pré TBW | Abril/26", 2026), true);

  // Sem ano nenhum: mantém, para não sumir calado da tela.
  assert.equal(ehDoAno("Turma nova sem ano", 2026), true);
}

// ---- alinhamento de perguntas entre dias de avaliação ----
const normQ = (s: unknown) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const ehNumero = (v: unknown) =>
  v !== "" && v !== null && v !== undefined && !isNaN(Number(v)) && isFinite(Number(v));

function estatisticas(vals: unknown[]) {
  const numericos = vals.filter(ehNumero).map(Number);
  const ehNumerica = vals.length > 0 && numericos.length >= vals.length * 0.7;
  return {
    n: vals.length,
    ehNumerica,
    media: ehNumerica && numericos.length ? numericos.reduce((a, b) => a + b, 0) / numericos.length : null,
  };
}

function montarRelatorio(dias: { rows: (string | number)[][] }[]) {
  const perguntas: (string | number)[] = [];
  const vistas = new Set<string>();
  dias.forEach((ev) =>
    (ev.rows[0] || []).forEach((q) => {
      const n = normQ(q);
      if (n && !vistas.has(n)) {
        vistas.add(n);
        perguntas.push(q);
      }
    })
  );
  const colunaPorDia = dias.map((ev) => {
    const header = (ev.rows[0] || []).map(normQ);
    return perguntas.map((label) => header.indexOf(normQ(label)));
  });
  const preenchidas = (linhas: (string | number)[][], col: number) =>
    linhas.map((r) => r[col]).filter((v) => v !== "" && v !== null && v !== undefined);
  const porDia = dias.map((ev, di) =>
    perguntas.map((_, qi) => {
      const col = colunaPorDia[di][qi];
      return col === -1 ? null : estatisticas(preenchidas(ev.rows.slice(1), col));
    })
  );
  const geral = perguntas.map((_, qi) => {
    const todos: unknown[] = [];
    dias.forEach((ev, di) => {
      const col = colunaPorDia[di][qi];
      if (col !== -1) todos.push(...preenchidas(ev.rows.slice(1), col));
    });
    return estatisticas(todos);
  });
  return { perguntas, porDia, geral, totalRespostas: dias.reduce((s, ev) => s + Math.max(ev.rows.length - 1, 0), 0) };
}

{
  const dias = [
    { rows: [["Nota Gastronomia", "Nota Márcio"], [4, 5], [2, 5]] },
    // dia 2: mesma pergunta em OUTRA posição, com espaçamento e caixa diferentes, mais uma nova
    { rows: [["nota  márcio", "Nota Gastronomia", "Recomendaria (NPS 0-10)"], [3, 6, 10], [3, 6, 8]] },
  ];
  const r = montarRelatorio(dias);

  assert.deepEqual(r.perguntas, ["Nota Gastronomia", "Nota Márcio", "Recomendaria (NPS 0-10)"]);
  assert.equal(r.totalRespostas, 4);

  // Gastronomia: dia 1 col 0, dia 2 col 1 — casa pelo texto, não pela posição.
  assert.equal(r.porDia[0][0]!.media, 3);
  assert.equal(r.porDia[1][0]!.media, 6);
  assert.equal(r.geral[0].media, 4.5);
  assert.equal(r.geral[1].media, 4);

  // NPS: só o dia 2 perguntou — dia 1 fica null (vira "—") e não entra na média geral.
  assert.equal(r.porDia[0][2], null);
  assert.equal(r.geral[2].media, 9);

  // Pergunta de texto conta respostas em vez de calcular média.
  const texto = montarRelatorio([{ rows: [["Sugestões"], ["mais tempo"], ["menos slides"]] }]);
  assert.equal(texto.geral[0].ehNumerica, false);
  assert.equal(texto.geral[0].n, 2);
}

// ---- os dados que ainda não vêm do CRM continuam de pé ----
{
  const espera = JSON.parse(readFileSync(new URL("./data/espera.json", import.meta.url), "utf8"));
  assert.equal(espera.length, 33);
  const dre = JSON.parse(readFileSync(new URL("./data/dre.json", import.meta.url), "utf8"));
  assert.equal(Object.keys(dre).length, 7);
}

console.log("ok — turma e produto traduzem value→label, multi-seleção junta, e o relatório alinha por texto");
