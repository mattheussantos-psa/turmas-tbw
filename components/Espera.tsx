"use client";

import type { Estado, LinhaEstado } from "@/lib/tipos";
import { fmtMoney } from "@/lib/fmt";
import { dealId } from "@/lib/estado";
import { alunosEmEspera, valorDaLinha } from "@/lib/derivado";

type Props = {
  estado: Estado;
  atualizar: (fn: (e: Estado) => Estado) => void;
};

export default function Espera({ estado, atualizar }: Props) {
  // Quem está na fila é negócio ganho do HubSpot cuja turma é uma "Lista de espera": já pagou,
  // mas ainda não tem turma definida.
  const fila = alunosEmEspera(estado);
  const total = fila.length;
  const contatados = fila.filter((d) => estado.linhas[dealId(d)]?.contatado).length;
  const receita = fila.reduce((s, d) => s + valorDaLinha(estado, d), 0);

  function editar<K extends keyof LinhaEstado>(id: string, campo: K, valor: LinhaEstado[K]) {
    atualizar((e) => ({ ...e, linhas: { ...e.linhas, [id]: { ...e.linhas[id], [campo]: valor } } }));
  }

  return (
    <div>
      <div className="callout">
        <strong>LISTA DE ESPERA</strong>
        <br />
        Negócios ganhos cuja turma no HubSpot é uma lista de espera — já pagaram, mas ainda não têm turma definida. A
        turma de espera e o valor vêm do CRM e não se editam aqui; a nota e o &quot;contatado&quot; são seus.
      </div>

      <div className="kpis">
        <div className="kpi">
          <div className="num">{total}</div>
          <div className="label">Na lista de espera</div>
        </div>
        <div className="kpi">
          <div className="num">{contatados}</div>
          <div className="label">Já contatados</div>
        </div>
        <div className="kpi">
          <div className="num">{fmtMoney(receita) || "R$ 0,00"}</div>
          <div className="label">Valor já pago por quem espera</div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Turma de espera</th>
              <th>Produto</th>
              <th>Valor pago</th>
              <th>Nota / observação</th>
              <th>Contatado</th>
            </tr>
          </thead>
          <tbody>
            {fila.length ? (
              fila.map((d) => {
                const id = dealId(d);
                const s = estado.linhas[id];
                if (!s) return null;
                return (
                  <tr key={id}>
                    <td>
                      <input
                        className="name-input"
                        type="text"
                        title={s.name}
                        value={s.name}
                        onChange={(ev) => editar(id, "name", ev.target.value)}
                      />
                      <span className="hs-link">
                        <a href={d.hubspot_url} target="_blank" rel="noopener noreferrer">
                          abrir no HubSpot
                        </a>
                      </span>
                    </td>
                    <td title={s.turma}>{s.turma}</td>
                    <td title={s.produto}>{s.produto}</td>
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
                        checked={s.contatado}
                        onChange={(ev) => editar(id, "contatado", ev.target.checked)}
                      />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} style={{ color: "var(--muted)" }}>
                  Nenhum negócio ganho em turma de lista de espera no HubSpot.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
