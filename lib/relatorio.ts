import type { DiaAvaliacao } from "./tipos";
import { isNumericCell } from "./fmt";

export type Estatistica = { n: number; ehNumerica: boolean; media: number | null };

export const normQ = (s: unknown) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

// Uma pergunta é tratada como numérica se pelo menos 70% das respostas forem número — assim uma
// resposta digitada errado ("cinco") não transforma uma nota em pergunta de texto.
export function estatisticas(vals: unknown[]): Estatistica {
  const numericos = vals.filter(isNumericCell).map(Number);
  const ehNumerica = vals.length > 0 && numericos.length >= vals.length * 0.7;
  return {
    n: vals.length,
    ehNumerica,
    media: ehNumerica && numericos.length ? numericos.reduce((a, b) => a + b, 0) / numericos.length : null,
  };
}

export type Relatorio = {
  perguntas: (string | number)[];
  porDia: (Estatistica | null)[][];
  geral: Estatistica[];
  totalRespostas: number;
};

// Cada dia de avaliação pode ter um conjunto e uma ordem de perguntas diferentes (modelos de
// formulário diferentes por dia), então o alinhamento é feito pelo TEXTO da pergunta, nunca pela
// posição da coluna. `null` em porDia significa que aquele dia realmente não fez aquela pergunta —
// e esse dia fica de fora da média geral dela.
export function montarRelatorio(dias: DiaAvaliacao[]): Relatorio {
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

  return {
    perguntas,
    porDia,
    geral,
    totalRespostas: dias.reduce((s, ev) => s + Math.max(ev.rows.length - 1, 0), 0),
  };
}

export function formatar(st: Estatistica | null): string {
  if (!st || st.n === 0) return "—";
  return st.ehNumerica ? st.media!.toFixed(2) : st.n + " resp.";
}
