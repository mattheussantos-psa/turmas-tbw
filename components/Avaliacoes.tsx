"use client";

import { useMemo, useState } from "react";
import type { DiaAvaliacao, Estado } from "@/lib/tipos";
import { AVALIACOES_SEED, QUALI_SEED } from "@/lib/dados";
import { slugify } from "@/lib/fmt";
import { todasTurmas } from "@/lib/derivado";
import { estatisticas, formatar, montarRelatorio, normQ } from "@/lib/relatorio";

type Props = {
  estado: Estado;
  atualizar: (fn: (e: Estado) => Estado) => void;
};

const XLSX_CDN = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";

// Carrega o parser de planilha só quando alguém realmente sobe um arquivo.
function carregarXLSX(): Promise<any> {
  const w = window as any;
  if (w.XLSX) return Promise.resolve(w.XLSX);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = XLSX_CDN;
    s.onload = () => resolve(w.XLSX);
    s.onerror = () => reject(new Error("não consegui carregar o leitor de planilha"));
    document.head.appendChild(s);
  });
}

export default function Avaliacoes({ estado, atualizar }: Props) {
  const turmas = todasTurmas(estado);
  const [escolhida, setTurma] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Derivado, não em efeito: se a turma escolhida sumiu (foi renomeada na aba Turmas), cai na
  // primeira da lista já no primeiro render, sem piscar "nenhuma turma".
  const turma = escolhida && turmas.includes(escolhida) ? escolhida : turmas[0] ?? null;
  const slug = turma ? slugify(turma) : "";
  // Uploads do usuário substituem a semente daquela turma (mesma regra do arquivo original).
  const dias: DiaAvaliacao[] = useMemo(
    () => (turma ? estado.avaliacoes[slug] ?? AVALIACOES_SEED[slug] ?? [] : []),
    [turma, slug, estado.avaliacoes]
  );

  async function subirPlanilha(arquivo: File) {
    setErro(null);
    if (!turma) return;
    const XLSX = await carregarXLSX();
    const buf = await arquivo.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: "" });
    const novo: DiaAvaliacao = {
      fileName: arquivo.name,
      uploadedAt: new Date().toLocaleDateString("pt-BR"),
      sheetName,
      rows,
      anexo: null,
    };
    atualizar((e) => ({ ...e, avaliacoes: { ...e.avaliacoes, [slug]: [...dias, novo] } }));
  }

  function remover(idx: number) {
    atualizar((e) => ({ ...e, avaliacoes: { ...e.avaliacoes, [slug]: dias.filter((_, i) => i !== idx) } }));
  }

  return (
    <div>
      <div className="filters">
        <select value={turma ?? ""} onChange={(ev) => setTurma(ev.target.value)}>
          {turmas.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="upload-box">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(ev) => {
            const f = ev.target.files?.[0];
            ev.target.value = "";
            if (f) subirPlanilha(f).catch((e) => setErro(e.message));
          }}
        />
        <span className="upload-label">
          Sobe a planilha de avaliação (Excel) respondida pelos alunos dessa turma. Ela fica salva aqui, você pode subir
          quantas quiser por turma.
        </span>
      </div>
      {erro && (
        <div className="callout" style={{ borderLeftColor: "var(--warn)" }}>
          <strong style={{ color: "var(--warn)" }}>NÃO DEU CERTO</strong>
          <br />
          {erro}
        </div>
      )}

      <ListaDeDias dias={dias} turma={turma} onRemover={remover} />

      <div className="report-actions">
        <button className="btn-download" onClick={() => window.print()}>
          Baixar relatório da turma (PDF)
        </button>
      </div>
      <div id="reportSection">
        <Relatorio turma={turma} dias={dias} />
      </div>

      <div className="callout">
        <strong>COMO FUNCIONA</strong>
        <br />
        O arquivo é lido no seu navegador e a primeira aba da planilha vira as médias aqui embaixo. O relatório junta os
        dias de avaliação da turma (pergunta por pergunta, média por dia e média geral) — clique em &quot;Baixar
        relatório&quot; e use &quot;Salvar como PDF&quot; na janela de impressão do navegador.
      </div>
    </div>
  );
}

