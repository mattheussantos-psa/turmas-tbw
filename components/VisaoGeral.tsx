"use client";

import { useState } from "react";
import type { Deal, Estado } from "@/lib/tipos";
import { fmtMoney, monthKey } from "@/lib/fmt";
import { alunosDaTurma, receitaDaTurma, statusEfetivo, todasTurmas, valorDaLinha } from "@/lib/derivado";
import { dealId } from "@/lib/estado";
import Detalhe, { type LinhaDetalhe } from "./Detalhe";

type Aberto = { titulo: string; subtitulo: string; linhas: LinhaDetalhe[] };

export default function VisaoGeral({ estado, buscadoEm }: { estado: Estado; buscadoEm: string }) {
  const [aberto, setAberto] = useState<Aberto | null>(null);

  // Agregados da base inteira — de propósito ignoram os filtros da aba Turmas.
  const totalAlunos = estado.deals.length;
  const totalReceita = estado.deals.reduce((s, d) => s + valorDaLinha(estado, d), 0);
  const ticketMedio = totalAlunos ? totalReceita / totalAlunos : 0;

  const contagem = { ok: 0, divergencia: 0, nao_encontrado: 0, resolvido: 0 };
  estado.deals.forEach((d) => contagem[statusEfetivo(estado, d)]++);
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

  // O que o painel mostra é sempre o estado editado, não o que veio cru do HubSpot — por isso a
  // lista do popup lê de estado.linhas, igual aos números dos cards.
  function comoLinha(d: Deal): LinhaDetalhe {
    const s = estado.linhas[dealId(d)];
    return {
      nome: s?.name || d.name,
      meio: s?.turma || d.turma,
      direita: fmtMoney(s?.amount) || "—",
      url: d.hubspot_url,
    };
  }

  const ordenarPorNome = (a: LinhaDetalhe, b: LinhaDetalhe) => a.nome.localeCompare(b.nome, "pt-BR");

  function abrirTodos() {
    setAberto({
      titulo: "Alunos confirmados",
      subtitulo: `${totalAlunos} negócios ganhos no Funil de Vendas B2C · ${fmtMoney(totalReceita)}`,
      linhas: estado.deals.map(comoLinha).sort(ordenarPorNome),
    });
  }

  function abrirEspera() {
    setAberto({
      titulo: "Lista de espera",
      subtitulo: `${naEspera} interessados sem turma confirmada · cadastro manual, não vem do HubSpot`,
      linhas: Object.values(estado.espera)
        .map((e) => ({ nome: e.name, meio: e.turmaInteresse || "—", direita: e.chamado ? "contatado" : "—" }))
        .sort(ordenarPorNome),
    });
  }

  function abrirTurma(turma: string, receita: boolean) {
    const linhas = alunosDaTurma(estado, turma).map(comoLinha);
    setAberto({
      titulo: turma,
      subtitulo: receita
        ? `${linhas.length} aluno(s) · ${fmtMoney(receitaDaTurma(estado, turma))}`
        : `${linhas.length} aluno(s) nesta turma`,
      linhas: linhas.sort(ordenarPorNome),
    });
  }

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
          HubSpot · {buscadoEm}
        </div>
      </div>

      <div className="kpis">
        <Kpi num={String(totalAlunos)} label="Alunos confirmados (todas as turmas)" onClick={abrirTodos} />
        <Kpi num={fmtMoney(totalReceita) || "R$ 0,00"} label="Receita total confirmada" />
        <Kpi num={fmtMoney(ticketMedio) || "R$ 0,00"} label="Ticket médio" />
        <Kpi num={String(naEspera)} label="Na lista de espera" onClick={abrirEspera} />
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
                onClick={() => abrirTurma(t.turma, false)}
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
                onClick={() => abrirTurma(t.turma, true)}
              />
            ))
          ) : (
            <div className="eval-empty">Sem dados ainda.</div>
          )}
        </div>
      </div>

      {aberto && (
        <Detalhe
          titulo={aberto.titulo}
          subtitulo={aberto.subtitulo}
          linhas={aberto.linhas}
          onFechar={() => setAberto(null)}
        />
      )}
    </div>
  );
}

function Kpi({
  num,
  label,
  alerta,
  onClick,
}: {
  num: string;
  label: string;
  alerta?: boolean;
  onClick?: () => void;
}) {
  // Sem onClick continua sendo um bloco comum; com onClick vira botão de verdade, para funcionar
  // no teclado e ser anunciado como clicável.
  const conteudo = (
    <>
      <div className="num" style={alerta ? { color: "var(--warn)" } : undefined}>
        {num}
      </div>
      <div className="label">{label}</div>
    </>
  );
  if (!onClick) return <div className="kpi">{conteudo}</div>;
  return (
    <button type="button" className="kpi clicavel" onClick={onClick} title="Ver quem está nesta conta">
      {conteudo}
    </button>
  );
}

function Barra({
  label,
  cor,
  pct,
  valor,
  onClick,
}: {
  label: string;
  cor: string;
  pct: number;
  valor: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="hbar-row clicavel" onClick={onClick} title={`Ver os alunos de ${label}`}>
      <span className="hbar-label">{label}</span>
      <span className="hbar-track">
        <span className={`hbar-fill ${cor}`} style={{ width: `${pct.toFixed(1)}%` }} />
      </span>
      <span className="hbar-value">{valor}</span>
    </button>
  );
}
