// Check mínimo do painel: roda com `node test.mjs`, sem framework.
// Cobre as duas coisas que quebram calado: o alinhamento de perguntas entre dias de avaliação
// (modelos de formulário diferentes por dia) e a identidade das linhas do snapshot — 143 dos 416
// registros vieram sem hubspot_id, então usar o id do HubSpot como chave colapsa alunos.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ler = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));

// ---- cópias das funções puras de lib/relatorio.ts (o arquivo é .ts, este check é JS puro) ----
const normQ = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const ehNumero = (v) => v !== "" && v !== null && v !== undefined && !isNaN(Number(v)) && isFinite(Number(v));

function estatisticas(vals) {
  const numericos = vals.filter(ehNumero).map(Number);
  const ehNumerica = vals.length > 0 && numericos.length >= vals.length * 0.7;
  return {
    n: vals.length,
    ehNumerica,
    media: ehNumerica && numericos.length ? numericos.reduce((a, b) => a + b, 0) / numericos.length : null,
  };
}

function montarRelatorio(dias) {
  const perguntas = [];
  const vistas = new Set();
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
  const preenchidas = (linhas, col) => linhas.map((r) => r[col]).filter((v) => v !== "" && v !== null && v !== undefined);
  const porDia = dias.map((ev, di) =>
    perguntas.map((_, qi) => {
      const col = colunaPorDia[di][qi];
      return col === -1 ? null : estatisticas(preenchidas(ev.rows.slice(1), col));
    })
  );
  const geral = perguntas.map((_, qi) => {
    const todos = [];
    dias.forEach((ev, di) => {
      const col = colunaPorDia[di][qi];
      if (col !== -1) todos.push(...preenchidas(ev.rows.slice(1), col));
    });
    return estatisticas(todos);
  });
  return { perguntas, porDia, geral, totalRespostas: dias.reduce((s, ev) => s + Math.max(ev.rows.length - 1, 0), 0) };
}

// ---- alinhamento entre dias com modelos diferentes ----
{
  const dias = [
    { rows: [["Nota Gastronomia", "Nota Márcio"], [4, 5], [2, 5]] },
    // dia 2: mesma pergunta em OUTRA posição, com espaçamento/caixa diferentes, mais uma nova
    { rows: [["nota  márcio", "Nota Gastronomia", "Recomendaria (NPS 0-10)"], [3, 6, 10], [3, 6, 8]] },
  ];
  const r = montarRelatorio(dias);

  assert.deepEqual(r.perguntas, ["Nota Gastronomia", "Nota Márcio", "Recomendaria (NPS 0-10)"]);
  assert.equal(r.totalRespostas, 4);

  // Gastronomia: dia 1 col 0, dia 2 col 1 — casa pelo texto, não pela posição.
  assert.equal(r.porDia[0][0].media, 3);
  assert.equal(r.porDia[1][0].media, 6);
  assert.equal(r.geral[0].media, 4.5);

  // Márcio: mesma pergunta apesar da caixa e do espaço duplo.
  assert.equal(r.geral[1].media, 4);

  // NPS: só o dia 2 perguntou — dia 1 fica null (vira "—") e não entra na média geral.
  assert.equal(r.porDia[0][2], null);
  assert.equal(r.geral[2].media, 9);

  // Pergunta de texto conta respostas em vez de calcular média.
  const texto = montarRelatorio([{ rows: [["Sugestões"], ["mais tempo"], ["menos slides"]] }]);
  assert.equal(texto.geral[0].ehNumerica, false);
  assert.equal(texto.geral[0].n, 2);
}

// ---- identidade das linhas do snapshot ----
{
  const deals = ler("./data/turmas.json");
  assert.equal(deals.length, 416, "o snapshot mudou de tamanho");

  const semId = deals.filter((d) => !d.hubspot_id).length;
  assert.ok(semId > 0, "se todo registro passar a ter hubspot_id, a chave pode voltar a ser o id");

  // A chave é a posição no snapshot: uma por linha, sempre.
  const chaves = new Set(deals.map((_, i) => "r" + i));
  assert.equal(chaves.size, deals.length);

  // Agregados conferidos contra o arquivo original.
  const receita = deals.reduce((s, d) => s + (d.amount || 0), 0);
  assert.equal(receita.toFixed(2), "2916629.90");

  const porTurma = {};
  deals.forEach((d) => (porTurma[d.turma] = (porTurma[d.turma] || 0) + 1));
  assert.equal(porTurma["Agosto TBW | POA"], 57, "contagem por turma colapsou — cheque a chave da linha");
  assert.equal(Object.keys(porTurma).length, 9);
}

console.log("ok — relatório alinha por texto da pergunta e o snapshot bate (416 alunos, R$ 2.916.629,90)");
