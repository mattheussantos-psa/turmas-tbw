"use client";

import { useState } from "react";
import type { Aba } from "@/lib/tipos";
import { ABAS, PAGE_HEADERS, SNAPSHOT_EM } from "@/lib/dados";
import { usePainel } from "@/lib/estado";
import VisaoGeral from "@/components/VisaoGeral";
import Turmas from "@/components/Turmas";
import Espera from "@/components/Espera";
import Avaliacoes from "@/components/Avaliacoes";
import Kpis from "@/components/Kpis";
import Dre from "@/components/Dre";

export default function Page() {
  const [aba, setAba] = useState<Aba>("home");
  const { estado, atualizar } = usePainel();
  const [titulo, subtitulo] = PAGE_HEADERS[aba];

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
          Snapshot HubSpot
          <br />
          {SNAPSHOT_EM}
          <br />
          <br />
          TBW + TBD
          <br />
          Jan–Dez/2026
        </div>
      </div>

      <div className="main">
        <header>
          <h1>{titulo}</h1>
          <p>{subtitulo}</p>
        </header>

        {/* O estado mora no localStorage, então só renderiza depois da hidratação. */}
        {!estado ? (
          <div className="eval-empty">Carregando...</div>
        ) : aba === "home" ? (
          <VisaoGeral estado={estado} />
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
          Fonte: HubSpot · Pipeline &quot;Funil de Vendas B2C&quot; · Deal Stage = Ganho · TBW + TBD, Jan–Dez/2026
          <br />
          Snapshot manual de {SNAPSHOT_EM} — a integração ao vivo com as propriedades do HubSpot é o próximo passo.
        </footer>
      </div>
    </div>
  );
}
