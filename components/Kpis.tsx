"use client";

import { useState } from "react";
import type { Estado } from "@/lib/tipos";
import { DEALS } from "@/lib/dados";
import { ALL_MONTHS, fmtMoney, MONTH_ORDER, monthKey } from "@/lib/fmt";
import { dealId } from "@/lib/estado";
import { todasTurmas, valorDaLinha } from "@/lib/derivado";

type Props = {
  estado: Estado;
  atualizar: (fn: (e: Estado) => Estado) => void;
};

// Espelha o cálculo por turma da Visão Geral, só que agrupado por mês — somando turmas do mesmo
// mês, caso exista mais de uma. Só aparecem meses que já têm turma cadastrada.
function referenciaPorMes(estado: Estado) {
  const turmas = todasTurmas(estado);
  const meses = new Set(turmas.map(monthKey).filter((n) => n <= 12));
  return ALL_MONTHS.filter((m) => meses.has(MONTH_ORDER[m])).map((mes) => {
    const turmasDoMes = turmas.filter((t) => monthKey(t) === MONTH_ORDER[mes]);
    let alunos = 0;
    let receita = 0;
    DEALS.forEach((d) => {
      if (turmasDoMes.includes(estado.linhas[dealId(d)]?.turma)) {
        alunos++;
        receita += valorDaLinha(estado, d);
      }
    });
    return { mes, alunos, receita, ticket: alunos ? receita / alunos : 0 };
  });
}

function novoId() {
  return "k" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default function Kpis({ estado, atualizar }: Props) {
  const [novaColuna, setNovaColuna] = useState("");
  const referencia = referenciaPorMes(estado);

  function adicionarColuna() {
    const name = novaColuna.trim();
    if (!name) return;
    atualizar((e) => ({ ...e, kpiCols: [...e.kpiCols, { id: novoId(), name }] }));
    setNovaColuna("");
  }

  function removerColuna(id: string) {
    atualizar((e) => {
      const kpiCells: Estado["kpiCells"] = {};
      for (const [mes, cols] of Object.entries(e.kpiCells)) {
        const { [id]: _removida, ...resto } = cols;
        kpiCells[mes] = resto;
      }
      return { ...e, kpiCols: e.kpiCols.filter((c) => c.id !== id), kpiCells };
    });
  }

  function editarCelula(mes: string, col: string, valor: string) {
    atualizar((e) => ({
      ...e,
      kpiCells: { ...e.kpiCells, [mes]: { ...(e.kpiCells[mes] || {}), [col]: valor } },
    }));
  }

  return (
    <div>
      <div className="callout">
        <strong>SEUS INDICADORES</strong>
        <br />
        A referência abaixo é calculada sozinha a partir das turmas já cadastradas no painel. Na tabela &quot;Seus
        indicadores&quot;, você cria as colunas que quiser (CAC, taxa de conversão, NPS de atendimento) e preenche mês a
        mês — tudo editável, tudo salvo automaticamente.
      </div>

      <div className="home-panel" style={{ marginBottom: 20 }}>
        <h3>Referência automática</h3>
        <table style={{ marginBottom: 0 }}>
          <thead>
            <tr>
              <th>Mês</th>
              <th>Alunos confirmados</th>
              <th>Receita confirmada</th>
              <th>Ticket médio</th>
            </tr>
          </thead>
          <tbody>
            {referencia.length ? (
              referencia.map((r) => (
                <tr key={r.mes}>
                  <td style={{ fontWeight: 700 }}>{r.mes}</td>
                  <td>{r.alunos}</td>
                  <td>{fmtMoney(r.receita) || "R$ 0,00"}</td>
                  <td>{fmtMoney(r.ticket) || "R$ 0,00"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ color: "var(--muted)" }}>
                  Sem turmas cadastradas ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="home-panel">
        <h3>Seus indicadores</h3>
        <div className="kpi-caption">
          As colunas abaixo (CAC, taxa de conversão, NPS de atendimento) são só exemplos de ponto de partida — renomeie,
          apague ou crie as suas próprias a qualquer momento.
        </div>
        <div className="kpi-add-row">
          <input
            type="text"
            placeholder="Nome do novo indicador (ex: CAC, NPS...)"
            value={novaColuna}
            onChange={(ev) => setNovaColuna(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter") {
                ev.preventDefault();
                adicionarColuna();
              }
            }}
          />
          <button type="button" onClick={adicionarColuna}>
            + Novo indicador
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th>Mês</th>
                {estado.kpiCols.map((c) => (
                  <th key={c.id}>
                    {c.name}
                    <button
                      type="button"
                      className="kpi-remove-col-btn"
                      title="Remover indicador"
                      onClick={() => removerColuna(c.id)}
                    >
                      ×
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_MONTHS.map((mes) => (
                <tr key={mes}>
                  <td style={{ fontWeight: 700 }}>{mes}</td>
                  {estado.kpiCols.map((c) => (
                    <td key={c.id}>
                      <input
                        className="kpi-cell-input"
                        type="text"
                        placeholder="—"
                        value={estado.kpiCells[mes]?.[c.id] ?? ""}
                        onChange={(ev) => editarCelula(mes, c.id, ev.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
