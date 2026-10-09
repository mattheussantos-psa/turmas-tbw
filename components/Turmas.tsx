"use client";

import { useState } from "react";
import type { Estado, LinhaEstado, Status } from "@/lib/tipos";
import { fmtMoney, monthKey, STATUS_LABELS } from "@/lib/fmt";
import { dealId } from "@/lib/estado";
import { ordemLinhas, statusEfetivo, todasTurmas, valorDaLinha } from "@/lib/derivado";

type Props = {
  estado: Estado;
  atualizar: (fn: (e: Estado) => Estado) => void;
};

export default function Turmas({ estado, atualizar }: Props) {
  const [turmaFiltro, setTurmaFiltro] = useState("Todas");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [busca, setBusca] = useState("");

  const turmas = todasTurmas(estado);
  const filtroValido = turmaFiltro === "Todas" || turmas.includes(turmaFiltro) ? turmaFiltro : "Todas";

  const linhas = ordemLinhas(estado).filter((d) => {
    const s = estado.linhas[dealId(d)];
    if (!s) return false;
    if (filtroValido !== "Todas" && s.turma !== filtroValido) return false;
    if (statusFiltro !== "todos" && statusEfetivo(estado, d) !== statusFiltro) return false;
    const termo = busca.trim().toLowerCase();
    return !termo || s.name.toLowerCase().includes(termo);
  });

  const ok = linhas.filter((d) => statusEfetivo(estado, d) === "ok").length;
  const div = linhas.filter((d) => statusEfetivo(estado, d) === "divergencia").length;
  const nf = linhas.filter((d) => statusEfetivo(estado, d) === "nao_encontrado").length;
  const totalValor = linhas.reduce((s, d) => s + valorDaLinha(estado, d), 0);

  function editar<K extends keyof LinhaEstado>(id: string, campo: K, valor: LinhaEstado[K]) {
    atualizar((e) => ({ ...e, linhas: { ...e.linhas, [id]: { ...e.linhas[id], [campo]: valor } } }));
  }

  return (
    <div>
      <div className="filters">
        <select value={filtroValido} onChange={(ev) => setTurmaFiltro(ev.target.value)}>
          <option value="Todas">Todas as turmas</option>
          {turmas.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={statusFiltro} onChange={(ev) => setStatusFiltro(ev.target.value)}>
          <option value="todos">Todos os status</option>
          <option value="ok">Só confirmados</option>
          <option value="divergencia">Só divergências</option>
          <option value="nao_encontrado">Só não encontrados</option>
          <option value="resolvido">Só resolvidos por mim</option>
        </select>
        <input
          className="search"
          type="text"
          placeholder="Buscar aluno..."
          value={busca}
          onChange={(ev) => setBusca(ev.target.value)}
        />
        <span className="save-state">alterações salvas automaticamente neste navegador</span>
      </div>

      <div className="kpis">
        <div className="kpi">
          <div className="num">{linhas.length}</div>
          <div className="label">Total na lista</div>
        </div>
        <div className="kpi">
          <div className="num">{ok}</div>
          <div className="label">Confirmados</div>
        </div>
        <div className="kpi">
          <div className="num">{div}</div>
          <div className="label">Divergências</div>
        </div>
        <div className="kpi">
          <div className="num">{nf}</div>
          <div className="label">Não encontrados</div>
        </div>
        <div className="kpi">
          <div className="num">{fmtMoney(totalValor) || "R$ 0,00"}</div>
          <div className="label">Valor pago (filtro atual)</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Aluno</th>
            <th>Turma</th>
            <th>Produto</th>
            <th>Status</th>
            <th>Valor pago</th>
            <th>Nota / observação</th>
            <th>Onboarding</th>
            <th>Mentoria (Gilvana)</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((d) => {
            const id = dealId(d);
            const s = estado.linhas[id];
            const status = statusEfetivo(estado, d);
            // Onboarding e Mentoria com a Gilvana só existem a partir das turmas de outubro/2026.
            const temAddons = monthKey(s.turma) >= 10;
            return (
              <tr key={id} className={status}>
                <td>
                  <input
                    className="name-input"
                    type="text"
                    value={s.name}
                    onChange={(ev) => editar(id, "name", ev.target.value)}
                  />
                  <span className="hs-link">
                    {d.hubspot_url ? (
                      <a href={d.hubspot_url} target="_blank" rel="noopener noreferrer">
                        abrir no HubSpot
                      </a>
                    ) : (
                      <span className="no-link">sem link</span>
                    )}
                  </span>
                </td>
                <td>
                  <input
                    className="turma-input"
                    type="text"
                    value={s.turma}
                    onChange={(ev) => editar(id, "turma", ev.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="produto-input"
                    type="text"
                    value={s.produto}
                    onChange={(ev) => editar(id, "produto", ev.target.value)}
                  />
                </td>
                <td>
                  <select
                    className={"status-select " + status}
                    value={status}
                    onChange={(ev) =>
                      editar(id, "statusOverride", ev.target.value === d.status ? null : (ev.target.value as Status))
                    }
                  >
                    {(["ok", "divergencia", "nao_encontrado", "resolvido"] as Status[]).map((v) => (
                      <option key={v} value={v}>
                        {STATUS_LABELS[v]}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    className="amount-input"
                    type="number"
                    placeholder="R$"
                    value={s.amount}
                    onChange={(ev) => editar(id, "amount", ev.target.value)}
                  />
                </td>
                <td>
                  <textarea
                    className="notes-input"
                    placeholder="nota / observação..."
                    value={s.nota}
                    onChange={(ev) => editar(id, "nota", ev.target.value)}
                  />
                </td>
                <td className="check-cell">
                  <input
                    className="check"
                    type="checkbox"
                    checked={s.onboarding}
                    disabled={!temAddons}
                    title={temAddons ? undefined : "Onboarding só está disponível a partir das turmas de outubro/2026"}
                    onChange={(ev) => editar(id, "onboarding", ev.target.checked)}
                  />
                </td>
                <td className="check-cell">
                  <input
                    className="check"
                    type="checkbox"
                    checked={s.mentoria}
                    disabled={!temAddons}
                    title={
                      temAddons
                        ? undefined
                        : "Mentoria com a Gilvana só está disponível a partir das turmas de outubro/2026"
                    }
                    onChange={(ev) => editar(id, "mentoria", ev.target.checked)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="callout">
        <strong>TUDO NESTA TABELA É EDITÁVEL</strong>
        <br />
        Nome, turma, produto, valor, status e nota — edite direto na célula. A ordem das linhas fica fixa enquanto você
        edita; o filtro de Turma no topo se atualiza sozinho conforme você digita novos nomes de turma. O link
        &quot;abrir no HubSpot&quot; continua apontando pro registro original mesmo se você renomear o aluno aqui.
      </div>
    </div>
  );
}
