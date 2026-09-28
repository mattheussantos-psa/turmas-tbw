import type { Deal, Estado, Status } from "./tipos";
import { DEALS, EVENTOS_EXTRAS } from "./dados";
import { monthKey } from "./fmt";
import { dealId } from "./estado";

export function statusEfetivo(e: Estado, d: Deal): Status {
  return e.linhas[dealId(d)]?.statusOverride || d.status;
}

// Lista de turmas na ordem do calendário. Sai do estado, não do snapshot, porque o nome da
// turma é editável na aba Turmas — renomear ali tem que refletir em todos os filtros.
export function todasTurmas(e: Estado): string[] {
  const set = new Set(DEALS.map((d) => e.linhas[dealId(d)]?.turma).filter(Boolean) as string[]);
  return Array.from(set).sort((a, b) => monthKey(a) - monthKey(b) || a.localeCompare(b, "pt-BR"));
}

// Ordem fixa das linhas: calculada uma vez a partir do snapshot para que editar um campo
// nunca faça a linha pular de lugar no meio da digitação.
export const ORDEM_LINHAS = DEALS.slice().sort(
  (a, b) =>
    monthKey(a.turma) - monthKey(b.turma) ||
    a.turma.localeCompare(b.turma, "pt-BR") ||
    a.name.localeCompare(b.name, "pt-BR")
);

export function valorDaLinha(e: Estado, d: Deal): number {
  return Number(e.linhas[dealId(d)]?.amount) || 0;
}

export function receitaDaTurma(e: Estado, turma: string): number {
  return DEALS.reduce((s, d) => (e.linhas[dealId(d)]?.turma === turma ? s + valorDaLinha(e, d) : s), 0);
}

export function alunosDaTurma(e: Estado, turma: string): Deal[] {
  return DEALS.filter((d) => e.linhas[dealId(d)]?.turma === turma);
}

export function eventosDaPasta(e: Estado, pasta: string): string[] {
  if (pasta === "The Best Weekend") return todasTurmas(e).filter((t) => t.includes("TBW"));
  if (pasta === "The Best Day") return todasTurmas(e).filter((t) => t.includes("TBD"));
  return EVENTOS_EXTRAS[pasta] || [];
}