function ListaDeDias({
  dias,
  turma,
  onRemover,
}: {
  dias: DiaAvaliacao[];
  turma: string | null;
  onRemover: (idx: number) => void;
}) {
  const [fechados, setFechados] = useState<Record<number, boolean>>({});
  if (!turma) return <div className="eval-empty">Nenhuma turma cadastrada ainda.</div>;
  if (!dias.length) return <div className="eval-empty">Nenhuma avaliação enviada ainda pra {turma}.</div>;

  return (
    <div className="eval-list">
      {dias.map((ev, idx) => {
        const header = ev.rows[0] || [];
        const dados = ev.rows.slice(1);
        return (
          <div className="eval-card" key={ev.fileName + idx}>
            <h3 onClick={() => setFechados((f) => ({ ...f, [idx]: !f[idx] }))}>
              <span>
                {ev.fileName}{" "}
                <span className="meta">
                  · enviado em {ev.uploadedAt} · aba &quot;{ev.sheetName}&quot; · {Math.max(ev.rows.length - 1, 0)}{" "}
                  respostas
                </span>
              </span>
              <button
                className="remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemover(idx);
                }}
              >
                Remover
              </button>
            </h3>
            {!fechados[idx] && (
              <div className="sheet-wrap">
                <table className="sheet-table avg-table">
                  <thead>
                    <tr>
                      <th>Pergunta</th>
                      <th>Média do dia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {header.map((q, qi) => {
                      const vals = dados.map((r) => r[qi]).filter((v) => v !== "" && v !== null && v !== undefined);
                      const st = estatisticas(vals);
                      return (
                        <tr key={qi}>
                          <td>{q || `(pergunta ${qi + 1})`}</td>
                          <td className="avg-cell">
                            {formatar(st)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {ev.anexo && (
              <div className="eval-attach">
                <span className="ea-name">📎 {ev.anexo.fileName}</span>
                <span className="ea-meta">
                  PDF original com as respostas completas (inclusive texto) · {ev.anexo.sizeKB} KB
                </span>
                <a href={ev.anexo.url} download={ev.anexo.fileName}>
                  Baixar PDF
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Relatorio({ turma, dias }: { turma: string | null; dias: DiaAvaliacao[] }) {
  if (!turma) return null;
  if (!dias.length) {
    return (
      <div className="report-empty">
        Sem avaliações enviadas ainda pra {turma} — suba os arquivos dos dias acima pra gerar o relatório.
      </div>
    );
  }

  const { perguntas, porDia, geral, totalRespostas } = montarRelatorio(dias);

  // A "nota final" é a pergunta de recomendação, calculada ao vivo. Turma sem essa pergunta em
  // nenhum dia simplesmente não mostra o destaque.
  const npsQi = perguntas.findIndex((q) => normQ(q) === normQ("Recomendaria (NPS 0-10)"));
  const nps = npsQi !== -1 ? geral[npsQi] : null;

  const quali = QUALI_SEED[slugify(turma)] || null;

  return (
    <>
      <div className="report-header">
        <div className="brand">
          PSA<span className="dot">.</span>
        </div>
        <h2>Relatório de Avaliação — {turma}</h2>
        <div className="sub">
          Gerado em {new Date().toLocaleDateString("pt-BR")} · {dias.length} dia(s) avaliado(s) · {totalRespostas}{" "}
          respostas no total
        </div>
      </div>

      {nps && nps.n > 0 && nps.ehNumerica && (
        <div className="nps-callout">
          <div className="nps-num">
            {nps.media!.toFixed(1)}
            <span>/10</span>
          </div>
          <div className="nps-copy">
            <div className="nps-label">Nota Final (NPS) — Recomendaria a turma</div>
            <div className="nps-sub">
              Média geral de &quot;Recomendaria (NPS 0-10)&quot; · {nps.n} resposta(s) nos dias em que a pergunta foi
              feita
            </div>
          </div>
        </div>
      )}

      <table className="report-table">
        <thead>
          <tr>
            <th>Pergunta</th>
            {dias.map((ev, i) => (
              <th key={i}>
                Dia {i + 1}
                <br />
                <span style={{ fontWeight: 400, fontSize: 9.5 }}>{ev.fileName}</span>
              </th>
            ))}
            <th>Média geral</th>
          </tr>
        </thead>
        <tbody>
          {perguntas.map((q, qi) => {
            const ov = geral[qi];
            return (
              <tr key={qi}>
                <td className="question">{q || `(pergunta ${qi + 1})`}</td>
                {porDia.map((dia, di) => {
                  const st = dia[qi];
                  return (
                    <td className="avg-cell" key={di}>
                      {formatar(st)}
                    </td>
                  );
                })}
                <td className="avg-cell overall">
                  {formatar(ov)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'Satoshi', sans-serif" }}>
        Perguntas com resposta em texto mostram o número de respostas em vez de média. O alinhamento entre os dias é
        feito pelo texto da pergunta — dias com modelo de planilha diferente aparecem corretamente, com &quot;—&quot; só
        quando aquele dia realmente não teve aquela pergunta.
      </div>

      {quali && (
        <div className="quali-section">
          <h3>Resumo Qualitativo</h3>
          <div className="quali-body">
            <p className="quali-resumo">{quali.resumo}</p>
            <div className="quali-cols">
              <div className="positivos">
                <h4>Destaques positivos</h4>
                <ul>
                  {quali.destaquesPositivos.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
              <div className="atencao">
                <h4>Pontos de atenção</h4>
                <ul>
                  {quali.pontosDeAtencao.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="quali-note">
              Síntese elaborada a partir das respostas em texto livre dos PDFs de avaliação originais anexados a cada
              dia, agregando os dias desta turma.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
