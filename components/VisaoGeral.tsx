"use client";

import type { Estado } from "@/lib/tipos";
import { DEALS, SNAPSHOT_EM } from "@/lib/dados";
import { fmtMoney, monthKey } from "@/lib/fmt";
import { alunosDaTurma, receitaDaTurma, statusEfetivo, todasTurmas, valorDaLinha } from "@/lib/derivado";

export default function VisaoGeral({ estado }: { estado: Estado }) {
  // Agregados da base inteira — de propósito ignoram os filtros da aba Turmas.
  const totalAlunos = DEALS.length;
  const totalReceita = DEALS.reduce((s, d) => s + valorDaLinha(estado, d), 0);
  const ticketMedio = totalAlunos ? totalReceita / totalAlunos : 0;

  const contagem = { ok: 0, divergencia: 0, nao_encontrado: 0, resolvido: 0 };
  DEALS.forEach((d) => contagem[statusEfetivo(estado, d)]++);
  const alerta = contagem.divergencia + contagem.nao_encontrado;

  const turmas = todasTurmas(estado);
  const porTurma = turmas.map((t) => ({
    turma: t,
    count: alunosDaTurma(estado, t).length,
    receita: receitaDaTurma(estado, t),
  }));

  const mesAtual = new Date().getMonth() + 1;
  const proximaTurma = turmas.find((t) => monthKey(t) >= mesAtual) || turmas[0] || null;

  const naEspera = Object.keys(estado.espera).length;
  const maxCount = Math.max(1, ...porTurma.map((t) => t.count));
  const maxReceita = Math.max(1, ...porTurma.map((t) => t.receita));

  return (
    <div>
      <div className="home-hero">
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              opacity: 0.8,
              fontFamily: "'Satoshi', sans-serif",
            }}
          >
            Próxima turma
          </div>
          <div className="next-turma">{proximaTurma || "nenhuma turma cadastrada"}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11, opacity: 0.85, fontFamily: "'Satoshi', sans-serif" }}>
          Snapshot HubSpot · {SNAPSHOT_EM}
        </div>
      </div>

      <div className="kpis">
        <Kpi num={String(totalAlunos)} label="Alunos confirmados (todas as turmas)" />
        <Kpi num={fmtMoney(totalReceita) || "R$ 0,00"} label="Receita total confirmada" />
        <Kpi num={fmtMoney(ticketMedio) || "R$ 0,00"} label="Ticket médio" />
        <Kpi num={String(naEspera)} label="Na lista de espera" />
        <Kpi num={String(alerta)} label="Precisam de atenção agora" alerta={alerta > 0} />
      </div>

      <div className="home-grid">
        <div className="home-panel">
          <h3>Alunos por turma</h3>
          {porTurma.length ? (
            porTurma.map((t) => (
              <Barra
                key={t.turma}
                label={t.turma}
                cor={t.turma === proximaTurma ? "next" : "blue"}
                pct={(t.count / maxCount) * 100}
                valor={`${t.count} aluno${t.count === 1 ? "" : "s"}`}
              />
            ))
          ) : (
            <div className="eval-empty">Sem dados ainda.</div>
          )}
        </div>
        <div className="home-panel">
          <h3>Receita por turma</h3>
          {porTurma.length ? (
            porTurma.map((t) => (
              <Barra
                key={t.turma}
                label={t.turma}
                cor="orange"
                pct={(t.receita / maxReceita) * 100}
                valor={fmtMoney(t.receita) || "R$ 0,00"}
              />
            ))
          ) : (
            <div className="eval-empty">Sem dados ainda.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ num, label, alerta }: { num: string; label: string; alerta?: boolean }) {
  return (
    <div className="kpi">
      <div className="num" style={alerta ? { color: "var(--warn)" } : undefined}>
        {num}
      </div>
      <div className="label">{label}</div>
    </div>
  );
}

function Barra({ label, cor, pct, valor }: { label: string; cor: string; pct: number; valor: string }) {
  return (
    <div className="hbar-row">
      <span className="hbar-label">{label}</span>
      <div className="hbar-track">
        <div className={`hbar-fill ${cor}`} style={{ width: `${pct.toFixed(1)}%` }} />
      </div>
      <span className="hbar-value">{valor}</span>
    </div>
  );
}
