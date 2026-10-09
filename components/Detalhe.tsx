"use client";

import { useEffect, useRef } from "react";

export type LinhaDetalhe = {
  nome: string;
  meio: string;
  direita: string;
  url?: string;
};

// <dialog> nativo: backdrop, ESC para fechar e foco preso vêm de graça, sem biblioteca.
export default function Detalhe({
  titulo,
  subtitulo,
  linhas,
  onFechar,
}: {
  titulo: string;
  subtitulo: string;
  linhas: LinhaDetalhe[];
  onFechar: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="detalhe"
      onClose={onFechar}
      // Clique no backdrop fecha: o alvo só é o próprio <dialog> quando o clique caiu fora do conteúdo.
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
    >
      <div className="detalhe-head">
        <div>
          <h3>{titulo}</h3>
          <div className="detalhe-sub">{subtitulo}</div>
        </div>
        <button type="button" onClick={() => ref.current?.close()} aria-label="Fechar">
          ×
        </button>
      </div>

      <div className="detalhe-corpo">
        {linhas.length ? (
          <table className="detalhe-tabela">
            <thead>
              <tr>
                <th>#</th>
                <th>Nome</th>
                <th>Turma</th>
                <th>Valor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr key={(l.url ?? "") + l.nome + i}>
                  <td className="detalhe-num">{i + 1}</td>
                  <td className="detalhe-nome">{l.nome}</td>
                  <td>{l.meio}</td>
                  <td className="detalhe-valor">{l.direita}</td>
                  <td>
                    {l.url ? (
                      <a href={l.url} target="_blank" rel="noopener noreferrer">
                        abrir no HubSpot
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="eval-empty">Nada nessa métrica.</div>
        )}
      </div>
    </dialog>
  );
}
