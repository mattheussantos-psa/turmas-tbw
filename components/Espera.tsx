"use client";

import type { Estado, EsperaEstado } from "@/lib/tipos";
import { ESPERA_NOMES } from "@/lib/dados";
import { slugify } from "@/lib/fmt";
import { todasTurmas } from "@/lib/derivado";

type Props = {
  estado: Estado;
  atualizar: (fn: (e: Estado) => Estado) => void;
};

// Ordem fixa: a lista não reordena enquanto alguém digita numa linha.
const ORDEM = ESPERA_NOMES.map((n) => slugify(n));

export default function Espera({ estado, atualizar }: Props) {
  const turmas = todasTurmas(estado);
  const total = ORDEM.length;
  const comTurma = ORDEM.filter((slug) => estado.espera[slug]?.turmaInteresse).length;
  const contatados = ORDEM.filter((slug) => estado.espera[slug]?.chamado).length;

  function editar<K extends keyof EsperaEstado>(slug: string, campo: K, valor: EsperaEstado[K]) {
    atualizar((e) => ({ ...e, espera: { ...e.espera, [slug]: { ...e.espera[slug], [campo]: valor } } }));
  }

  return (
    <div>
      <div className="callout">
        <strong>LISTA DE ESPERA</strong>
        <br />
        Pessoas interessadas que ainda não confirmaram vaga em nenhuma turma. Todos os campos são editáveis: marque a
        turma de interesse quando definir, deixe uma nota e marque &quot;contatado&quot; quando já tiver falado com a
        pessoa.
      </div>

      <div className="kpis">
        <div className="kpi">
          <div className="num">{total}</div>
          <div className="label">Na lista de espera</div>
        </div>
        <div className="kpi">
          <div className="num">{comTurma}</div>
          <div className="label">Com turma de interesse</div>
        </div>
        <div className="kpi">
          <div className="num">{contatados}</div>
          <div className="label">Já contatados</div>
        </div>
      </div>

      <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Turma de interesse</th>
            <th>Nota / observação</th>
            <th>Contatado</th>
          </tr>
        </thead>
        <tbody>
          {ORDEM.map((slug) => {
            const s = estado.espera[slug];
            if (!s) return null;
            return (
              <tr key={slug}>
                <td>
                  <input
                    className="name-input"
                    type="text"
                    value={s.name}
                    onChange={(ev) => editar(slug, "name", ev.target.value)}
                  />
                </td>
                <td>
                  <select
                    className="turma-input"
                    value={s.turmaInteresse}
                    onChange={(ev) => editar(slug, "turmaInteresse", ev.target.value)}
                  >
                    <option value="">—</option>
                    {turmas.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <textarea
                    className="notes-input"
                    placeholder="nota / observação..."
                    value={s.nota}
                    onChange={(ev) => editar(slug, "nota", ev.target.value)}
                  />
                </td>
                <td className="check-cell">
                  <input
                    className="check"
                    type="checkbox"
                    checked={s.chamado}
                    onChange={(ev) => editar(slug, "chamado", ev.target.checked)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
