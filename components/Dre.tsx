"use client";

import { useState } from "react";
import type { DreEstado, Estado } from "@/lib/tipos";
import { CHECKLISTS, DRE_PASTAS } from "@/lib/dados";
import { fmtMoney, slugify } from "@/lib/fmt";
import { drePadrao } from "@/lib/estado";
import { alunosDaTurma, eventosDaPasta, receitaDaTurma } from "@/lib/derivado";
import { dealId } from "@/lib/estado";

type Props = {
  estado: Estado;
  atualizar: (fn: (e: Estado) => Estado) => void;
};

const CAMPOS: [keyof DreEstado, string][] = [
  ["orcamento", "Orçamento previsto"],
  ["receita", "Receita realizada (matrículas)"],
  ["custoEvento", "Custo — Evento"],
  ["custoCaches", "Custo — Cachês"],
  ["custoExtras", "Custo — Extras"],
];

export default function Dre({ estado, atualizar }: Props) {
  const [pasta, setPasta] = useState(DRE_PASTAS[0]);
  const eventos = eventosDaPasta(estado, pasta);

  function dreDo(evento: string): { slug: string; s: DreEstado } {
    const slug = slugify(evento);
    return { slug, s: estado.dre[slug] || drePadrao(slug, receitaDaTurma(estado, evento)) };
  }

  function editar(slug: string, campo: keyof DreEstado, valor: string, base: DreEstado) {
    atualizar((e) => ({ ...e, dre: { ...e.dre, [slug]: { ...base, ...e.dre[slug], [campo]: valor } } }));
  }

  return (
    <div>
      <div className="callout">
        <strong>DRE POR EVENTO</strong>
        <br />
        Escolha a pasta do produto, depois o evento. A receita realizada nasce somando o &quot;Valor pago&quot; dos
        alunos daquela turma na aba Turmas; se você editar o campo, sua edição manda e ele para de seguir a Turmas.
      </div>

      <div className="filters">
        {DRE_PASTAS.map((f) => (
          <button key={f} className={"folder-tab" + (f === pasta ? " active" : "")} onClick={() => setPasta(f)}>
            {f}
          </button>
        ))}
      </div>

      {eventos.map((evento) => {
        const { slug, s } = dreDo(evento);

        // Mentoria com a Gilvana: cada aluno marcado na aba Turmas soma R$ 200,00 de receita extra
        // pra turma. É sempre calculado ao vivo a partir dos checks atuais — não é editável aqui.
        const mentoriaCount = alunosDaTurma(estado, evento).filter((d) => estado.linhas[dealId(d)]?.mentoria).length;
        const mentoriaReceita = mentoriaCount * 200;

        const receita = (parseFloat(String(s.receita)) || 0) + mentoriaReceita;
        const orcamento = parseFloat(String(s.orcamento)) || 0;
        const custos =
          (parseFloat(String(s.custoEvento)) || 0) +
          (parseFloat(String(s.custoCaches)) || 0) +
          (parseFloat(String(s.custoExtras)) || 0);
        const resultado = receita - custos;
        const variacao = orcamento !== 0 ? ((receita - orcamento) / orcamento) * 100 : null;
        const variacaoLabel = variacao === null ? "—" : (variacao >= 0 ? "+" : "") + variacao.toFixed(1) + "%";
        const checklist = CHECKLISTS[slug];

        return (
          <div className="dre-month" key={slug}>
            <h3>{evento}</h3>
            <div className="dre-grid">
              {CAMPOS.map(([campo, label]) => (
                <div className="dre-field" key={campo}>
                  <label>{label}</label>
                  <input
                    type="number"
                    value={s[campo] as string | number}
                    onChange={(ev) => editar(slug, campo, ev.target.value, s)}
                  />
                </div>
              ))}
            </div>

            <div className="dre-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <Resultado label="Mentoria com a Gilvana">
                <div className="num">
                  {mentoriaCount} aluno{mentoriaCount === 1 ? "" : "s"} × R$ 200,00 ={" "}
                  {fmtMoney(mentoriaReceita) || "R$ 0,00"}
                </div>
              </Resultado>
              <Resultado label="Receita total (matrículas + mentoria)">
                <div className="num">{fmtMoney(receita) || "R$ 0,00"}</div>
              </Resultado>
            </div>

            <div className="dre-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <Resultado label="Resultado (Receita − Custos)">
                <div className={"num " + (resultado >= 0 ? "pos" : "neg")}>{fmtMoney(resultado) || "R$ 0,00"}</div>
              </Resultado>
              <Resultado label="Variação — Receita vs. Orçamento previsto">
                <div className={"num " + (variacao === null ? "" : variacao >= 0 ? "pos" : "neg")}>{variacaoLabel}</div>
              </Resultado>
            </div>

            <div className="dre-notes">
              <textarea
                placeholder="Notas do evento..."
                value={s.notas}
                onChange={(ev) => editar(slug, "notas", ev.target.value, s)}
              />
            </div>

            <div className="dre-checklist">
              <div className="cl-label">Checklist do evento (fechamento com todos os valores)</div>
              {checklist ? (
                <div className="cl-file">
                  <span className="cl-name">{checklist.fileName}</span>
                  <span className="cl-meta">
                    enviado em {checklist.uploadedAt} · {checklist.sizeKB} KB
                  </span>
                  <a className="cl-download" href={checklist.url} download={checklist.fileName}>
                    Baixar
                  </a>
                </div>
              ) : (
                <div className="cl-meta" style={{ fontSize: 11.5, color: "var(--muted)" }}>
                  Nenhum fechamento anexado a este evento ainda.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Resultado({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="dre-result">
      <label style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>{label}</label>
      {children}
    </div>
  );
}
