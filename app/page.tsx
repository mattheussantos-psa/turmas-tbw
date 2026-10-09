"use client";

import { useState } from "react";
import type { Aba } from "@/lib/tipos";
import { ABAS, PAGE_HEADERS } from "@/lib/dados";
import { usePainel } from "@/lib/estado";
import VisaoGeral from "@/components/VisaoGeral";
import Turmas from "@/components/Turmas";
import Espera from "@/components/Espera";
import Avaliacoes from "@/components/Avaliacoes";
import Kpis from "@/components/Kpis";
import Dre from "@/components/Dre";

function hora(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function Page() {
  const [aba, setAba] = useState<Aba>("home");
  const { estado, carga, atualizar, recarregar } = usePainel();
  const [titulo, subtitulo] = PAGE_HEADERS[aba];
  const buscadoEm = carga.fase === "pronto" ? hora(carga.buscadoEm) : "—";

  return (
    <div className="shell">
      <div className="sidebar">
        <div className="wordmark">
          PSA<span className="dot">.</span>
        </div>
        <nav>
          {ABAS.map(([chave, label]) => (
            <button
              key={chave}
              className={"top-tab" + (aba === chave ? " active" : "")}
              onClick={() => setAba(chave as Aba)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="snapshot">
          Dados do HubSpot
          <br />
          {buscadoEm}
          <br />
          <br />
          Funil de Vendas B2C
          <br />
          Negócios ganhos
        </div>
      </div>

      <div className="main">
        <header>
          <h1>{titulo}</h1>
          <p>{subtitulo}</p>
        </header>

        <div className="filters" style={{ justifyContent: "flex-end" }}>
          <span className="save-state">
            {carga.fase === "carregando"
              ? "buscando no HubSpot..."
              : carga.fase === "pronto"
                ? `atualizado em ${buscadoEm}`
                : "não foi possível buscar"}
          </span>
          <button className="folder-tab" onClick={recarregar} disabled={carga.fase === "carregando"}>
            Atualizar do HubSpot
          </button>
        </div>

        {/* A falha aparece inteira, com a mensagem do HubSpot. Esconder viraria retrabalho pra
            descobrir que era só um scope faltando no token. */}
        {carga.fase === "erro" && (
          <div className="callout" style={{ borderLeftColor: "var(--warn)" }}>
            <strong style={{ color: "var(--warn)" }}>NÃO CONSEGUI BUSCAR OS ALUNOS NO HUBSPOT</strong>
            <br />
            <code style={{ fontSize: 11.5 }}>{carga.mensagem}</code>
          </div>
        )}

        {!estado ? (
          carga.fase === "erro" ? null : (
            <div className="eval-empty">Buscando os negócios ganhos no HubSpot...</div>
          )
        ) : aba === "home" ? (
          <VisaoGeral estado={estado} buscadoEm={buscadoEm} />
        ) : aba === "roster" ? (
          <Turmas estado={estado} atualizar={atualizar} />
        ) : aba === "waitlist" ? (
          <Espera estado={estado} atualizar={atualizar} />
        ) : aba === "aval" ? (
          <Avaliacoes estado={estado} atualizar={atualizar} />
        ) : aba === "kpis" ? (
          <Kpis estado={estado} atualizar={atualizar} />
        ) : (
          <Dre estado={estado} atualizar={atualizar} />
        )}

        <footer>
          Fonte: HubSpot · Pipeline &quot;Funil de Vendas B2C&quot; · Deal Stage = Ganho
          <br />
          Turma de <code>turma_the_best_weekend_</code>, produto de <code>produto_de_interesse</code>, valor de{" "}
          <code>amount</code>, nome do contato associado ao negócio.
        </footer>
      </div>
    </div>
  );
}
